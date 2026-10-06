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

/// Preserves a store failure as an internal application error.
impl From<worker::Error> for AppError {
    fn from(error: worker::Error) -> Self {
        Self::Internal(error)
    }
}

/// Converts application errors into JSON string responses.
/// Bad requests and missing resources retain their messages with status 400 or 404.
/// Internal errors return status 500 and a fixed message without exposing store details.
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

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::to_bytes;

    async fn assert_response(error: AppError, status: StatusCode, message: &str) {
        let response = error.into_response();
        assert_eq!(response.status(), status);
        assert_eq!(response.headers()["content-type"], "application/json");
        let bytes = to_bytes(response.into_body(), 4096).await.unwrap();
        let body: String = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(body, message);
    }

    #[tokio::test]
    async fn app_error_bad_request_keeps_unicode_and_quotes() {
        assert_response(
            AppError::BadRequest("評分 \"6\" 不在 1-5 範圍\n請重試".to_string()),
            StatusCode::BAD_REQUEST,
            "評分 \"6\" 不在 1-5 範圍\n請重試",
        )
        .await;
    }

    #[tokio::test]
    async fn app_error_not_found_keeps_message() {
        assert_response(
            AppError::NotFound("Rating not found".to_string()),
            StatusCode::NOT_FOUND,
            "Rating not found",
        )
        .await;
    }

    #[tokio::test]
    async fn app_error_internal_hides_store_details() {
        assert_response(
            AppError::Internal(worker::Error::RustError(
                "D1 query failed: private-db".to_string(),
            )),
            StatusCode::INTERNAL_SERVER_ERROR,
            "Something went wrong. Please try again.",
        )
        .await;
    }

    #[test]
    fn app_error_from_preserves_original_error() {
        let converted = AppError::from(worker::Error::RustError("catalog unavailable".to_string()));
        match converted {
            AppError::Internal(error) => assert_eq!(error.to_string(), "catalog unavailable"),
            other => panic!("Expected Internal, got {other:?}"),
        }
    }

    fn propagate(result: worker::Result<u8>) -> Result<u8, AppError> {
        let score = result?;
        Ok(score)
    }

    #[test]
    fn app_error_question_mark_converts_store_failure() {
        let result = propagate(Err(worker::Error::RustError(
            "ratings unavailable".to_string(),
        )));
        match result {
            Err(AppError::Internal(error)) => assert_eq!(error.to_string(), "ratings unavailable"),
            other => panic!("Expected Internal, got {other:?}"),
        }
    }

    #[test]
    fn app_error_question_mark_keeps_success() {
        assert_eq!(propagate(Ok(5)).unwrap(), 5);
    }
}
