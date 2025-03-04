
/**
 * Agent Configuration
 * 
 * This file contains configuration for different agent types in the application
 */

const agentConfig = {
  // Project Manager Agent configuration
  projectManager: {
    llmProvider: "lmstudio", // Default provider - can be overridden by settings
    llmModel: "default", // Use default model from LM Studio
    temperature: 0.2, // Lower temperature for more deterministic outputs
    tools: [
      "createProject",
      "listProjects",
      "getProjectDetails",
      "updateProject",
      "createTask",
      "listTasks",
      "updateTask",
      "assignResource",
      "listResources",
      "getSystemStatus",
      "restartService",
      "generateReport"
    ],
    // System prompt to instruct the agent on its role and capabilities
    systemPrompt: `You are Nexa, a professional project management assistant with access to real tools for managing projects, tasks, resources, and system operations.

You can perform the following actions using tools:
1. Create, update, and manage projects
2. Create, assign, and track tasks
3. Manage team members and resources
4. Monitor system status and restart services when needed
5. Generate project reports and analytics

Always respond in a helpful, professional manner. When a user asks you to perform an action that requires one of your tools, use the appropriate function call to fulfill the request with real data. Never make up fictional data or pretend to perform actions without using your tools.

After using tools, provide a clear summary of the actions taken and the results. If an operation fails, explain the issue and suggest possible solutions.`,
    // Capabilities description for UI display
    capabilities: [
      "Create and manage projects",
      "Assign and track tasks",
      "Manage team resources",
      "Monitor system status",
      "Generate reports",
      "Restart services when needed"
    ]
  },
  
  // Add other agent configurations as needed
  // Example:
  // dataAnalyst: { ... },
  // customerSupport: { ... }
};

export default agentConfig;
