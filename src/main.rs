use actix_web::{App, HttpServer, Responder, web};
use actix_web::http::StatusCode;
use log::info;

async fn health_check() -> impl Responder {
    info!("Health check endpoint hit");
    (StatusCode::OK, "Nexa Agents is running and healthy\n")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let mut app = HttpServer::new()
        .app(
            App::new()
                .service(
                    web::resource("/health")
                        .to(health_check)
                )
            )
        );

    info!("Starting Nexa Agents server on 127.0.0.1:8080");
    app = app.bind("127.0.0.1:8080")?;
    
    app.run()
}
