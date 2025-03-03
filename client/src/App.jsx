import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [metrics, setMetrics] = useState(null);
  const [status, setStatus] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Function to fetch metrics
    async function fetchData() {
      try {
        setLoading(true);
        
        // Get server status
        const statusRes = await fetch('/api/status');
        const statusData = await statusRes.json();
        setStatus(statusData);
        
        // Get system metrics
        const metricsRes = await fetch('/api/metrics/system');
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
        
        // Get workflows
        const workflowsRes = await fetch('/api/workflows');
        const workflowsData = await workflowsRes.json();
        setWorkflows(workflowsData);
        
        setError(null);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(`Failed to fetch data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Nexa Agents Dashboard</h1>
        
        {status && (
          <div className="status-banner">
            <div className="status">
              API Status: <span className="status-ok">✓ Connected</span>
            </div>
            <div className="version">
              Version: {status.version}
            </div>
          </div>
        )}
      </header>
      
      <main className="App-content">
        {loading && <div className="loading">Loading data...</div>}
        
        {error && (
          <div className="error-message">
            <h2>Error</h2>
            <p>{error}</p>
          </div>
        )}
        
        {metrics && !loading && (
          <div className="metrics-panel">
            <h2>System Metrics</h2>
            <div className="metrics-grid">
              <div className="metric">
                <h3>CPU Usage</h3>
                <div className="metric-value">{metrics.cpu_usage.toFixed(2)}%</div>
              </div>
              
              <div className="metric">
                <h3>Memory</h3>
                <div className="metric-value">
                  {Math.round(metrics.memory_used / (1024 * 1024))} MB / 
                  {Math.round(metrics.memory_total / (1024 * 1024))} MB
                </div>
              </div>
              
              <div className="metric">
                <h3>Uptime</h3>
                <div className="metric-value">{Math.floor(metrics.uptime / 3600)} hours</div>
              </div>
              
              <div className="metric">
                <h3>Processes</h3>
                <div className="metric-value">{metrics.processes || 'N/A'}</div>
              </div>
            </div>
          </div>
        )}
        
        {workflows.length > 0 && !loading && (
          <div className="workflows-panel">
            <h2>Active Workflows</h2>
            <div className="workflows-list">
              {workflows.map(workflow => (
                <div key={workflow.id} className="workflow-card">
                  <h3>{workflow.name}</h3>
                  <div className="workflow-status">
                    Status: <span className={`status-${workflow.status}`}>{workflow.status}</span>
                  </div>
                  <div className="workflow-date">
                    Created: {new Date(workflow.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      
      <footer className="App-footer">
        <p>Nexa Agents System v1.0</p>
      </footer>
    </div>
  );
}

export default App;
