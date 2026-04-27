use sqlx::SqlitePool;

use crate::MAX_LEADERBOARD_SIZE;

// Sqlite does not have unsigned integer
// Casting u64 to i64 is safe according to the game dynamic.
pub struct BestScore {
    pub username: String,
    pub best_score: i64,
}

/// Upsert: insert or update only if the new score beats the existing one.
/// Avoid making read then write -> more efficient in one go.
pub async fn upsert_best_score(
    pool: &SqlitePool,
    username: &str,
    score: i64,
) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;

    sqlx::query!(
        r#"
        INSERT INTO best_scores (username, best_score)
        VALUES (?1, ?2)
        ON CONFLICT(username) DO UPDATE SET
            best_score  = MAX(best_score, excluded.best_score),
            achieved_at = CASE
                WHEN excluded.best_score > best_score THEN CURRENT_TIMESTAMP
                ELSE achieved_at
            END
        "#,
        username,
        score,
    )
    .execute(&mut *tx)
    .await?;

    // Evict only if we're over the cap: O(1) count check, O(log n) min lookup
    let count = sqlx::query_scalar!("SELECT COUNT(*) FROM best_scores")
        .fetch_one(&mut *tx)
        .await?;

    if count > MAX_LEADERBOARD_SIZE {
        sqlx::query!(
            r#"
            DELETE FROM best_scores
            WHERE username = (
                SELECT username FROM best_scores
                ORDER BY best_score ASC
                LIMIT 1
            )
            "#
        )
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(())
}

pub async fn get_best_score(
    pool: &SqlitePool,
    username: &str,
) -> Result<Option<BestScore>, sqlx::Error> {
    sqlx::query_as!(
        BestScore,
        "
        SELECT
            username,
            best_score
        FROM best_scores
        WHERE username = ?
        ",
        username,
    )
    .fetch_optional(pool)
    .await
}
