use actix_cors::Cors;
use api::{
    db::{self, redis::populate_redis},
    models::AppState,
    routes::{self, events::connections::connections_broadcast_routine},
};

use actix_web::{App, HttpServer, http::header, middleware, web};
use miniredis::{BufferedClient, Client, server};
use std::net::SocketAddr;
use tokio::{net::TcpListener, sync::broadcast, task::JoinHandle};

// -- The following function is for development, not production
// -- In production, the server sits behind nginx.
// use rustls::ServerConfig;
// use rustls_pemfile::{certs, pkcs8_private_keys};
// fn tls_config() -> ServerConfig {
//     let cert_path = std::env::var("TLS_CERT").unwrap_or_else(|_| "localhost+1.pem".into());
//     let key_path = std::env::var("TLS_KEY").unwrap_or_else(|_| "localhost+1-key.pem".into());

//     let cert_file = &mut std::io::BufReader::new(
//         std::fs::File::open(&cert_path).unwrap_or_else(|_| panic!("cert not found at {cert_path}")),
//     );
//     let key_file = &mut std::io::BufReader::new(
//         std::fs::File::open(&key_path).unwrap_or_else(|_| panic!("key not found at {key_path}")),
//     );

//     let cert_chain = certs(cert_file).map(|c| c.unwrap()).collect();
//     let mut keys = pkcs8_private_keys(key_file)
//         .map(|k| k.unwrap())
//         .collect::<Vec<_>>();

//     ServerConfig::builder()
//         .with_no_client_auth()
//         .with_single_cert(
//             cert_chain,
//             rustls::pki_types::PrivateKeyDer::Pkcs8(keys.remove(0)),
//         )
//         .unwrap()
// }
// -------------------------------------------------------------------------

async fn start_redis_server() -> (SocketAddr, JoinHandle<()>) {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let aof_filename = None;
    let warmup = None;

    let handle = tokio::spawn(async move {
        server::run(listener, tokio::signal::ctrl_c(), aof_filename, warmup).await
    });

    (addr, handle)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .init();

    let (addr, _) = start_redis_server().await;
    let client = Client::connect(addr).await.unwrap();

    let (ranking_tx, _) = broadcast::channel(2048);
    let (connections_tx, _) = broadcast::channel(1024);

    let redis = BufferedClient::buffer(client);

    connections_broadcast_routine(connections_tx.clone(), redis.clone()).await;

    dotenvy::dotenv().ok();
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db_pool = db::init_pool(&database_url)
        .await
        .expect("failed to open sqlite db");

    // populate the redis database
    populate_redis(&redis, &db_pool).await;

    let state = web::Data::new(AppState {
        redis,
        ranking_tx,
        connections_tx,
        db_pool,
    });

    let bind_addr = std::env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".into()); // Is run inside a docker so 0.0.0.0

    let allowed_origin =
        std::env::var("ALLOWED_ORIGIN").unwrap_or_else(|_| "https://localhost:5173".into());
    tracing::info!("listening on {bind_addr}");

    HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            .wrap(
                Cors::default()
                    .allowed_origin(&allowed_origin)
                    .allowed_methods(vec!["GET", "POST", "DELETE"])
                    .allowed_headers(vec![header::CONTENT_TYPE])
                    .max_age(3600),
            )
            .app_data(
                // Return JSON on deserialisation errors instead of plain 400.
                web::JsonConfig::default().error_handler(|err, _req| {
                    let msg = err.to_string();
                    actix_web::error::InternalError::from_response(
                        err,
                        actix_web::HttpResponse::BadRequest()
                            .json(serde_json::json!({ "error": msg })),
                    )
                    .into()
                }),
            )
            .wrap(middleware::Logger::default())
            // REST endpoints
            .service(routes::connection::create_connection)
            .service(routes::connection::delete_connection)
            .service(routes::health::health)
            .service(routes::heartbeat::heartbeat)
            .service(routes::scores::submit_score)
            // SSE streams
            .service(routes::events::connections::connection_count)
            .service(routes::events::ranking::ranking)
    })
    // .bind_rustls_0_23(bind_addr, tls_config())?
    .bind(bind_addr)?
    .run()
    .await
}
