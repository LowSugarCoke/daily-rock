use axum::{extract::Query, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
}

pub async fn health_check() -> impl IntoResponse {
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
pub async fn greet(Query(query): Query<GreetQuery>) -> impl IntoResponse {
    let name = query.name.unwrap_or_else(|| "Guest".to_string());
    Json(GreetResponse {
        message: format!("Hello, {}!", name),
    })
}
