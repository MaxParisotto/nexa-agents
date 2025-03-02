use actix_web::{web, App, HttpServer, HttpResponse, Responder};
use actix_cors::Cors;
use serde::{Serialize, Deserialize};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use std::collections::HashMap;

// Very simple metrics
#[derive(Serialize)]
struct SimpleMetrics {
    uptime: u64,
    timestamp: u64,
    memory: SimpleMemory,
    cpu: SimpleCpu,
}

#[derive(Serialize)]
struct SimpleMemory {
    usage_percent: f32
}

#[derive(Serialize)]
struct SimpleCpu {
    cores: usize,
    usage: f32
}

#[derive(Serialize, Deserialize, Clone)]
struct TokenMetrics {
    total_processed: u64,
    timestamp: u64
}

struct AppState {
    metrics: Mutex<SimpleMetrics>,
    token_metrics: Mutex<TokenMetrics>,
}

async fn metrics(data: web::Data<AppState>) -> impl Responder {
    let mut metrics = data.metrics.lock().unwrap();
    
    // Update the metrics with simulated values
    metrics.uptime += 1;
    metrics.timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_else(|_| std::time::Duration::from_secs(0))
        .as_secs();
    
    // Simulate memory and CPU values
    metrics.memory.usage_percent = 40.0 + (metrics.uptime as f32 % 20.0);
    metrics.cpu.usage = 10.0 + (metrics.uptime as f32 % 30.0);
    
    HttpResponse::Ok().json(&*metrics)
}

async fn system_metrics(data: web::Data<AppState>) -> impl Responder {
    // Just use the same metrics endpoint
    metrics(data).await
}

async fn token_metrics(data: web::Data<AppState>) -> impl Responder {
    let token_data = data.token_metrics.lock().unwrap();
    HttpResponse::Ok().json(&*token_data)
}

#[derive(Deserialize)]
struct TokenUpdate {
    total: u64,
}

async fn update_tokens(data: web::Data<AppState>, update: web::Json<TokenUpdate>) -> impl Responder {
    let mut token_metrics = data.token_metrics.lock().unwrap();
    token_metrics.total_processed += update.total;
    token_metrics.timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_else(|_| std::time::Duration::from_secs(0))
        .as_secs();
        
    HttpResponse::Ok().json(serde_json::json!({ "success": true }))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Minimal state with simulated metrics
    let state = web::Data::new(AppState {
        metrics: Mutex::new(SimpleMetrics {
            uptime: 0,
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_else(|_| std::time::Duration::from_secs(0))
                .as_secs(),
            memory: SimpleMemory { usage_percent: 45.0 },
            cpu: SimpleCpu { cores: num_cpus::get(), usage: 15.0 }
        }),
        token_metrics: Mutex::new(TokenMetrics {
            total_processed: 0,
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_else(|_| std::time::Duration::from_secs(0))
                .as_secs()
        })
    });
    
    println!("🦀 Minimal Metrics Service starting on http://localhost:3005");
    
    HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            .wrap(Cors::permissive())
            .route("/metrics", web::get().to(metrics))
            .route("/metrics/system", web::get().to(system_metrics))
            .route("/metrics/tokens", web::get().to(token_metrics))
            .route("/metrics/tokens", web::post().to(update_tokens))
    })
    .bind("0.0.0.0:3005")?
    .run()
    .await
}
