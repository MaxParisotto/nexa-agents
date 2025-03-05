(function() {
  'use strict';

  // Explicitly declare global variables from external libraries
  const { io } = window;
  const { Chart } = window;

  if (!io || !Chart) {
    console.error('Required libraries not loaded: ', {
      'socket.io': !!io,
      'chart.js': !!Chart
    });
    return;
  }

  // Store configuration state
  let currentConfig = {};
  let configChanged = false;

  // DOM Elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const saveAllBtn = document.getElementById('save-all-btn');
  const restoreBtn = document.getElementById('restore-btn');
  const statusMessage = document.getElementById('status-message');
  const saveIndicator = document.getElementById('save-indicator');
  
  // Initialize socket connection first
  const socket = io();

  // Rest of dashboard functionality
  const dashboard = {
    initialize() {
        this.loadConfiguration();
        this.setupEventListeners();
        this.initializeMetrics();
    },

    loadConfiguration() {
        fetch('/api/config')  // Changed from /api/v1/config to /api/config
            .then(response => {
                if (!response.ok) throw new Error('Failed to load configuration');
                return response.json();
            })
            .then(config => {
                this.updateUI(config);
            })
            .catch(error => {
                console.error('Error loading configuration:', error);
                document.getElementById('status-message').textContent = 'Configuration load failed';
                document.getElementById('status-message').className = 'status-error';
            });
    },

    initializeMetrics() {
        console.log('Initializing metrics...');
        // Request initial metrics
        socket.emit('get_metrics');
        
        // Expand all sections
        requestAnimationFrame(() => {
            ['summary-content', 'llm-content', 'network-content', 'system-content', 'logs-content'].forEach(id => {
                const section = document.getElementById(id);
                if (section) {
                    console.log('Expanding section:', id);
                    section.classList.add('expanded');
                } else {
                    console.warn('Section not found:', id);
                }
            });
        });
    },

    updateUI(config) {
        // Update UI with configuration
        if (config.server) {
            document.getElementById('server-port').value = config.server.port;
            document.getElementById('server-host').value = config.server.host;
            // ...other server config updates
        }
    },

    setupEventListeners() {
        // Socket event listeners
        socket.on('metrics_update', (data) => {
            console.log('Received metrics update:', data);
            try {
                if (data.llm) updateLLMMetrics(data.llm);
                if (data.network) updateNetworkMetrics(data.network);
                if (data.system) updateSystemMetrics(data.system);
                // Also update summary with all data available
                updateSummaryMetrics(data);
            } catch (error) {
                console.error('Error updating metrics:', error);
            }
        });

        // Existing click handlers...
    },

    updateMetrics(data) {
        if (data.llm) this.updateLLMMetrics(data.llm);
        if (data.network) this.updateNetworkMetrics(data.network);
        if (data.system) this.updateSystemMetrics(data.system);
    },

    // Existing metric update methods...
  };

  // Initialize when document is ready
  document.addEventListener('DOMContentLoaded', () => {
    dashboard.initialize();
    
    // Initialize tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            if (tabId) {
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('active');
                });
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                const targetTab = document.getElementById(`${tabId}-tab`);
                if (targetTab) {
                    targetTab.classList.add('active');
                    button.classList.add('active');
                }
            }
        });
    });
  });

  // Make functions available globally for HTML onclick handlers
  window.toggleSection = (id) => {
    const content = document.getElementById(id);
    content.classList.toggle('expanded');
  };

  function setupTabs() {
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons and panes
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Activate corresponding tab pane
        const tabId = `${button.dataset.tab}-tab`;
        document.getElementById(tabId).classList.add('active');
      });
    });
  }
  
  function setupEventListeners() {
    // Save all button
    saveAllBtn.addEventListener('click', saveAllConfig);
    
    // Restore defaults button
    restoreBtn.addEventListener('click', restoreDefaults);
  }

  function loadConfiguration() {
    showStatus('Loading configuration...', 'info');
    
    // Get server configuration
    fetch('/api/v1/config')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load configuration');
        }
        return response.json();
      })
      .then(config => {
        currentConfig = config;
        showStatus('Configuration loaded successfully', 'success');
      })
      .catch(error => {
        console.error('Error loading configuration:', error);
        showStatus('Failed to load configuration', 'error');
      });
  }

  function saveAllConfig() {
    showStatus('This functionality is not yet implemented', 'info');
  }

  function restoreDefaults() {
    showStatus('This functionality is not yet implemented', 'info');
  }

  // Utility functions
  function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-${type}`;
    
    // Fix the comparison operator
    if (type === 'success' || type === 'error') {
      setTimeout(() => {
        statusMessage.textContent = '';
        statusMessage.className = '';
      }, 5000);
    }
  }
  
  function markAsChanged() {
    configChanged = true;
    updateSaveIndicator();
  }
  
  function updateSaveIndicator() {
    saveIndicator.textContent = configChanged ? 'Changes not saved' : '';
    saveIndicator.className = configChanged ? 'status-error' : '';
  }

  // Format utilities
  function formatNumber(num) {
      return new Intl.NumberFormat().format(num);
  }

  function formatBytes(bytes) {
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log2(bytes) / 10);
      return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  // Section toggle functionality
  function toggleSection(id) {
      const content = document.getElementById(id);
      content.classList.toggle('expanded');
  }

  // Metrics update handlers
  function updateSummaryMetrics(data) {
    const summaryEl = document.getElementById('summary-metrics');
    if (!summaryEl) return;

    summaryEl.innerHTML = `
        <div class="metric-item">
            <div class="metric-label">LLM Processing</div>
            <div class="metric-value">${data.llm.tokensPerSecond} tokens/s</div>
        </div>
        <div class="metric-item">
            <div class="metric-label">Active Connections</div>
            <div class="metric-value">${data.network.summary.connectionsActive}</div>
        </div>
        <div class="metric-item">
            <div class="metric-label">System Load</div>
            <div class="metric-value">${data.system.cpu.toFixed(1)}%</div>
        </div>
    `;
}

function updateLLMMetrics(data) {
    const llmEl = document.getElementById('llm-metrics');
    if (!llmEl) return;

    const modelMetrics = Object.entries(data.models || {})
        .map(([model, stats]) => `
            <div class="metric-item">
                <div class="metric-label">${model}</div>
                <div class="metric-value">
                    ${stats.totalTokens.toLocaleString()} tokens
                    <span class="metric-secondary">($${stats.totalCost.toFixed(2)})</span>
                </div>
            </div>
        `).join('');

    llmEl.innerHTML = modelMetrics;
}

function updateNetworkMetrics(data) {
    const networkEl = document.getElementById('network-metrics');
    if (!networkEl) return;

    networkEl.innerHTML = `
        <div class="metric-item">
            <div class="metric-label">Requests/Second</div>
            <div class="metric-value">${data.summary.requestsPerSecond}</div>
        </div>
        <div class="metric-item">
            <div class="metric-label">Average Latency</div>
            <div class="metric-value">${data.summary.averageLatency.toFixed(1)} ms</div>
        </div>
        <div class="metric-item">
            <div class="metric-label">Active Connections</div>
            <div class="metric-value">
                HTTP: ${data.detailed.connections.http}
                WS: ${data.detailed.connections.websocket}
            </div>
        </div>
    `;
}

function updateSystemMetrics(data) {
    const systemEl = document.getElementById('system-metrics');
    if (!systemEl) return;

    const memoryUsed = (data.memory.used / data.memory.total * 100).toFixed(1);
    
    systemEl.innerHTML = `
        <div class="metric-item">
            <div class="metric-label">CPU Usage</div>
            <div class="metric-value">${data.cpu.toFixed(1)}%</div>
        </div>
        <div class="metric-item">
            <div class="metric-label">Memory Usage</div>
            <div class="metric-value">${memoryUsed}%</div>
        </div>
        <div class="metric-item">
            <div class="metric-label">Uptime</div>
            <div class="metric-value">${Math.floor(data.uptime / 3600)}h ${Math.floor((data.uptime % 3600) / 60)}m</div>
        </div>
    `;
}

// Handle metrics updates
socket.on('metrics_update', (data) => {
    console.log('Received metrics update:', data); // Add debugging
    updateSummaryMetrics(data);
    updateLLMMetrics(data.llm);
    updateNetworkMetrics(data.network);
    updateSystemMetrics(data.system);
});

// Toggle section visibility
function toggleSection(contentId) {
    const content = document.getElementById(contentId);
    content.classList.toggle('expanded');
    const arrow = content.parentElement.querySelector('.arrow');
    arrow.style.transform = content.classList.contains('expanded') ? 'rotate(180deg)' : '';
}

// Update metrics display
function updateMetrics(containerId, metrics) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '';
    for (const [key, value] of Object.entries(metrics)) {
        html += `
            <div class="metric-item">
                <div class="metric-label">${key}</div>
                <div class="metric-value">${value}</div>
            </div>
        `;
    }
    container.innerHTML = html;
}

// Socket event listeners for metrics
socket.on('summary-metrics', (data) => {
    updateMetrics('summary-metrics', data);
});

socket.on('llm-metrics', (data) => {
    updateMetrics('llm-metrics', data);
});

socket.on('network-metrics', (data) => {
    updateMetrics('network-metrics', data);
});

socket.on('system-metrics', (data) => {
    updateMetrics('system-metrics', data);
});

// Initialize all metric sections as expanded on page load
document.addEventListener('DOMContentLoaded', () => {
    const sections = ['summary-content', 'llm-content', 'network-content', 'system-content', 'logs-content'];
    sections.forEach(section => {
        document.getElementById(section).classList.add('expanded');
    });
});

})();
