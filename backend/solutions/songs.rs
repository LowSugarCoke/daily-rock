// Verified Solution for Songs and SongStore in-memory implementation
// Full working version of backend/src/lib.rs for reference.

use axum::{extract::Query, response::IntoResponse, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use tower_service::Service;
use worker::*;

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
}

async fn health_check() -> impl IntoResponse {
    Json(HealthResponse { status: "ok" })
}

#[derive(Deserialize)]
pub struct GreetQuery {
    pub name: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct GreetResponse {
    pub message: String,
}

// Correct working handler implementation:
async fn greet(Query(query): Query<GreetQuery>) -> impl IntoResponse {
    let name = query.name.unwrap_or_else(|| "Guest".to_string());
    Json(GreetResponse {
        message: format!("Hello, {}!", name),
    })
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct Song {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub era: String,
    pub genre_tags: Vec<String>,
    pub youtube_id: String,
}

pub trait SongStore {
    fn get_current_song(&self) -> Option<Song>;
}

pub struct InMemorySongStore {
    pub songs: Vec<Song>,
}

impl InMemorySongStore {
    pub fn new() -> Self {
        Self {
            songs: vec![
                Song {
                    id: "1".to_string(),
                    title: "Johnny B. Goode".to_string(),
                    artist: "Chuck Berry".to_string(),
                    era: "1950s".to_string(),
                    genre_tags: vec!["Rock 'n' Roll".to_string()],
                    youtube_id: "T38v3-SSGcM".to_string(),
                },
                Song {
                    id: "2".to_string(),
                    title: "Whole Lotta Love".to_string(),
                    artist: "Led Zeppelin".to_string(),
                    era: "1960s".to_string(),
                    genre_tags: vec!["Hard Rock".to_string(), "Classic Rock".to_string()],
                    youtube_id: "HQmmM_vIi4I".to_string(),
                },
                Song {
                    id: "3".to_string(),
                    title: "Bohemian Rhapsody".to_string(),
                    artist: "Queen".to_string(),
                    era: "1970s".to_string(),
                    genre_tags: vec!["Progressive Rock".to_string(), "Glam Rock".to_string()],
                    youtube_id: "fJ9rUzIMcZQ".to_string(),
                },
            ],
        }
    }
}

impl Default for InMemorySongStore {
    fn default() -> Self {
        Self::new()
    }
}

impl SongStore for InMemorySongStore {
    fn get_current_song(&self) -> Option<Song> {
        self.songs.first().cloned()
    }
}

pub fn app() -> Router {
    Router::new()
        .route("/api/health", get(health_check))
        .route("/api/greet", get(greet))
}

#[event(fetch)]
async fn fetch(
    req: HttpRequest,
    _env: Env,
    _ctx: Context,
) -> Result<http::Response<axum::body::Body>> {
    console_error_panic_hook::set_once();

    let mut router = app();
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
    async fn test_in_memory_song_store_returns_first_song() {
        let store = InMemorySongStore::new();
        let current = store.get_current_song();
        assert!(current.is_some());
        let song = current.unwrap();
        assert_eq!(song.id, "1");
        assert_eq!(song.title, "Johnny B. Goode");
        assert_eq!(song.artist, "Chuck Berry");
        assert_eq!(song.era, "1950s");
        assert_eq!(song.genre_tags, vec!["Rock 'n' Roll".to_string()]);
        assert_eq!(song.youtube_id, "T38v3-SSGcM");
    }
}
