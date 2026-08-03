use axum::{
    routing::get,
    Json,
    Router,
    response::IntoResponse,
};
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

#[event(fetch)]
async fn fetch(
    req: HttpRequest,
    _env: Env,
    _ctx: Context,
) -> Result<http::Response<axum::body::Body>> {
    console_error_panic_hook::set_once();

    let router = Router::new()
        .route("/api/health", get(health_check));

    // For Axum Routers, we need to use tower::Service's `call` method.
    // Because Service::call is a mutable method, we either need to clone or declare it mutably.
    // Cloning a Router is extremely cheap and idiomatic in Axum/Tower.
    let mut router = router;
    let response = router
        .call(req)
        .await
        .map_err(|e| worker::Error::from(e.to_string()))?;

    Ok(response)
}
