
# ── Build stage ───────────────────────────────────────────────────────────────
FROM rust:1.92-slim AS builder

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace manifests first for dependency caching
COPY Cargo.toml Cargo.lock ./
COPY api/Cargo.toml ./api/Cargo.toml
COPY miniredis/Cargo.toml ./miniredis/Cargo.toml

# Fake source files to cache dependencies without full source
RUN mkdir -p api/src miniredis/src \
    && echo "fn main() {}" > api/src/main.rs \
    && echo "" > miniredis/src/main.rs

# Warm dependency cache (allowed to fail after deps are compiled)
RUN cargo build --release --bin server-api || true

RUN rm -rf api/src miniredis/src

# Now copy real source
COPY api/src ./api/src
COPY miniredis/src ./miniredis/src

# Copy sqlx offline query cache -> required for query! macros to compile
# without a live database at build time
COPY .sqlx ./.sqlx

# Copy migrations -> needed by sqlx::migrate! macro at compile time
COPY migrations ./migrations

# Force rebuild of the real source
RUN touch api/src/main.rs api/src/lib.rs
RUN cargo build --release --bin server-api

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/server-api ./server-api

# Migrations must be present at runtime for sqlx::migrate! to run them
COPY migrations ./migrations

# SQLite data directory
RUN mkdir -p /var/lib/typing-game

EXPOSE 8080

CMD ["./server-api"]
