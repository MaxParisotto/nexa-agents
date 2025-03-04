
/**
 * Project Manager Agent Tools
 * 
 * This module provides the function calling and tool use capabilities for the 
 * project manager agent. It includes real production tools for managing projects,
 * tasks, resources, and application operations.
 */

import { apiService } from "../services/api";

/**
 * Project Manager Tools Service
 * Provides tools for project management functions via function calling
 */
class ProjectManagerTools {
  constructor() {
    this.toolRegistry = {};
    this.registerTools();
  }

  /**
   * Register all available tools with their function specifications
   */
  registerTools() {
    // Project Management Tools
    this.registerTool("createProject", {
      name: "createProject",
      description: "Creates a new project",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the project"
          },
          description: {
            type: "string",
            description: "Description of the project"
          },
          deadline: {
            type: "string",
            description: "Project deadline in ISO date format (YYYY-MM-DD)"
          }
        },
        required: ["name"]
      },
      handler: this.createProject.bind(this)
    });

    this.registerTool("listProjects", {
      name: "listProjects",
      description: "Lists all available projects",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["all", "active", "completed", "canceled"],
            description: "Filter projects by status"
          },
          limit: {
            type: "integer",
            description: "Maximum number of projects to return"
          }
        }
      },
      handler: this.listProjects.bind(this)
    });

    this.registerTool("getProjectDetails", {
      name: "getProjectDetails",
      description: "Gets detailed information about a specific project",
      parameters: {
        type: "object",
        properties: {
          projectId: {
            type: "string",
            description: "ID of the project"
          }
        },
        required: ["projectId"]
      },
      handler: this.getProjectDetails.bind(this)
    });

    this.registerTool("updateProject", {
      name: "updateProject",
      description: "Updates project information",
      parameters: {
        type: "object",
        properties: {
          projectId: {
            type: "string",
            description: "ID of the project to update"
          },
          name: {
            type: "string",
            description: "New name for the project"
          },
          description: {
            type: "string",
            description: "New description for the project"
          },
          status: {
            type: "string",
            enum: ["active", "completed", "canceled"],
            description: "New status for the project"
          },
          deadline: {
            type: "string",
            description: "New project deadline in ISO date format (YYYY-MM-DD)"
          }
        },
        required: ["projectId"]
      },
      handler: this.updateProject.bind(this)
    });

    // Task Management Tools
    this.registerTool("createTask", {
      name: "createTask",
      description: "Creates a new task in a project",
      parameters: {
        type: "object",
        properties: {
          projectId: {
            type: "string",
            description: "ID of the project"
          },
          title: {
            type: "string",
            description: "Title of the task"
          },
          description: {
            type: "string",
            description: "Description of the task"
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            description: "Priority level of the task"
          },
          dueDate: {
            type: "string",
            description: "Due date in ISO date format (YYYY-MM-DD)"
          },
          assignee: {
            type: "string",
            description: "User ID of the assignee"
          }
        },
        required: ["projectId", "title"]
      },
      handler: this.createTask.bind(this)
    });

    this.registerTool("listTasks", {
      name: "listTasks",
      description: "Lists tasks for a specific project",
      parameters: {
        type: "object",
        properties: {
          projectId: {
            type: "string",
            description: "ID of the project"
          },
          status: {
            type: "string",
            enum: ["all", "pending", "in-progress", "completed"],
            description: "Filter tasks by status"
          },
          assignee: {
            type: "string",
            description: "Filter tasks by assignee user ID"
          }
        },
        required: ["projectId"]
      },
      handler: this.listTasks.bind(this)
    });

    this.registerTool("updateTask", {
      name: "updateTask",
      description: "Updates task information",
      parameters: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task to update"
          },
          title: {
            type: "string",
            description: "New title for the task"
          },
          description: {
            type: "string",
            description: "New description for the task"
          },
          status: {
            type: "string",
            enum: ["pending", "in-progress", "completed"],
            description: "New status for the task"
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            description: "New priority level"
          },
          dueDate: {
            type: "string",
            description: "New due date in ISO date format (YYYY-MM-DD)"
          },
          assignee: {
            type: "string",
            description: "New user ID of the assignee"
          }
        },
        required: ["taskId"]
      },
      handler: this.updateTask.bind(this)
    });

    // Resource Management Tools
    this.registerTool("assignResource", {
      name: "assignResource",
      description: "Assigns a resource (person or material) to a project",
      parameters: {
        type: "object",
        properties: {
          projectId: {
            type: "string",
            description: "ID of the project"
          },
          resourceId: {
            type: "string",
            description: "ID of the resource (user ID for personnel)"
          },
          role: {
            type: "string",
            description: "Role of the resource in the project"
          },
          allocation: {
            type: "number",
            description: "Percentage of time allocated to the project (for personnel)"
          }
        },
        required: ["projectId", "resourceId"]
      },
      handler: this.assignResource.bind(this)
    });

    this.registerTool("listResources", {
      name: "listResources",
      description: "Lists all available resources",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["all", "personnel", "material"],
            description: "Type of resources to list"
          },
          availability: {
            type: "boolean",
            description: "Filter by currently available resources"
          }
        }
      },
      handler: this.listResources.bind(this)
    });

    // Application Management Tools
    this.registerTool("getSystemStatus", {
      name: "getSystemStatus",
      description: "Gets the current system status",
      parameters: {
        type: "object",
        properties: {
          components: {
            type: "array",
            items: {
              type: "string",
              enum: ["all", "database", "api", "frontend", "agents"]
            },
            description: "Components to check status for"
          }
        }
      },
      handler: this.getSystemStatus.bind(this)
    });

    this.registerTool("restartService", {
      name: "restartService",
      description: "Restarts a specific system service",
      parameters: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: ["api", "database", "agent-service", "frontend"],
            description: "Service to restart"
          },
          force: {
            type: "boolean",
            description: "Force restart even if there are active connections"
          }
        },
        required: ["service"]
      },
      handler: this.restartService.bind(this)
    });
    
    // Analytics and Reporting Tools
    this.registerTool("generateReport", {
      name: "generateReport",
      description: "Generates a project report",
      parameters: {
        type: "object",
        properties: {
          projectId: {
            type: "string",
            description: "ID of the project (optional, if not provided will generate organization report)"
          },
          reportType: {
            type: "string",
            enum: ["progress", "resources", "timeline", "budget", "comprehensive"],
            description: "Type of report to generate"
          },
          format: {
            type: "string",
            enum: ["pdf", "csv", "json"],
            description: "Format of the report output"
          },
          dateRange: {
            type: "object",
            properties: {
              startDate: {
                type: "string",
                description: "Start date in ISO format (YYYY-MM-DD)"
              },
              endDate: {
                type: "string",
                description: "End date in ISO format (YYYY-MM-DD)"
              }
            }
          }
        },
        required: ["reportType"]
      },
      handler: this.generateReport.bind(this)
    });
  }

  /**
   * Register a single tool with its schema and handler
   */
  registerTool(name, toolSpec) {
    this.toolRegistry[name] = toolSpec;
  }

  /**
   * Get all tool specifications for the function calling API
   */
  getAllToolSpecifications() {
    return Object.values(this.toolRegistry).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }

  /**
   * Execute a tool by name with given parameters
   */
  async executeTool(toolName, params) {
    const tool = this.toolRegistry[toolName];
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found`);
    }

    return await tool.handler(params);
  }

  /**
   * Parse and execute function calls from LLM response
   * @param {Object} functionCall - Function call object from LLM
   * @returns {Promise<Object>} - Result of the function execution
   */
  async handleFunctionCall(functionCall) {
    try {
      const { name, arguments: argsString } = functionCall;
      const args = JSON.parse(argsString);

      return await this.executeTool(name, args);
    } catch (error) {
      console.error("Error executing function call:", error);
      return {
        error: true,
        message: error.message
      };
    }
  }

  /**
   * Process a batch of function calls
   * @param {Array} functionCalls - Array of function calls from LLM
   * @returns {Promise<Object>} - Results of all function executions
   */
  async processFunctionCalls(functionCalls) {
    const results = {};
    
    for (const call of functionCalls) {
      results[call.name] = await this.handleFunctionCall(call);
    }
    
    return results;
  }

  // Tool implementation: Project Management

  /**
   * Create a new project
   * @param {Object} params - Project parameters
   * @returns {Promise<Object>} - Created project data
   */
  async createProject(params) {
    try {
      const response = await apiService.post('/projects', params);
      return {
        success: true,
        project: response.data
      };
    } catch (error) {
      console.error("Error creating project:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * List projects with optional filters
   * @param {Object} params - Filter parameters
   * @returns {Promise<Object>} - List of projects
   */
  async listProjects(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.status && params.status !== 'all') {
        queryParams.append('status', params.status);
      }
      
      if (params.limit) {
        queryParams.append('limit', params.limit);
      }
      
      const url = `/projects${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await apiService.get(url);
      
      return {
        success: true,
        projects: response.data
      };
    } catch (error) {
      console.error("Error listing projects:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Get project details
   * @param {Object} params - Parameters with projectId
   * @returns {Promise<Object>} - Project details
   */
  async getProjectDetails(params) {
    try {
      const response = await apiService.get(`/projects/${params.projectId}`);
      return {
        success: true,
        project: response.data
      };
    } catch (error) {
      console.error("Error getting project details:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Update project details
   * @param {Object} params - Project update parameters
   * @returns {Promise<Object>} - Updated project
   */
  async updateProject(params) {
    const { projectId, ...updateData } = params;
    
    try {
      const response = await apiService.put(`/projects/${projectId}`, updateData);
      return {
        success: true,
        project: response.data
      };
    } catch (error) {
      console.error("Error updating project:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Tool implementation: Task Management

  /**
   * Create a new task
   * @param {Object} params - Task parameters
   * @returns {Promise<Object>} - Created task
   */
  async createTask(params) {
    try {
      const response = await apiService.post(`/projects/${params.projectId}/tasks`, params);
      return {
        success: true,
        task: response.data
      };
    } catch (error) {
      console.error("Error creating task:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * List tasks for a project
   * @param {Object} params - Filter parameters
   * @returns {Promise<Object>} - List of tasks
   */
  async listTasks(params) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.status && params.status !== 'all') {
        queryParams.append('status', params.status);
      }
      
      if (params.assignee) {
        queryParams.append('assignee', params.assignee);
      }
      
      const url = `/projects/${params.projectId}/tasks${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await apiService.get(url);
      
      return {
        success: true,
        tasks: response.data
      };
    } catch (error) {
      console.error("Error listing tasks:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Update a task
   * @param {Object} params - Task update parameters
   * @returns {Promise<Object>} - Updated task
   */
  async updateTask(params) {
    const { taskId, ...updateData } = params;
    
    try {
      const response = await apiService.put(`/tasks/${taskId}`, updateData);
      return {
        success: true,
        task: response.data
      };
    } catch (error) {
      console.error("Error updating task:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Tool implementation: Resource Management

  /**
   * Assign a resource to a project
   * @param {Object} params - Resource assignment parameters
   * @returns {Promise<Object>} - Assignment result
   */
  async assignResource(params) {
    try {
      const response = await apiService.post(`/projects/${params.projectId}/resources`, {
        resourceId: params.resourceId,
        role: params.role,
        allocation: params.allocation
      });
      
      return {
        success: true,
        assignment: response.data
      };
    } catch (error) {
      console.error("Error assigning resource:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * List available resources
   * @param {Object} params - Filter parameters
   * @returns {Promise<Object>} - List of resources
   */
  async listResources(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.type && params.type !== 'all') {
        queryParams.append('type', params.type);
      }
      
      if (params.availability !== undefined) {
        queryParams.append('available', params.availability);
      }
      
      const url = `/resources${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await apiService.get(url);
      
      return {
        success: true,
        resources: response.data
      };
    } catch (error) {
      console.error("Error listing resources:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Tool implementation: Application Management

  /**
   * Get system status
   * @param {Object} params - Filter components
   * @returns {Promise<Object>} - System status data
   */
  async getSystemStatus(params = {}) {
    try {
      const components = params.components || ['all'];
      const queryParams = components.join(',');
      
      const url = `/system/status${queryParams !== 'all' ? '?components=' + queryParams : ''}`;
      const response = await apiService.get(url);
      
      return {
        success: true,
        status: response.data
      };
    } catch (error) {
      console.error("Error getting system status:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Restart a service
   * @param {Object} params - Restart parameters
   * @returns {Promise<Object>} - Restart result
   */
  async restartService(params) {
    try {
      const response = await apiService.post(`/system/services/${params.service}/restart`, {
        force: params.force || false
      });
      
      return {
        success: true,
        result: response.data
      };
    } catch (error) {
      console.error("Error restarting service:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Generate a project report
   * @param {Object} params - Report parameters
   * @returns {Promise<Object>} - Generated report or download link
   */
  async generateReport(params) {
    try {
      const endpoint = params.projectId ? 
        `/projects/${params.projectId}/reports` : 
        `/reports/organization`;
      
      const response = await apiService.post(endpoint, {
        reportType: params.reportType,
        format: params.format || 'pdf',
        dateRange: params.dateRange || {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }
      });
      
      return {
        success: true,
        report: response.data
      };
    } catch (error) {
      console.error("Error generating report:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}

// Create and export singleton instance
const projectManagerTools = new ProjectManagerTools();
export default projectManagerTools;
