import axios from 'axios';
import { API_ROUTES, HTTP_STATUS } from '../../../shared/constants/api';

// Create an axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to handle authentication
apiClient.interceptors.request.use(
  config => {
    // Get auth token from localStorage or elsewhere
    const token = localStorage.getItem('authToken');
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  error => Promise.reject(error)
);

// Add a response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Handle specific error responses
    if (error.response) {
      const { status } = error.response;
      
      // Handle authentication errors
      if (status === HTTP_STATUS.UNAUTHORIZED) {
        // Redirect to login page or clear auth tokens
        console.warn('Session expired or unauthorized. Redirecting to login...');
        // Example: window.location.href = '/login';
      }
      
      // Handle server errors
      if (status >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
        console.error('Server error:', error.response.data);
      }
    }
    
    return Promise.reject(error);
  }
);

// API Service with methods for different endpoints
export const apiService = {
  // Workflows
  getWorkflows: () => apiClient.get(API_ROUTES.WORKFLOWS),
  getWorkflow: (id) => apiClient.get(API_ROUTES.WORKFLOW_BY_ID(id)),
  createWorkflow: (workflow) => apiClient.post(API_ROUTES.WORKFLOWS, workflow),
  updateWorkflow: (id, updates) => apiClient.put(API_ROUTES.WORKFLOW_BY_ID(id), updates),
  deleteWorkflow: (id) => apiClient.delete(API_ROUTES.WORKFLOW_BY_ID(id)),
  
  // Workflow Steps
  getWorkflowSteps: (workflowId) => apiClient.get(API_ROUTES.WORKFLOW_STEPS(workflowId)),
  createWorkflowStep: (workflowId, step) => apiClient.post(API_ROUTES.WORKFLOW_STEPS(workflowId), step),
  updateWorkflowStep: (workflowId, stepId, updates) => 
    apiClient.put(API_ROUTES.WORKFLOW_STEP(workflowId, stepId), updates),
  deleteWorkflowStep: (workflowId, stepId) => apiClient.delete(API_ROUTES.WORKFLOW_STEP(workflowId, stepId)),
  
  // Agents
  getAgents: () => apiClient.get(API_ROUTES.AGENTS),
  getAgent: (id) => apiClient.get(API_ROUTES.AGENT_BY_ID(id)),
  createAgent: (agent) => apiClient.post(API_ROUTES.AGENTS, agent),
  updateAgent: (id, updates) => apiClient.put(API_ROUTES.AGENT_BY_ID(id), updates),
  deleteAgent: (id) => apiClient.delete(API_ROUTES.AGENT_BY_ID(id)),
  
  // System
  getSystemStatus: () => apiClient.get(API_ROUTES.STATUS),
  getSystemMetrics: () => apiClient.get(API_ROUTES.METRICS_SYSTEM),
  getHistoricalMetrics: (days = 1) => 
    apiClient.get(`${API_ROUTES.METRICS_HISTORY}?days=${days}`),
  
  // Settings
  getSettings: () => apiClient.get(API_ROUTES.SETTINGS),
  updateSettings: (settings) => apiClient.put(API_ROUTES.SETTINGS, settings),
  resetSettings: () => apiClient.post(API_ROUTES.SETTINGS_RESET),
};

export default apiClient;
