use miniredis::BufferedClient;
use sqlx::SqlitePool;

use crate::SCORES_KEY;

pub async fn populate_redis(redis: &BufferedClient, db_pool: &SqlitePool) {
    let rows =
        match sqlx::query!("SELECT username, best_score FROM best_scores ORDER BY best_score DESC")
            .fetch_all(db_pool)
            .await
        {
            Ok(rows) => rows,
            Err(e) => {
                tracing::error!("Failed to fetch best scores from SQLite: {e}");
                return;
            }
        };

    if rows.is_empty() {
        tracing::info!("No scores to populate Redis with");
        return;
    }

    let entries: Vec<(u64, String)> = rows
        .into_iter()
        .map(|r| (r.best_score as u64, r.username))
        .collect();

    let count = entries.len();

    match redis.zadd(SCORES_KEY, entries).await {
        Ok(_) => tracing::info!("Populated Redis leaderboard with {count} entries"),
        Err(e) => tracing::error!("Failed to populate Redis leaderboard: {e}"),
    }
}
