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
})();
