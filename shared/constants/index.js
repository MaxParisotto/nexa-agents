/**
 * Shared constants between client and server
 */

export const API_ROUTES = {
  STATUS: '/api/status',
  METRICS: '/api/metrics',
  SYSTEM_METRICS: '/api/metrics/system',
  AGENTS: '/api/agents',
  WORKFLOWS: '/api/workflows',
  SETTINGS: '/api/settings',
};

export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  AGENT_STATUS: 'agent_status',
  TASK_UPDATE: 'task_update',
  WORKFLOW_UPDATE: 'workflow_update',
  METRICS_UPDATE: 'metrics_update',
};

export const STATUS = {
  IDLE: 'idle',
  BUSY: 'busy',
  OFFLINE: 'offline',
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DRAFT: 'draft',
  ACTIVE: 'active',
};

export const ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SERVER_ERROR: 'SERVER_ERROR',
};
