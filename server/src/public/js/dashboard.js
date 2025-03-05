(function() {
  'use strict';

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
  
  // Initialize
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    // Setup tab navigation
    setupTabs();
    
    // Load initial configuration
    loadConfiguration();
    
    // Setup event listeners
    setupEventListeners();
  }

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
    
    // Clear status after a delay if it's a success or error
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

  // Initialize socket connection
  const socket = io();

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
      document.getElementById('summary-metrics').innerHTML = `
          <div class="metric-value">${formatNumber(data.llm.tokensPerSecond)}</div>
          <div class="metric-label">Tokens/Second</div>
          <table>
              <tr><td>Total Requests</td><td>${formatNumber(data.llm.requestCount)}</td></tr>
              <tr><td>Active Connections</td><td>${data.network.summary.connectionsActive}</td></tr>
              <tr><td>System Load</td><td>${data.system.cpu.toFixed(2)}%</td></tr>
          </table>
      `;
  }

  function updateLLMMetrics(data) {
      document.getElementById('llm-metrics').innerHTML = `
          <table>
              <tr>
                  <th>Model</th>
                  <th>Usage</th>
                  <th>Cost</th>
                  <th>Status</th>
              </tr>
              ${Object.entries(data.llm.models).map(([model, stats]) => `
                  <tr>
                      <td>${model}</td>
                      <td>${formatNumber(stats.totalTokens)} tokens</td>
                      <td>$${stats.totalCost.toFixed(4)}</td>
                      <td class="${stats.errors > 0 ? 'error' : 'success'}">
                          ${stats.errors > 0 ? 'Error' : 'OK'}
                      </td>
                  </tr>
              `).join('')}
          </table>
      `;
  }

  function updateNetworkMetrics(data) {
      document.getElementById('network-metrics').innerHTML = `
          <div class="metric-value">${formatNumber(data.network.summary.requestsPerSecond)}</div>
          <div class="metric-label">Requests/Second</div>
          <table>
              <tr><td>Data In</td><td>${formatBytes(data.network.socketio.bytesReceived)}/s</td></tr>
              <tr><td>Data Out</td><td>${formatBytes(data.network.socketio.bytesSent)}/s</td></tr>
              <tr><td>Latency</td><td>${data.network.summary.averageLatency.toFixed(2)}ms</td></tr>
          </table>
      `;
  }

  function updateSystemMetrics(data) {
      document.getElementById('system-metrics').innerHTML = `
          <table>
              <tr><td>CPU Usage</td><td>${data.system.cpu.toFixed(2)}%</td></tr>
              <tr><td>Memory</td><td>${formatBytes(data.system.memory.used)} / ${formatBytes(data.system.memory.total)}</td></tr>
              <tr><td>Uptime</td><td>${Math.floor(data.system.uptime / 3600)} hours</td></tr>
          </table>
      `;
  }

  // Handle metrics updates
  socket.on('metrics_update', (data) => {
      updateSummaryMetrics(data);
      updateLLMMetrics(data);
      updateNetworkMetrics(data);
      updateSystemMetrics(data);
  });

  // Initialize metrics and expand summary section
  socket.emit('get_metrics');
  document.getElementById('summary').classList.add('expanded');

  // Initialize tab functionality
  document.addEventListener('DOMContentLoaded', () => {
      const tabButtons = document.querySelectorAll('.tab-btn');
      tabButtons.forEach(button => {
          button.addEventListener('click', () => {
              const tabId = button.getAttribute('data-tab');
              document.querySelectorAll('.tab-pane').forEach(pane => {
                  pane.classList.remove('active');
              });
              document.querySelectorAll('.tab-btn').forEach(btn => {
                  btn.classList.remove('active');
              });
              document.getElementById(`${tabId}-tab`).classList.add('active');
              button.classList.add('active');
          });
      });
  });
})();
