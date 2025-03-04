use actix_cors::Cors;
use actix_web::{get, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::{CpuExt, System, SystemExt};

#[derive(Serialize, Deserialize)]
struct SystemMetrics {
    cpu_usage: f32,
    memory_used: u64,
    memory_total: u64,
    uptime: u64,
    processes: usize,
    timestamp: u64,
}

#[get("/api/metrics/system")]
async fn get_system_metrics() -> impl Responder {
    let mut system = System::new_all();
    system.refresh_all();

    let metrics = SystemMetrics {
        cpu_usage: system.global_cpu_info().cpu_usage() as f32,
        memory_used: system.used_memory(),
        memory_total: system.total_memory(),
        uptime: system.uptime(),
        processes: system.processes().len(),
        timestamp: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    };

    HttpResponse::Ok().json(metrics)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();
    let port = std::env::var("METRICS_PORT").unwrap_or_else(|_| "3005".to_string());
    let addr = format!("0.0.0.0:{}", port);
    
    println!("🦀 Metrics & API Proxy server starting on http://{}", addr);

    HttpServer::new(|| {
        let cors = Cors::permissive();
        
        App::new()
            .wrap(cors)
            .service(get_system_metrics)
    })
    .bind(addr)?
    .run()
    .await
}
