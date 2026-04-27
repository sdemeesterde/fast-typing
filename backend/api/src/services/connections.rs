use miniredis::BufferedClient;

use crate::errors::AppError;

pub async fn get_connections_cnt(redis: &BufferedClient) -> Result<usize, AppError> {
    let connections_cnt = redis
        .len()
        .await
        .map_err(|e| AppError::Redis(format!("LEN failed: {e}")))?;

    Ok(connections_cnt)
}
