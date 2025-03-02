use actix_web::{web, App, HttpServer, HttpResponse, Responder, HttpRequest};
use actix_web::http::header;
use actix_cors::Cors;
use serde::{Serialize, Deserialize};
use sysinfo::System; // Use only the System import, no trait
use std::sync::{Arc, Mutex, RwLock};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use std::collections::HashMap;
use awc::Client;
use chrono::Timelike; // Add this import for hour() method

// Node.js backend URL
const BACKEND_URL: &str = "http://localhost:3001";

// Shared application state
struct AppState {
    system: Mutex<System>,
    token_metrics: RwLock<TokenMetrics>,
    traffic_metrics: RwLock<TrafficMetrics>,
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

// New traffic metrics structure
#[derive(Serialize, Deserialize, Clone, Default)]
struct TrafficMetrics {
    // Request counts
    total_requests: u64,
    requests_by_endpoint: HashMap<String, u64>,
    
    // Response status counts
    responses_by_status: HashMap<u16, u64>,
    
    // Data transfer
    total_bytes_in: u64,
    total_bytes_out: u64,
    
    // Timing statistics
    avg_response_time_ms: f64,
    response_times: HashMap<String, Vec<f64>>, // Path to list of response times
    
    // User-agent statistics
    requests_by_user_agent: HashMap<String, u64>,
    
    // Hourly request counts for the last 24 hours
    hourly_requests: [u64; 24],
    
