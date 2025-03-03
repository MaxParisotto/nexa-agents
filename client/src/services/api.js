import axios from 'axios';
import { API_ROUTES } from '../../shared/constants';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging or authentication
api.interceptors.request.use(
  (config) => {
    // You can add auth headers here
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response || error);
    return Promise.reject(error);
  }
);

// API service methods
export const apiService = {
  // System
  getStatus: () => api.get(API_ROUTES.STATUS),
  
  // Metrics
  getSystemMetrics: () => api.get(API_ROUTES.SYSTEM_METRICS),
  
  // Agents
  getAgents: () => api.get(API_ROUTES.AGENTS),
  getAgent: (id) => api.get(`${API_ROUTES.AGENTS}/${id}`),
  createAgent: (agent) => api.post(API_ROUTES.AGENTS, agent),
  updateAgent: (id, agent) => api.put(`${API_ROUTES.AGENTS}/${id}`, agent),
  deleteAgent: (id) => api.delete(`${API_ROUTES.AGENTS}/${id}`),
  
  // Workflows
  getWorkflows: () => api.get(API_ROUTES.WORKFLOWS),
  getWorkflow: (id) => api.get(`${API_ROUTES.WORKFLOWS}/${id}`),
  createWorkflow: (workflow) => api.post(API_ROUTES.WORKFLOWS, workflow),
  updateWorkflow: (id, workflow) => api.put(`${API_ROUTES.WORKFLOWS}/${id}`, workflow),
  deleteWorkflow: (id) => api.delete(`${API_ROUTES.WORKFLOWS}/${id}`),
  
  // Settings
  getSettings: () => api.get(API_ROUTES.SETTINGS),
  updateSettings: (settings) => api.put(API_ROUTES.SETTINGS, settings),
};

export default apiService;
