use crate::errors::AppError;
use axum::{
    extract::{Path, Query, State},
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
) -> Result<Json<crate::store::Song>, AppError> {
    let song = state
        .song_store
        .get_daily_selection()
        .await
        .ok_or_else(|| AppError::NotFound("No song found".to_string()))?;
    Ok(Json(song))
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
) -> Result<impl IntoResponse, AppError> {
    if payload.daily_selection_id.len() > 64 {
        return Err(AppError::BadRequest(
            "Daily selection ID is too long".to_string(),
        ));
    }

    if payload.rating < 1 || payload.rating > 5 {
        return Err(AppError::BadRequest(
            "Rating must be between 1 and 5".to_string(),
        ));
    }

    if let Some(ref note) = payload.note {
        if note.chars().count() > 1024 {
            return Err(AppError::BadRequest(
                "Note must be 1024 characters or less".to_string(),
            ));
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
                    .as_nanos()
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

    state.song_store.save_rating(rating).await?;
    Ok((StatusCode::CREATED, Json("Rating saved")))
}

pub async fn get_listening_history(
    State(state): State<crate::AppState>,
    Query(query): Query<crate::store::HistoryQuery>,
) -> Result<Json<Vec<crate::store::HistoryItem>>, AppError> {
    Ok(Json(state.song_store.get_history(query).await?))
}

pub async fn get_progress(
    State(state): State<crate::AppState>,
) -> Result<Json<Vec<crate::progress::EraProgress>>, AppError> {
    Ok(Json(
        crate::progress::load_progress(state.song_store.as_ref()).await?,
    ))
}

/// Body of `PUT /api/ratings/{id}`. A field left out keeps its current value.
#[derive(Deserialize, Serialize, Default)]
pub struct UpdateRatingRequest {
    pub rating: Option<u8>,
    pub note: Option<String>,
}

/// `PUT /api/ratings/{id}`: edits the score and/or note of a past rating.
///
/// An empty note removes the note. Responds 400 for invalid input (nothing is saved),
/// 404 when no rating has this id, and 200 with the updated rating otherwise.
pub async fn update_rating(
    State(state): State<crate::AppState>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateRatingRequest>,
) -> Result<Json<crate::store::Rating>, AppError> {
    if id.len() > 64 {
        return Err(AppError::BadRequest("Rating ID is too long".to_string()));
    }

    if payload.rating.is_none() && payload.note.is_none() {
        return Err(AppError::BadRequest("Nothing to update".to_string()));
    }

    if let Some(rating) = payload.rating {
        if !(1..=5).contains(&rating) {
            return Err(AppError::BadRequest(
                "Rating must be between 1 and 5".to_string(),
            ));
        }
    }

    if let Some(ref note) = payload.note {
        if note.chars().count() > 1024 {
            return Err(AppError::BadRequest(
                "Note must be 1024 characters or less".to_string(),
            ));
        }
    }

    let rating = state
        .song_store
        .update_rating(id, payload.rating, payload.note)
        .await?
        .ok_or_else(|| AppError::NotFound("Rating not found".to_string()))?;
    Ok(Json(rating))
}