    // Last update timestamp
    last_updated: u64,
}

// Request endpoint handler - this will proxy all API requests
async fn proxy_handler(
    req: HttpRequest,
    body: web::Bytes,
    client: web::Data<Client>,
    state: web::Data<Arc<AppState>>,
) -> HttpResponse {
    let start_time = Instant::now();
    
    // Get path and query string
    let path = req.uri().path();
    let query_string = req.uri().query().map_or_else(String::new, |q| format!("?{}", q));
    
    // Build target URL
    let target_url = format!("{}{}{}", BACKEND_URL, path, query_string);
    println!("🔄 Proxying request to {}", target_url);
    
    // Extract method
    let method = req.method().clone();
    
    // Track incoming request in metrics
    {
        let mut traffic_metrics = state.traffic_metrics.write().unwrap();
        traffic_metrics.total_requests += 1;
        
        // Update endpoint metrics
        let endpoint_counter = traffic_metrics.requests_by_endpoint
            .entry(path.to_string())
            .or_insert(0);
        *endpoint_counter += 1;
        
        // Track request size
        traffic_metrics.total_bytes_in += body.len() as u64;
        
        // Track user agent
        if let Some(user_agent) = req.headers().get(header::USER_AGENT) {
            if let Ok(ua_str) = user_agent.to_str() {
                let ua_counter = traffic_metrics.requests_by_user_agent
                    .entry(ua_str.to_string())
                    .or_insert(0);
                *ua_counter += 1;
            }
        }
        
        // Update hourly metrics - Fix for hour() method
        let current_hour = chrono::Local::now().hour() as usize;
        traffic_metrics.hourly_requests[current_hour] += 1;
        
        // Update timestamp
        traffic_metrics.last_updated = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or(Duration::from_secs(0))
            .as_secs();
    }

    // Create a new awc request with the same method
    let mut forwarded_req = match method.as_str() {
        "GET" => client.get(target_url),
        "POST" => client.post(target_url),
        "PUT" => client.put(target_url),
        "DELETE" => client.delete(target_url),
        "PATCH" => client.patch(target_url),
        "HEAD" => client.head(target_url),
        "OPTIONS" => client.options(target_url),
        _ => {
            println!("❌ Unsupported method: {}", method);
            return HttpResponse::MethodNotAllowed().finish();
        }
    };
    
    // Forward the headers
    for (header_name, header_value) in req.headers().iter().filter(|(h, _)| *h != header::HOST) {
        forwarded_req = forwarded_req.insert_header((header_name.clone(), header_value.clone()));
    }
    
    // Send the request with the body - FIX: make response mutable
    let mut response = match forwarded_req.send_body(body).await {
        Ok(response) => response,
        Err(err) => {
            println!("❌ Error forwarding request: {}", err);
            return HttpResponse::InternalServerError().body(format!("Proxy error: {}", err));
        }
    };
    
    let status = response.status();
    let mut client_resp = HttpResponse::build(status);
    
    // Copy the response headers
    for (header_name, header_value) in response.headers().iter() {
        if header_name != header::CONTENT_LENGTH {
            client_resp.insert_header((header_name.clone(), header_value.clone()));
        }
    }
    
    // Get response body - now with mutable response
    let body_bytes = match response.body().await {
        Ok(bytes) => bytes,
        Err(err) => {
            println!("❌ Error reading response body: {}", err);
            return HttpResponse::InternalServerError().body(format!("Error reading response: {}", err));
        }
    };
    
    // Track response in metrics
    {
        let mut traffic_metrics = state.traffic_metrics.write().unwrap();
        
        // Update status code metrics
        let status_counter = traffic_metrics.responses_by_status
            .entry(status.as_u16())
            .or_insert(0);
        *status_counter += 1;
        
        // Track response size
        traffic_metrics.total_bytes_out += body_bytes.len() as u64;
        
        // Track response time
        let elapsed = start_time.elapsed().as_secs_f64() * 1000.0; // ms
        
        // Update average response time (weighted moving average)
        if traffic_metrics.total_requests > 1 {
            traffic_metrics.avg_response_time_ms = 
                (traffic_metrics.avg_response_time_ms * (traffic_metrics.total_requests as f64 - 1.0) 
                 + elapsed) / traffic_metrics.total_requests as f64;
        } else {
            traffic_metrics.avg_response_time_ms = elapsed;
        }
        
        // Store response time by path
        traffic_metrics.response_times
            .entry(path.to_string())
            .or_insert_with(Vec::new)
            .push(elapsed);
        
        // Limit the number of stored times to prevent memory bloat
        if let Some(times) = traffic_metrics.response_times.get_mut(path) {
            if times.len() > 100 {
                // Keep only the latest 100 entries
                *times = times.iter().skip(times.len() - 100).cloned().collect();
            }
        }
    }
    
    // Return the response
    client_resp.body(body_bytes)
}

// Traffic metrics endpoint
async fn traffic_metrics(state: web::Data<Arc<AppState>>) -> impl Responder {
    let traffic_data = state.traffic_metrics.read().unwrap().clone();
    HttpResponse::Ok().json(traffic_data)
}

// Original metrics endpoints
async fn metrics(data: web::Data<Arc<AppState>>) -> impl Responder {
    let mut system = data.system.lock().unwrap();
    system.refresh_all();
    
    let metrics = build_system_metrics(&system, &data.start_time);
    HttpResponse::Ok().json(metrics)
}

async fn system_metrics(data: web::Data<Arc<AppState>>) -> impl Responder {
    let mut system = data.system.lock().unwrap();
    system.refresh_all();
    
    let metrics = build_system_metrics(&system, &data.start_time);
    HttpResponse::Ok().json(metrics)
}

async fn token_metrics(data: web::Data<Arc<AppState>>) -> impl Responder {
    let token_data = data.token_metrics.read().unwrap().clone();
    HttpResponse::Ok().json(token_data)
}

// Update token metrics endpoint
async fn update_token_metrics(
    data: web::Data<Arc<AppState>>, 
    payload: web::Json<TokenUsageRequest>
) -> impl Responder {
    let mut token_data = data.token_metrics.write().unwrap();
    
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

// Request structure for updating token metrics
#[derive(Deserialize)]
struct TokenUsageRequest {
    model: Option<String>,
    total: u64,
    input: Option<u64>,
    output: Option<u64>,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize shared state
    let state = Arc::new(AppState {
        system: Mutex::new(System::new_all()),
        token_metrics: RwLock::new(TokenMetrics {
            total_processed: 0,
            input_tokens: 0,
            output_tokens: 0,
            by_model: HashMap::new(),
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or(Duration::from_secs(0))
                .as_secs(),
        }),
        traffic_metrics: RwLock::new(TrafficMetrics::default()),
        start_time: SystemTime::now(),
    });
    
    println!("🦀 Metrics & API Proxy server starting on http://localhost:3005");
    
    // Start HTTP server
    HttpServer::new(move || {
        // Create HTTP client for proxying requests
        let client = Client::default();
        
        App::new()
            .app_data(web::Data::new(client.clone()))
            .app_data(web::Data::new(Arc::clone(&state)))
            .wrap(
                Cors::default()
                    .allow_any_origin()
                    .allow_any_method()
                    .allow_any_header()
            )
            // Dedicated metrics routes
            .service(web::resource("/metrics").route(web::get().to(metrics)))
            .service(web::resource("/metrics/system").route(web::get().to(system_metrics)))
            .service(web::resource("/metrics/tokens").route(web::get().to(token_metrics)))
            .service(web::resource("/metrics/tokens").route(web::post().to(update_token_metrics)))
            .service(web::resource("/metrics/traffic").route(web::get().to(traffic_metrics)))
            
            // Default route - proxy all other requests to Node.js
            .default_service(web::to(proxy_handler))
    })
    .bind("0.0.0.0:3005")?
    .run()
    .await
}

// Helper function to build system metrics from sysinfo data - Updated to match API
fn build_system_metrics(system: &System, start_time: &SystemTime) -> SystemMetrics {
    // Updated for sysinfo 0.33.1 API
    
    // Get CPU usage (API changed)
    let cpu_usage = system.global_cpu_usage();
    
    // Get CPU model (API changed)
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
