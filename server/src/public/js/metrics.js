document.addEventListener('DOMContentLoaded', function() {
  const systemMetricsContainer = document.getElementById('system-metrics');
  const logListContainer = document.getElementById('log-list');
  
  // Make global refresh function available
  window.refreshMetrics = fetchMetrics;

  // Initialize charts
  let cpuChart, memoryChart, networkChart;
  initializeCharts();

  function initializeCharts() {
    // Only initialize charts if Chart.js is loaded
    if (typeof Chart === 'undefined') return;
    
    // CPU Usage Chart - will be added in a future update
    // Memory Usage Chart - will be added in a future update
    // Network Traffic Chart - will be added in a future update
  }

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
          updateDetailedSystemMetrics(data.metrics);
          
          // Also fetch logs if the logs section is expanded
          if (document.getElementById('logs-content').classList.contains('expanded')) {
            fetchLogs();
          }
        } else {
          systemMetricsContainer.innerHTML = '<p class="error">Failed to load metrics</p>';
        }
      })
      .catch(error => {
        console.error('Error fetching metrics:', error);
        systemMetricsContainer.innerHTML = '<p class="error">Error loading metrics: ' + error.message + '</p>';
      });
      
    // Also fetch from the metrics collector for real-time data
    socket.emit('get_metrics');
  }

  function updateDetailedSystemMetrics(metrics) {
    // Format memory values to MB
    const usedMemory = Math.round((metrics.memoryUsage.heapUsed / 1024 / 1024) * 100) / 100;
    const totalMemory = Math.round((metrics.totalMemory / 1024 / 1024 / 1024) * 100) / 100;
    const freeMemory = Math.round((metrics.freeMemory / 1024 / 1024 / 1024) * 100) / 100;
    
    // Update the system metrics container with detailed information
    systemMetricsContainer.innerHTML = `
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
    
    // Update the summary metrics in the main dashboard
    document.getElementById('cpu-usage').textContent = `${Math.round((metrics.cpuUsage.user + metrics.cpuUsage.system) / 1000)}%`;
    document.getElementById('memory-usage').textContent = `${usedMemory} MB`;
    document.getElementById('system-uptime').textContent = `${Math.floor(metrics.uptime / 3600)}h ${Math.floor((metrics.uptime % 3600) / 60)}m`;
  }
  
  function fetchLogs() {
    fetch('/api/logs?limit=50')
      .then(response => response.json())
      .then(data => {
        if (data.logs && Array.isArray(data.logs)) {
          updateLogDisplay(data.logs);
        }
      })
      .catch(error => {
        console.error('Error fetching logs:', error);
        if (logListContainer) {
          logListContainer.innerHTML = '<p class="error">Error loading logs: ' + error.message + '</p>';
        }
      });
  }
  
  function updateLogDisplay(logs) {
    if (!logListContainer) return;
    
    // Get the current filter level
    const filterLevel = document.getElementById('log-level-filter').value;
    const searchTerm = document.getElementById('log-search').value.toLowerCase();
    
    // Filter logs based on level and search term
    const filteredLogs = logs.filter(log => {
      const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
      const matchesSearch = !searchTerm || 
                           log.message.toLowerCase().includes(searchTerm) || 
                           log.source.toLowerCase().includes(searchTerm);
      return matchesLevel && matchesSearch;
    });
    
    // Create log entries
    logListContainer.innerHTML = filteredLogs.map(log => {
      const levelClass = log.level === 'error' ? 'error' : 
                        log.level === 'warn' ? 'warning' : 'info';
      
      return `
        <div class="log-entry ${levelClass}">
          <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
          <span class="log-level ${levelClass}">${log.level.toUpperCase()}</span>
          <span class="log-source">[${log.source}]</span>
          <span class="log-message">${log.message}</span>
        </div>
      `;
    }).join('') || '<p>No logs matching the current filter</p>';
  }
  
  // Set up log filter event listeners
  if (document.getElementById('log-level-filter')) {
    document.getElementById('log-level-filter').addEventListener('change', () => {
      fetchLogs();
    });
  }
  
  if (document.getElementById('log-search')) {
    document.getElementById('log-search').addEventListener('input', () => {
      fetchLogs();
    });
  }

  // Initial fetch
  fetchMetrics();
  
  // Update metrics every 30 seconds
  setInterval(fetchMetrics, 30000);
});
