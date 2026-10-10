use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};

/// Errors shared by the Daily Rock handlers.
#[derive(Debug)]
pub enum AppError {
    BadRequest(String),
    NotFound(String),
    Internal(worker::Error),
}

impl From<worker::Error> for AppError {
    fn from(error: worker::Error) -> Self {
        Self::Internal(error)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            Self::BadRequest(message) => (StatusCode::BAD_REQUEST, message),
            Self::NotFound(message) => (StatusCode::NOT_FOUND, message),
            Self::Internal(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Something went wrong. Please try again.".to_string(),
            ),
        };
        (status, Json(message)).into_response()
    }
}

