use axum::{response::IntoResponse, routing::get, Json, Router};
use serde::Serialize;
use tower_service::Service;
use worker::*;

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
}

async fn health_check() -> impl IntoResponse {
    Json(HealthResponse { status: "ok" })
}

pub fn app() -> Router {
    Router::new().route("/api/health", get(health_check))
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
}
