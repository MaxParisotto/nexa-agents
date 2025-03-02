use actix_web::{web, App, HttpServer, HttpResponse, Responder};
use actix_cors::Cors;
use serde::{Serialize, Deserialize};
use sysinfo::{System, SystemExt};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use std::collections::HashMap;

// Shared application state
struct AppState {
    system: Mutex<System>,
    token_metrics: Mutex<TokenMetrics>,
    start_time: SystemTime,
}

// System metrics structure 
#[derive(Serialize)]
struct SystemMetrics {
    cpu: CpuMetrics,
    memory: MemoryMetrics,
    uptime: u64,
    server_uptime: u64,
    timestamp: u64,
}

#[derive(Serialize)]
struct CpuMetrics {
    usage: f32,
    cores: usize,
    model: String,
}

#[derive(Serialize)]
struct MemoryMetrics {
    total: u64,
    free: u64,
    used: u64,
    usage_percent: f32,
}

// Token metrics structure
#[derive(Serialize, Deserialize, Clone)]
struct TokenMetrics {
    total_processed: u64,
    input_tokens: u64,
    output_tokens: u64,
    by_model: HashMap<String, u64>,
    timestamp: u64,
}

// Request structure for updating token metrics
#[derive(Deserialize)]
struct TokenUsageRequest {
    model: Option<String>,
    total: u64,
    input: Option<u64>,
    output: Option<u64>,
}

// Basic metrics endpoint
async fn metrics(data: web::Data<Arc<AppState>>) -> impl Responder {
    let mut system = data.system.lock().unwrap();
    system.refresh_all();
    
    let metrics = build_system_metrics(&system, &data.start_time);
    HttpResponse::Ok().json(metrics)
}

// System metrics endpoint
async fn system_metrics(data: web::Data<Arc<AppState>>) -> impl Responder {
    let mut system = data.system.lock().unwrap();
    system.refresh_all();
    
    let metrics = build_system_metrics(&system, &data.start_time);
    HttpResponse::Ok().json(metrics)
}

// Token metrics endpoint
async fn token_metrics(data: web::Data<Arc<AppState>>) -> impl Responder {
    let token_data = data.token_metrics.lock().unwrap().clone();
    HttpResponse::Ok().json(token_data)
}

// Update token metrics endpoint
async fn update_token_metrics(
    data: web::Data<Arc<AppState>>, 
    payload: web::Json<TokenUsageRequest>
) -> impl Responder {
    let mut token_data = data.token_metrics.lock().unwrap();
    
    // Update token metrics
    token_data.total_processed += payload.total;
    token_data.input_tokens += payload.input.unwrap_or(0);
    token_data.output_tokens += payload.output.unwrap_or(0);
    token_data.timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_secs();
    
    // Update per-model metrics
    if let Some(model) = &payload.model {
        let entry = token_data.by_model.entry(model.clone()).or_insert(0);
        *entry += payload.total;
    }
    
    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Token metrics updated successfully"
    }))
}

// Health check endpoint
async fn health() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "time": SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or(Duration::from_secs(0))
            .as_secs()
    }))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize shared state
    let state = Arc::new(AppState {
        system: Mutex::new(System::new_all()),
        token_metrics: Mutex::new(TokenMetrics {
            total_processed: 0,
            input_tokens: 0,
            output_tokens: 0,
            by_model: HashMap::new(),
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or(Duration::from_secs(0))
                .as_secs(),
        }),
        start_time: SystemTime::now(),
    });
    
    println!("🦀 Simple Metrics server starting on http://localhost:3005");
    
    // Start HTTP server
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(Arc::clone(&state)))
            .wrap(
                Cors::default()
                    .allow_any_origin()
                    .allow_any_method()
                    .allow_any_header()
            )
            // API Routes
            .route("/health", web::get().to(health))
            .route("/metrics", web::get().to(metrics))
            .route("/metrics/system", web::get().to(system_metrics))
            .route("/metrics/tokens", web::get().to(token_metrics))
            .route("/metrics/tokens", web::post().to(update_token_metrics))
    })
    .bind("0.0.0.0:3005")?
    .run()
    .await
}

// Helper function to build system metrics
fn build_system_metrics(system: &System, start_time: &SystemTime) -> SystemMetrics {
    // Using correct APIs for sysinfo
    let cpu_usage = system.global_cpu_usage();
    
    let cpu_model = if !system.cpus().is_empty() {
        system.cpus()[0].brand().to_string()
    } else {
        "Unknown CPU".to_string()
    };
    
    SystemMetrics {
        cpu: CpuMetrics {
            usage: cpu_usage,
            cores: system.cpus().len(),
            model: cpu_model,
        },
        memory: MemoryMetrics {
            total: system.total_memory(),
            free: system.available_memory(),
            used: system.used_memory(),
            usage_percent: if system.total_memory() > 0 {
                (system.used_memory() as f32 / system.total_memory() as f32) * 100.0
            } else {
                0.0
            },
        },
        uptime: System::uptime(),
        server_uptime: SystemTime::now()
            .duration_since(*start_time)
            .unwrap_or(Duration::from_secs(0))
            .as_secs(),
        timestamp: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or(Duration::from_secs(0))
            .as_secs(),
    }
}
