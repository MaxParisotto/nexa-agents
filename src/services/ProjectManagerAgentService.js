
/**
 * Project Manager Agent Service
 * 
 * Connects the project manager agent to LLM services and provides
 * tool calling capabilities through integration with ProjectManagerTools.
 */
import { apiService } from "./api";
import projectManagerTools from "../utils/ProjectManagerTools";

class ProjectManagerAgentService {
  constructor() {
    this.conversationHistory = [];
    this.agentConfig = null;
  }

  /**
   * Initialize the project manager agent with configuration
   * @param {Object} config - Agent configuration
   */
  async initialize(config = null) {
    try {
      if (config) {
        this.agentConfig = config;
      } else {
        // Get default configuration from API
        const response = await apiService.get('/agents/project-manager/config');
        this.agentConfig = response.data;
      }
      
      return {
        success: true,
        message: "Project Manager Agent initialized successfully"
      };
    } catch (error) {
      console.error("Failed to initialize Project Manager Agent:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Send a message to the project manager agent
   * @param {string} message - User's message
   * @returns {Promise<Object>} - Agent's response
   */
  async sendMessage(message) {
    if (!this.agentConfig) {
      await this.initialize();
    }
    
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: "user",
        content: message
      });
      
      // Get all tool specifications for function calling
      const tools = projectManagerTools.getAllToolSpecifications();
      
      // Send message to the LLM provider with function calling enabled
      const response = await apiService.post('/llm/chat', {
        messages: this.conversationHistory,
        provider: this.agentConfig.llmProvider,
        model: this.agentConfig.llmModel,
        temperature: this.agentConfig.temperature || 0.2,
        tools: tools,
        tool_choice: "auto"
      });
      
      // Process the LLM response
      const llmResponse = response.data;
      
      // Handle function calls if present
      if (llmResponse.function_call || (llmResponse.tool_calls && llmResponse.tool_calls.length > 0)) {
        const toolCalls = llmResponse.tool_calls || [llmResponse.function_call];
        
        // Execute all tool calls
        const toolResults = await projectManagerTools.processFunctionCalls(toolCalls);
        
        // Add function call and result to conversation history
        this.conversationHistory.push({
          role: "assistant", 
          content: null,
          tool_calls: toolCalls.map((call, index) => ({
            id: call.id || `call_${index}`,
            type: "function",
            function: {
              name: call.name,
              arguments: call.arguments || call.function?.arguments
            }
          }))
        });
        
        // Add tool results to conversation history
        Object.entries(toolResults).forEach(([name, result]) => {
          this.conversationHistory.push({
            role: "tool",
            tool_call_id: toolCalls.find(call => call.name === name)?.id || `call_${name}`,
            name: name,
            content: JSON.stringify(result)
          });
        });
        
        // Get a followup response from the LLM to interpret the tool results
        const followupResponse = await apiService.post('/llm/chat', {
          messages: this.conversationHistory,
          provider: this.agentConfig.llmProvider,
          model: this.agentConfig.llmModel,
          temperature: this.agentConfig.temperature || 0.2
        });
        
        // Add response to history
        const finalResponse = followupResponse.data;
        this.conversationHistory.push({
          role: "assistant",
          content: finalResponse.content
        });
        
        return {
          content: finalResponse.content,
          toolResults: toolResults
        };
      } else {
        // Standard response (no function calling)
        this.conversationHistory.push({
          role: "assistant",
          content: llmResponse.content
        });
        
        return {
          content: llmResponse.content
        };
      }
    } catch (error) {
      console.error("Error communicating with Project Manager Agent:", error);
      return {
        error: true,
        message: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Get project overview with optimized presentation
   * @returns {Promise<Object>} - Dashboard data for project overview
   */
  async getProjectDashboard() {
    try {
      // This is a specialized function that combines multiple tools to create a dashboard
      const projects = await projectManagerTools.executeTool('listProjects', {
        status: 'active',
        limit: 5
      });

      // Only continue if projects were successfully fetched
      if (!projects.success) {
        throw new Error("Failed to fetch projects");
      }

      // Collect additional data for each project
      const projectsWithDetails = await Promise.all(
        projects.projects.slice(0, 5).map(async (project) => {
          // Get tasks for this project
          const tasksResult = await projectManagerTools.executeTool('listTasks', {
            projectId: project.id
          });

          // Get resources for this project if possible
          let resources = [];
          try {
            const resourcesResult = await apiService.get(`/projects/${project.id}/resources`);
            resources = resourcesResult.data;
          } catch (err) {
            console.log(`Could not fetch resources for project ${project.id}`);
          }

          return {
            ...project,
            tasks: tasksResult.success ? tasksResult.tasks : [],
            resources: resources,
            completion: this.calculateProjectCompletion(tasksResult.success ? tasksResult.tasks : [])
          };
        })
      );

      // Get system status
      const systemStatus = await projectManagerTools.executeTool('getSystemStatus', {
        components: ['all']
      });

      return {
        success: true,
        activeProjects: projectsWithDetails,
        systemStatus: systemStatus.success ? systemStatus.status : { status: 'unknown' }
      };
    } catch (error) {
      console.error("Error generating project dashboard:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate project completion percentage from tasks
   * @param {Array} tasks - List of project tasks
   * @returns {number} - Completion percentage
   */
  calculateProjectCompletion(tasks) {
    if (!tasks || tasks.length === 0) {
      return 0;
    }

    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    return Math.round((completedTasks / tasks.length) * 100);
  }

  /**
   * Clear the conversation history
   */
  clearConversation() {
    this.conversationHistory = [];
    return {
      success: true,
      message: "Conversation history cleared"
    };
  }
}

// Create and export singleton instance
const projectManagerAgentService = new ProjectManagerAgentService();
export default projectManagerAgentService;
