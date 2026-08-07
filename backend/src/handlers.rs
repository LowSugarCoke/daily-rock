use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
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

pub async fn get_current_daily_selection(
    State(state): State<crate::AppState>,
) -> impl IntoResponse {
    match state.song_store.get_daily_selection().await {
        Some(song) => Json(song).into_response(),
        None => (StatusCode::NOT_FOUND, Json("No song found")).into_response(),
    }
}

#[derive(Deserialize, Serialize)]
pub struct CreateRatingRequest {
    pub daily_selection_id: String,
    pub rating: u8,
    pub note: Option<String>,
}

pub async fn submit_rating(
    State(state): State<crate::AppState>,
    Json(payload): Json<CreateRatingRequest>,
) -> impl IntoResponse {
    if payload.daily_selection_id.len() > 64 {
        return (
            StatusCode::BAD_REQUEST,
            Json("Daily selection ID is too long"),
        )
            .into_response();
    }

    if payload.rating < 1 || payload.rating > 5 {
        return (
            StatusCode::BAD_REQUEST,
            Json("Rating must be between 1 and 5"),
        )
            .into_response();
    }

    if let Some(ref note) = payload.note {
        if note.chars().count() > 1024 {
            return (
                StatusCode::BAD_REQUEST,
                Json("Note must be 1024 characters or less"),
            )
                .into_response();
        }
    }

    // Generate a simple in-memory rating id
    let rating_id = {
        #[cfg(target_arch = "wasm32")]
        {
            format!("r_{}", worker::js_sys::Date::now() as u64)
        }
        #[cfg(not(target_arch = "wasm32"))]
        {
            format!(
                "r_{}",
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs()
            )
        }
    };

    let rating = crate::store::Rating {
        id: rating_id,
        daily_selection_id: payload.daily_selection_id,
        rating: payload.rating,
        note: payload.note,
        timestamp: None,
    };

    match state.song_store.save_rating(rating).await {
        Ok(_) => (StatusCode::CREATED, Json("Rating saved")).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(e.to_string())).into_response(),
    }
}
