#!/bin/bash

# Script to build and run the minimal metrics service

# Define directories
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
WORKSPACE_DIR="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"

echo "🦀 Building minimal metrics service..."
echo "Working directory: $SCRIPT_DIR"

# Check if cargo is installed
if ! command -v cargo &> /dev/null; then
  echo "❌ Error: cargo not found. Please install Rust first."
  echo "Visit https://www.rust-lang.org/tools/install for instructions."
  exit 1
fi

# Build in release mode
echo "Building in release mode..."
cd "$SCRIPT_DIR"

# Create minimal Cargo.toml if it doesn't exist
if [ ! -f "$SCRIPT_DIR/Cargo.toml" ]; then
  echo "Creating minimal Cargo.toml..."
  cat > "$SCRIPT_DIR/Cargo.toml" << 'EOF'
[package]
name = "nexa-metrics"
version = "0.1.0"
edition = "2021"

[dependencies]
actix-web = "4.3.0"
actix-cors = "0.6.4"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.28.0", features = ["full"] }
sysinfo = "0.29.0"
log = "0.4.17"
env_logger = "0.10.0"
EOF
fi

# Create minimal src directory and main.rs if they don't exist
mkdir -p "$SCRIPT_DIR/src"
if [ ! -f "$SCRIPT_DIR/src/main.rs" ]; then
  echo "Creating minimal main.rs..."
  cat > "$SCRIPT_DIR/src/main.rs" << 'EOF'
use actix_cors::Cors;
use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::{System, SystemExt};

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
        cpu_usage: system.global_cpu_info().cpu_usage(),
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
    
    println!("🦀 Metrics & API Proxy server starting on http://localhost:{}", port);

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
EOF
fi

# Build with cargo
echo "Building metrics service..."
cargo build --release

# Check if build succeeded
if [ ! -f "$SCRIPT_DIR/target/release/nexa-metrics" ]; then
  echo "❌ Build failed. Please check the error messages above."
  exit 1
fi

# Run the metrics service
echo "✅ Build successful!"
echo "Starting metrics service..."
"$SCRIPT_DIR/target/release/nexa-metrics"
