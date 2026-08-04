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

#[allow(unused_variables)]
async fn greet(Query(query): Query<GreetQuery>) -> impl IntoResponse {
    // TODO: USER PRACTICE - Implement this handler to pass the tests!
    // 💡 Hints:
    // 1. `query.name` is an `Option<String>`. Use `.unwrap_or_else(|| ...)` to get the
    //    value, or fall back to a default when it's `None` (similar to C++'s
    //    `std::optional::value_or`, but the default is computed lazily via a closure).
    //    `|| "Guest".to_string()` is a Rust closure — like C++'s `[]() { return ...; }` —
    //    where `||` is the (empty) parameter list, and since the body is a single
    //    expression, no `{}` or `return` is needed.
    // 2. Format the message with `format!("Hello, {}!", name)`.

    // Stub implementation to allow compilation (this will fail the assertions):
    Json(GreetResponse {
        message: "STUB".to_string(),
    })
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
}
