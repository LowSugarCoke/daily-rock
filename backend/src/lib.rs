use axum::{routing::get, Router};
use std::sync::Arc;
use tower_service::Service;
use worker::*;

pub mod handlers;
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
        .with_state(state)
}

pub fn app() -> Router {
    let store = Arc::new(store::InMemorySongStore::new());
    app_with_store(store)
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
    }

    #[tokio::test]
    async fn test_get_current_daily_selection_not_found() {
        let empty_store = Arc::new(store::InMemorySongStore { songs: vec![] });
        let app = app_with_store(empty_store);
        let server = TestServer::new(app);

        let response = server.get("/api/daily_selection").await;
        response.assert_status(axum::http::StatusCode::NOT_FOUND);

        let body: String = response.json();
        assert_eq!(body, "No song found");
    }
}
