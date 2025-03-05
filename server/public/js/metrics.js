document.addEventListener('DOMContentLoaded', function() {
  const metricsContainer = document.getElementById('system-metrics');
  if (!metricsContainer) return;

  function fetchMetrics() {
    fetch('/api/metrics')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          updateMetricsDisplay(data.metrics);
        } else {
          metricsContainer.innerHTML = '<p class="error">Failed to load metrics</p>';
        }
      })
      .catch(error => {
        console.error('Error fetching metrics:', error);
        metricsContainer.innerHTML = '<p class="error">Error loading metrics: ' + error.message + '</p>';
      });
  }

  function updateMetricsDisplay(metrics) {
    // Format memory values to MB
    const usedMemory = Math.round((metrics.memoryUsage.heapUsed / 1024 / 1024) * 100) / 100;
    const totalMemory = Math.round((metrics.totalMemory / 1024 / 1024 / 1024) * 100) / 100;
    const freeMemory = Math.round((metrics.freeMemory / 1024 / 1024 / 1024) * 100) / 100;
    
    metricsContainer.innerHTML = `
      <div class="metrics-grid">
        <div class="metric-card">
          <h3>Memory Usage</h3>
          <p>Heap Used: ${usedMemory} MB</p>
          <p>Total Memory: ${totalMemory} GB</p>
          <p>Free Memory: ${freeMemory} GB</p>
        </div>
        <div class="metric-card">
          <h3>Uptime</h3>
          <p>Server Uptime: ${Math.floor(metrics.uptime / 3600)} hours ${Math.floor((metrics.uptime % 3600) / 60)} minutes</p>
          <p>OS Uptime: ${Math.floor(metrics.osUptime / 3600)} hours ${Math.floor((metrics.osUptime % 3600) / 60)} minutes</p>
        </div>
        <div class="metric-card">
          <h3>System Info</h3>
          <p>Hostname: ${metrics.hostname}</p>
          <p>Platform: ${metrics.platform}</p>
          <p>Node Version: ${metrics.nodeVersion}</p>
        </div>
      </div>
    `;
  }

  // Initial fetch
  fetchMetrics();
  
  // Update metrics every 30 seconds
  setInterval(fetchMetrics, 30000);
});
