use axum::{
    routing::{get, post, put},
    Router,
};
use std::sync::Arc;
use tower_service::Service;
use worker::*;

pub mod access;
pub mod errors;
pub mod genres;
pub mod handlers;
pub mod progress;
pub mod store;

#[derive(Clone)]
#[allow(dead_code)]
pub struct AppState {
    pub song_store: Arc<dyn store::SongStore + Send + Sync>,
}

pub fn app_with_store(store: Arc<dyn store::SongStore + Send + Sync>) -> Router {
    let state = AppState { song_store: store };

    Router::new()
        .route("/api/health", get(handlers::health_check))
        .route("/api/greet", get(handlers::greet))
        .route(
            "/api/daily_selection",
            get(handlers::get_current_daily_selection),
        )
        .route("/api/ratings", post(handlers::submit_rating))
        .route("/api/history", get(handlers::get_listening_history))
        .route("/api/progress", get(handlers::get_progress))
        .route("/api/ratings/{id}", put(handlers::update_rating))
        .with_state(state)
}

pub fn app() -> Router {
    let store = Arc::new(store::InMemorySongStore::new());
    app_with_store(store)
}

#[event(fetch)]
async fn fetch(
    req: HttpRequest,
    env: Env,
    _ctx: Context,
) -> Result<http::Response<axum::body::Body>> {
    console_error_panic_hook::set_once();

    let db = env.d1("DB")?;
    let store = Arc::new(store::D1SongStore::new(db));

    let mut router = app_with_store(store);
    let response = router
        .call(req)
        .await
        .map_err(|e| worker::Error::from(e.to_string()))?;

    Ok(response)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum_test::TestServer;
    use handlers::GreetResponse;

    #[tokio::test]
    async fn test_health_check() {
        let app = app();
        let server = TestServer::new(app);

        let response = server.get("/api/health").await;
        response.assert_status_ok();

        let body: serde_json::Value = response.json();
        assert_eq!(body["status"], "ok");
    }

    #[tokio::test]
    async fn test_greet_with_name() {
        let app = app();
        let server = TestServer::new(app);

        let response = server
            .get("/api/greet")
            .add_query_param("name", "Alice")
            .await;
        response.assert_status_ok();

        let body: GreetResponse = response.json();
        assert_eq!(body.message, "Hello, Alice!");
    }

    #[tokio::test]
    async fn test_greet_without_name() {
        let app = app();
        let server = TestServer::new(app);

        let response = server.get("/api/greet").await;
        response.assert_status_ok();

        let body: GreetResponse = response.json();
        assert_eq!(body.message, "Hello, Guest!");
    }

    #[tokio::test]
    async fn test_get_current_daily_selection() {
        let app = app();
        let server = TestServer::new(app);

        let response = server.get("/api/daily_selection").await;
        response.assert_status_ok();

        let body: store::Song = response.json();
        assert_eq!(body.id, "1");
        assert_eq!(body.title, "Johnny B. Goode");
        assert_eq!(body.artist, "Chuck Berry");
        assert_eq!(body.era, "1950s");
        assert_eq!(body.genre_tags, vec!["Rock 'n' Roll".to_string()]);
        assert_eq!(body.youtube_id, "T38v3-SSGcM");
        assert_eq!(body.album, "Berry Is On Top");
        assert_eq!(body.year, 1958);
        assert!(body.cover_url.starts_with("https://"));
        assert_eq!(body.cover_color, "#eda273");
    }

    #[tokio::test]
    async fn test_get_current_daily_selection_not_found() {
        let empty_store = Arc::new(store::InMemorySongStore {
            songs: vec![],
            ratings: std::sync::Mutex::new(Vec::new()),
        });
        let app = app_with_store(empty_store);
        let server = TestServer::new(app);

        let response = server.get("/api/daily_selection").await;
        response.assert_status(axum::http::StatusCode::NOT_FOUND);

        let body: String = response.json();
        assert_eq!(body, "No song found");
    }

    #[tokio::test]
    async fn test_submit_rating_success() {
        let app = app();
        let server = TestServer::new(app);

        // Initially get current song
        let response = server.get("/api/daily_selection").await;
        response.assert_status_ok();
        let current_song: store::Song = response.json();
        assert_eq!(current_song.id, "1");

        // Submit a rating
        let rating_payload = handlers::CreateRatingRequest {
            daily_selection_id: "1".to_string(),
            rating: 5,
            note: Some("Brilliant track!".to_string()),
        };
        let response = server.post("/api/ratings").json(&rating_payload).await;
        response.assert_status(axum::http::StatusCode::CREATED);

        // Get current song again - should be "2" (gated progress progression)
        let response = server.get("/api/daily_selection").await;
        response.assert_status_ok();
        let current_song_after: store::Song = response.json();
        assert_eq!(current_song_after.id, "2");
        assert_eq!(current_song_after.title, "Whole Lotta Love");
    }

    #[tokio::test]
    async fn test_submit_rating_invalid_rating() {
        let app = app();
        let server = TestServer::new(app);

        // Submit an invalid rating (0)
        let rating_payload = handlers::CreateRatingRequest {
            daily_selection_id: "1".to_string(),
            rating: 0,
            note: None,
        };
        let response = server.post("/api/ratings").json(&rating_payload).await;
        response.assert_status(axum::http::StatusCode::BAD_REQUEST);

        // Submit an invalid rating (6)
        let rating_payload2 = handlers::CreateRatingRequest {
            daily_selection_id: "1".to_string(),
            rating: 6,
            note: None,
        };
        let response = server.post("/api/ratings").json(&rating_payload2).await;
        response.assert_status(axum::http::StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_submit_rating_invalid_note_length() {
        let app = app();
        let server = TestServer::new(app);

        // Submit a rating with a note of 1024 Chinese characters (should be ACCEPTED, chars count <= 1024)
        let rating_payload_ok = handlers::CreateRatingRequest {
            daily_selection_id: "1".to_string(),
            rating: 5,
            note: Some("樂".repeat(1024)),
        };
        let response_ok = server.post("/api/ratings").json(&rating_payload_ok).await;
        response_ok.assert_status(axum::http::StatusCode::CREATED);

        // Submit a rating with a note of 1025 Chinese characters (should be BLOCKED, chars count > 1024)
        let rating_payload_fail = handlers::CreateRatingRequest {
            daily_selection_id: "2".to_string(),
            rating: 5,
            note: Some("樂".repeat(1025)),
        };
        let response_fail = server.post("/api/ratings").json(&rating_payload_fail).await;
        response_fail.assert_status(axum::http::StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_submit_rating_invalid_id_length() {
        let app = app();
        let server = TestServer::new(app);

        // Submit a rating with a daily_selection_id that exceeds 64 characters
        let rating_payload = handlers::CreateRatingRequest {
            daily_selection_id: "a".repeat(65),
            rating: 5,
            note: None,
        };
        let response = server.post("/api/ratings").json(&rating_payload).await;
        response.assert_status(axum::http::StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_get_listening_history_success_and_filtering() {
        let app = app();
        let server = TestServer::new(app);

        // Submit ratings for song 1 (Johnny B. Goode) and song 2 (Whole Lotta Love)
        let rating1 = handlers::CreateRatingRequest {
            daily_selection_id: "1".to_string(),
            rating: 5,
            note: Some("Johnny B. Goode was amazing!".to_string()),
        };
        server
            .post("/api/ratings")
            .json(&rating1)
            .await
            .assert_status(axum::http::StatusCode::CREATED);

        let rating2 = handlers::CreateRatingRequest {
            daily_selection_id: "2".to_string(),
            rating: 4,
            note: Some("Whole Lotta Love was great!".to_string()),
        };
        server
            .post("/api/ratings")
            .json(&rating2)
            .await
            .assert_status(axum::http::StatusCode::CREATED);

        // Get full listening history
        let response = server.get("/api/history").await;
        response.assert_status_ok();
        let history: Vec<store::HistoryItem> = response.json();
        assert_eq!(history.len(), 2);
        // Sorted newest first (Whole Lotta Love is song 2, Johnny B. Goode is song 1)
        assert_eq!(history[0].song_id, "2");
        assert_eq!(history[0].rating, 4);
        assert_eq!(
            history[0].note.as_deref(),
            Some("Whole Lotta Love was great!")
        );
        assert_eq!(history[1].song_id, "1");
        assert_eq!(history[1].rating, 5);
        assert_eq!(
            history[1].note.as_deref(),
            Some("Johnny B. Goode was amazing!")
        );

        // Filter by era
        let response_era = server
            .get("/api/history")
            .add_query_param("era", "1950s")
            .await;
        response_era.assert_status_ok();
        let history_era: Vec<store::HistoryItem> = response_era.json();
        assert_eq!(history_era.len(), 1);
        assert_eq!(history_era[0].song_id, "1");

        // Filter by artist
        let response_artist = server
            .get("/api/history")
            .add_query_param("artist", "Led Zeppelin")
            .await;
        response_artist.assert_status_ok();
        let history_artist: Vec<store::HistoryItem> = response_artist.json();
        assert_eq!(history_artist.len(), 1);
        assert_eq!(history_artist[0].song_id, "2");

        // Filter by genre
        let response_genre = server
            .get("/api/history")
            .add_query_param("genre", "Hard Rock")
            .await;
        response_genre.assert_status_ok();
        let history_genre: Vec<store::HistoryItem> = response_genre.json();
        assert_eq!(history_genre.len(), 1);
        assert_eq!(history_genre[0].song_id, "2");
    }

    #[tokio::test]
    async fn test_get_progress_counts_rated_songs() {
        let server = TestServer::new(app());

        let response = server.get("/api/progress").await;
        response.assert_status_ok();
        let body: Vec<progress::EraProgress> = response.json();
        assert_eq!(body.len(), 3);
        assert!(body.iter().all(|p| p.listened == 0 && p.total == 1));

        server
            .post("/api/ratings")
            .json(&serde_json::json!({ "daily_selection_id": "3", "rating": 5 }))
            .await
            .assert_status(http::StatusCode::CREATED);

        let body: Vec<progress::EraProgress> = server.get("/api/progress").await.json();
        assert_eq!(body[2].era, "1970s");
        assert_eq!(body[2].listened, 1);
    }

    /// Rates song 1 (5 stars, with a note) and returns the new rating's id from the history.
    async fn rate_first_song(server: &TestServer) -> String {
        server
            .post("/api/ratings")
            .json(&serde_json::json!({
                "daily_selection_id": "1",
                "rating": 5,
                "note": "First listen"
            }))
            .await
            .assert_status(http::StatusCode::CREATED);
        let history: Vec<store::HistoryItem> = server.get("/api/history").await.json();
        history[0].rating_id.clone()
    }

    #[tokio::test]
    async fn test_update_rating_changes_score_and_note() {
        let server = TestServer::new(app());
        let rating_id = rate_first_song(&server).await;

        server
            .put(&format!("/api/ratings/{rating_id}"))
            .json(&serde_json::json!({ "rating": 3, "note": "Better on the second listen" }))
            .await
            .assert_status_ok();

        let history: Vec<store::HistoryItem> = server.get("/api/history").await.json();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].rating_id, rating_id);
        assert_eq!(history[0].rating, 3);
        assert_eq!(
            history[0].note.as_deref(),
            Some("Better on the second listen")
        );
    }

    #[tokio::test]
    async fn test_update_rating_keeps_fields_left_out() {
        let server = TestServer::new(app());
        let rating_id = rate_first_song(&server).await;
        let url = format!("/api/ratings/{rating_id}");

        server
            .put(&url)
            .json(&serde_json::json!({ "note": "Only the note changes" }))
            .await
            .assert_status_ok();
        let history: Vec<store::HistoryItem> = server.get("/api/history").await.json();
        assert_eq!(history[0].rating, 5);
        assert_eq!(history[0].note.as_deref(), Some("Only the note changes"));

        server
            .put(&url)
            .json(&serde_json::json!({ "rating": 2 }))
            .await
            .assert_status_ok();
        let history: Vec<store::HistoryItem> = server.get("/api/history").await.json();
        assert_eq!(history[0].rating, 2);
        assert_eq!(history[0].note.as_deref(), Some("Only the note changes"));
    }

    #[tokio::test]
    async fn test_update_rating_empty_note_removes_it() {
        let server = TestServer::new(app());
        let rating_id = rate_first_song(&server).await;

        server
            .put(&format!("/api/ratings/{rating_id}"))
            .json(&serde_json::json!({ "note": "" }))
            .await
            .assert_status_ok();

        let history: Vec<store::HistoryItem> = server.get("/api/history").await.json();
        assert_eq!(history[0].rating, 5);
        assert_eq!(history[0].note, None);
    }

    #[tokio::test]
    async fn test_update_rating_unknown_id_is_not_found() {
        let server = TestServer::new(app());
        rate_first_song(&server).await;

        server
            .put("/api/ratings/r_does_not_exist")
            .json(&serde_json::json!({ "rating": 3 }))
            .await
            .assert_status(http::StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_update_rating_rejects_invalid_input_without_saving() {
        let server = TestServer::new(app());
        let rating_id = rate_first_song(&server).await;
        let url = format!("/api/ratings/{rating_id}");

        let bad_bodies = [
            serde_json::json!({}),
            serde_json::json!({ "rating": 0 }),
            serde_json::json!({ "rating": 6, "note": "Rating is out of range" }),
            serde_json::json!({ "rating": 4, "note": "樂".repeat(1025) }),
        ];
        for body in &bad_bodies {
            server
                .put(&url)
                .json(body)
                .await
                .assert_status(http::StatusCode::BAD_REQUEST);
        }
        server
            .put(&format!("/api/ratings/{}", "a".repeat(65)))
            .json(&serde_json::json!({ "rating": 3 }))
            .await
            .assert_status(http::StatusCode::BAD_REQUEST);

        let history: Vec<store::HistoryItem> = server.get("/api/history").await.json();
        assert_eq!(history[0].rating, 5);
        assert_eq!(history[0].note.as_deref(), Some("First listen"));
    }

    #[tokio::test]
    async fn test_update_rating_does_not_change_daily_selection() {
        let server = TestServer::new(app());
        let rating_id = rate_first_song(&server).await;

        server
            .put(&format!("/api/ratings/{rating_id}"))
            .json(&serde_json::json!({ "rating": 1 }))
            .await
            .assert_status_ok();

        let current: store::Song = server.get("/api/daily_selection").await.json();
        assert_eq!(current.id, "2");
        let history: Vec<store::HistoryItem> = server.get("/api/history").await.json();
        assert_eq!(history.len(), 1);
    }
}
