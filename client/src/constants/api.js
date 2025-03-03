/**
 * API route constants
 */

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// API Routes
export const API_ROUTES = {
  // Auth
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  REGISTER: '/api/auth/register',
  PROFILE: '/api/auth/profile',
  
  // Workflows
  WORKFLOWS: '/api/workflows',
  WORKFLOW_BY_ID: (id) => `/api/workflows/${id}`,
  WORKFLOW_STEPS: (workflowId) => `/api/workflows/${workflowId}/steps`,
  WORKFLOW_STEP: (workflowId, stepId) => `/api/workflows/${workflowId}/steps/${stepId}`,
  WORKFLOW_RUN: (workflowId) => `/api/workflows/${workflowId}/run`,
  WORKFLOW_STOP: (workflowId) => `/api/workflows/${workflowId}/stop`,
  
  // Agents
  AGENTS: '/api/agents',
  AGENT_BY_ID: (id) => `/api/agents/${id}`,
  AGENT_TASKS: (agentId) => `/api/agents/${agentId}/tasks`,
  
  // System
  STATUS: '/api/system/status',
  METRICS_SYSTEM: '/api/metrics/system',
  METRICS_HISTORY: '/api/metrics/history',
  LOGS: '/api/system/logs',
  
  // Settings
  SETTINGS: '/api/settings',
  SETTINGS_RESET: '/api/settings/reset',
  
  // LLM
  BENCHMARK: '/api/llm/benchmark',
  MODELS: '/api/llm/models',
  
  // Integrations
  INTEGRATIONS: '/api/integrations',
  INTEGRATION_CONFIG: (type) => `/api/integrations/${type}/config`,
  INTEGRATION_TEST: (type) => `/api/integrations/${type}/test`,
  GPT_UPLINK: '/api/integrations/gpt-uplink',
  
  // Files & Storage
  FILES: '/api/files',
  FILE_BY_ID: (id) => `/api/files/${id}`,
  UPLOAD: '/api/files/upload',
};

/**
 * WebSocket event types
 */
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  AGENT_STATUS: 'agent_status',
  AGENT_REGISTERED: 'agent_registered',
  TASK_ASSIGNED: 'task_assigned',
  TASK_UPDATED: 'task_updated',
  WORKFLOW_UPDATE: 'workflow_update',
  METRICS_UPDATE: 'metrics_update',
  SYSTEM_ALERT: 'system_alert'
};
