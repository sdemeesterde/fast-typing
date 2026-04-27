use actix_web::HttpResponse;
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
pub enum AppError {
    #[error("Username already taken")]
    UsernameTaken,

    #[error("Invalid or expired username")]
    Unauthorized,

    #[error("Connection token error")]
    Token(String),

    #[error("Invalid client request")]
    BadRequest,

    #[error("Serde error: {0}")]
    Serde(String),

    #[error("Redis error: {0}")]
    Redis(String),
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        AppError::Redis(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Serde(err.to_string())
    }
}

impl From<uuid::Error> for AppError {
    fn from(err: uuid::Error) -> Self {
        AppError::Token(err.to_string())
    }
}

impl AppError {
    // Used by the frontend as more readable code errors
    pub fn code(&self) -> &'static str {
        match self {
            AppError::UsernameTaken => "USERNAME_TAKEN",
            AppError::Unauthorized => "UNAUTHORIZED",
            AppError::Token(_) => "TOKEN_ERROR",
            AppError::BadRequest => "BAD_REQUEST",
            AppError::Serde(_) => "INTERNAL_ERROR",
            AppError::Redis(_) => "INTERNAL_ERROR",
        }
    }
}

impl actix_web::ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        match self {
            AppError::UsernameTaken => HttpResponse::Conflict().json(serde_json::json!({
                "code": self.code(),
                "error": self.to_string()
            })),
            AppError::Unauthorized => HttpResponse::Unauthorized().json(serde_json::json!({
                "code": self.code(),
                "error": self.to_string()
            })),
            AppError::Token(_) => HttpResponse::BadRequest().json(serde_json::json!({
                "code": self.code(),
                "error": "Error with provided token"
            })),
            AppError::BadRequest => HttpResponse::BadRequest().json(serde_json::json!({
                "code": self.code(),
                "error": "Error with provided game inputs"
            })),
            AppError::Serde(_) => HttpResponse::InternalServerError().json(serde_json::json!({
                "code": self.code(),
                "error": "Internal server error"
            })),
            AppError::Redis(_) => HttpResponse::InternalServerError().json(serde_json::json!({
                "code": self.code(),
                "error": "Internal server error"
            })),
        }
    }
}
