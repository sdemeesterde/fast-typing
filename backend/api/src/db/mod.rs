use sqlx::{SqlitePool, sqlite::SqlitePoolOptions};

pub mod redis;
pub mod scores;

pub async fn init_pool(database_url: &str) -> Result<SqlitePool, sqlx::Error> {
    // Strip the sqlite:// prefix and query string to get the raw path
    if let Some(path) = database_url
        .trim_start_matches("sqlite://")
        .split('?')
        .next()
        && let Some(parent) = std::path::Path::new(path).parent()
    {
        std::fs::create_dir_all(parent).expect("failed to create database directory");
    }
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await?;

    // Runs migrations in backend/migrations/ automatically at startup.
    sqlx::migrate!("./../migrations").run(&pool).await?;

    Ok(pool)
}
