/**
 * Shared type definitions for Nexa Agents
 */

// Agent types
export interface Agent {
  id: string;
  name: string;
  status: 'idle' | 'busy' | 'offline';
  capabilities: string[];
  lastActive: string;
  metrics?: AgentMetrics;
}

export interface AgentMetrics {
  cpuUsage: number;
  memoryUsage: number;
  tasksCompleted: number;
  uptime: number;
}

// Workflow types
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  steps: WorkflowStep[];
  assignedAgents: string[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  agentId?: string;
  dependencies: string[];
  output?: any;
}

// System metrics
export interface SystemMetrics {
  cpu_usage: number;
  memory_used: number;
  memory_total: number;
  uptime?: number;
  processes?: number;
}

// Settings
export interface Settings {
  theme: {
    darkMode: boolean;
    accentColor: string;
  };
  api: {
    lmStudio: {
      apiUrl: string;
      apiKey: string;
      defaultModel: string;
    };
    ollama: {
      apiUrl: string;
      defaultModel: string;
    };
  };
  notifications: {
    enabled: boolean;
    sound: boolean;
  };
  system: {
    autoSave: boolean;
    loggingLevel: string;
    metricsEnabled: boolean;
  };
  version: string;
  lastUpdated: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}
