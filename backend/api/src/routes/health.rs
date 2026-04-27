use actix_web::{HttpResponse, Responder, get};

#[get("/health")]
async fn health() -> impl Responder {
    HttpResponse::Ok().body("ok")
}
