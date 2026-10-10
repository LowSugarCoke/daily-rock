use axum_test::TestServer;
use backend::{app, app_with_store, store::*};
use http::StatusCode;
use std::{collections::HashSet, future::Future, pin::Pin, sync::Arc};

/// Every fallible store operation fails, as a database outage would.
struct UnavailableStore;

fn unavailable<T>() -> worker::Result<T> {
    Err(worker::Error::RustError(
        "D1 query failed: private-db".to_string(),
    ))
}

impl SongStore for UnavailableStore {
    fn get_daily_selection(&self) -> Pin<Box<dyn Future<Output = Option<Song>> + Send + '_>> {
        Box::pin(async { None })
    }
    fn save_rating(
        &self,
        _: Rating,
    ) -> Pin<Box<dyn Future<Output = worker::Result<()>> + Send + '_>> {
        Box::pin(async { unavailable() })
    }
    fn get_history(
        &self,
        _: HistoryQuery,
    ) -> Pin<Box<dyn Future<Output = worker::Result<Vec<HistoryItem>>> + Send + '_>> {
        Box::pin(async { unavailable() })
    }
    fn get_catalog(&self) -> Pin<Box<dyn Future<Output = worker::Result<Vec<Song>>> + Send + '_>> {
        Box::pin(async { unavailable() })
    }
    fn get_rated_ids(
        &self,
    ) -> Pin<Box<dyn Future<Output = worker::Result<HashSet<String>>> + Send + '_>> {
        Box::pin(async { unavailable() })
    }
    fn update_rating(
        &self,
        _: String,
        _: Option<u8>,
        _: Option<String>,
    ) -> Pin<Box<dyn Future<Output = worker::Result<Option<Rating>>> + Send + '_>> {
        Box::pin(async { unavailable() })
    }
}

fn assert_store_error(response: axum_test::TestResponse) {
    response.assert_status(StatusCode::INTERNAL_SERVER_ERROR);
    assert_eq!(response.header("content-type"), "application/json");
    let message: String = response.json();
    assert_eq!(message, "Something went wrong. Please try again.");
}

#[tokio::test]
async fn app_error_progress_store_failure() {
    let server = TestServer::new(app_with_store(Arc::new(UnavailableStore)));
    assert_store_error(server.get("/api/progress").await);
}

#[tokio::test]
async fn app_error_history_store_failure() {
    let server = TestServer::new(app_with_store(Arc::new(UnavailableStore)));
    assert_store_error(server.get("/api/history").await);
}

#[tokio::test]
async fn app_error_submit_store_failure() {
    let server = TestServer::new(app_with_store(Arc::new(UnavailableStore)));
    assert_store_error(
        server
            .post("/api/ratings")
            .json(&serde_json::json!({
                "daily_selection_id": "1", "rating": 5
            }))
            .await,
    );
}

#[tokio::test]
async fn app_error_update_store_failure() {
    let server = TestServer::new(app_with_store(Arc::new(UnavailableStore)));
    assert_store_error(
        server
            .put("/api/ratings/r1")
            .json(&serde_json::json!({"rating": 3}))
            .await,
    );
}

#[tokio::test]
async fn app_error_validation_keeps_public_message() {
    let server = TestServer::new(app());
    let response = server
        .post("/api/ratings")
        .json(&serde_json::json!({
            "daily_selection_id": "1", "rating": 6
        }))
        .await;
    response.assert_status(StatusCode::BAD_REQUEST);
    assert_eq!(response.json::<String>(), "Rating must be between 1 and 5");
}

#[tokio::test]
async fn app_error_missing_rating_keeps_public_message() {
    let server = TestServer::new(app());
    let response = server
        .put("/api/ratings/missing")
        .json(&serde_json::json!({"rating": 3}))
        .await;
    response.assert_status(StatusCode::NOT_FOUND);
    assert_eq!(response.json::<String>(), "Rating not found");
}
