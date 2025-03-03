/**
 * Type definitions shared between client and server
 */

/**
 * @typedef {Object} Workflow
 * @property {string} id - Unique identifier for the workflow
 * @property {string} name - Workflow name
 * @property {string} [description] - Optional workflow description
 * @property {string} status - Workflow status (draft, active, completed, failed)
 * @property {string} createdAt - ISO date string when workflow was created
 * @property {string} [updatedAt] - ISO date string when workflow was last updated
 * @property {WorkflowStep[]} [steps] - Array of workflow steps
 */

/**
 * @typedef {Object} WorkflowStep
 * @property {string} id - Unique identifier for the step
 * @property {string} name - Step name
 * @property {string} [description] - Optional step description
 * @property {string} status - Step status (pending, in_progress, completed, failed)
 * @property {string} [agentId] - ID of agent assigned to this step
 * @property {string[]} [dependencies] - Array of step IDs this step depends on
 * @property {Object} [input] - Input data for this step
 * @property {Object} [output] - Output data produced by this step
 * @property {string} [startedAt] - ISO date when step was started
 * @property {string} [completedAt] - ISO date when step was completed
 */

/**
 * @typedef {Object} Agent
 * @property {string} id - Unique identifier for the agent
 * @property {string} name - Agent name
 * @property {string} [description] - Optional agent description
 * @property {string} status - Agent status (idle, busy, offline)
 * @property {string[]} [capabilities] - Array of capabilities the agent has
 * @property {string} [model] - ID of the model used by this agent
 * @property {Object} [config] - Agent configuration
 */

/**
 * @typedef {Object} SystemMetrics
 * @property {number} cpu_usage - CPU usage percentage
 * @property {number} memory_used - Memory used in bytes
 * @property {number} memory_total - Total memory in bytes
 * @property {number} uptime - System uptime in seconds
 * @property {number} processes - Number of running processes
 * @property {number} timestamp - Unix timestamp in seconds
 */

/**
 * @typedef {Object} Settings
 * @property {ThemeSettings} theme - UI theme settings
 * @property {ApiSettings} api - API connection settings
 * @property {NotificationSettings} notifications - Notification settings
 * @property {SystemSettings} system - System configuration settings
 * @property {string} version - Settings schema version
 */

/**
 * @typedef {Object} ThemeSettings
 * @property {boolean} darkMode - Whether dark mode is enabled
 * @property {string} accentColor - Accent color hex code
 */

/**
 * @typedef {Object} ApiSettings
 * @property {Object} lmStudio - LM Studio API settings
 * @property {Object} ollama - Ollama API settings
 */

/**
 * @typedef {Object} NotificationSettings
 * @property {boolean} enabled - Whether notifications are enabled
 * @property {boolean} sound - Whether notification sounds are enabled
 */

/**
 * @typedef {Object} SystemSettings
 * @property {boolean} autoSave - Whether to auto-save workflows
 * @property {string} loggingLevel - Logging level (debug, info, warn, error)
 * @property {boolean} metricsEnabled - Whether metrics collection is enabled
 */

// In a TypeScript environment, we would use export type declarations
// For JavaScript with JSDoc, we are just defining the types above
module.exports = {}; // Export an empty object as this file only contains type definitions
