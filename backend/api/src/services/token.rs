use miniredis::BufferedClient;
use uuid::Uuid;

use crate::errors::AppError;

pub async fn token_exists(redis: &BufferedClient, username: String) -> Result<bool, AppError> {
    let token = redis
        .get(&username)
        .await
        .map_err(|e| AppError::Redis(format!("GET failed: {e}")))?;

    Ok(token.is_some())
}

pub async fn check_token(
    redis: &BufferedClient,
    actual_token: Uuid,
    username: String,
) -> Result<bool, AppError> {
    let expected_token = redis
        .get(&username)
        .await
        .map_err(|e| AppError::Redis(format!("GET failed: {e}")))?;

    let expected_token = match expected_token {
        Some(t) => Uuid::from_slice(&t)?,
        // No existing user
        None => return Err(AppError::Unauthorized),
    };

    Ok(actual_token.eq(&expected_token))
}
