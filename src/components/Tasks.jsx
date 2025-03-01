import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Typography, Box, Paper, Grid, Button, Divider, 
  TextField, Chip, IconButton, Card, CardContent, 
  CardActions, MenuItem, Select, FormControl, 
  InputLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, Accordion, AccordionSummary,
  AccordionDetails, LinearProgress, Tooltip,
  List, ListItem, ListItemText, ListItemIcon,
  ListItemSecondaryAction, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  Fab, Drawer, Menu, Popover, Badge
} from '@mui/material';
import Editor from '@monaco-editor/react';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Assignment as AssignmentIcon,
  Flag as FlagIcon,
  Timeline as TimelineIcon,
  Visibility as VisibilityIcon,
  Chat as ChatIcon,
  Groups as GroupsIcon,
  Settings as SettingsIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { createTask, fetchTasks, updateTaskStatus, assignTask, completeTask } from '../store/actions/taskActions';
import { addNotification } from '../store/actions/systemActions';
import { logInfo, logError, LOG_CATEGORIES } from '../store/actions/logActions';
import mermaid from 'mermaid';

/**
 * Tasks component for managing structured tasks with milestones, goals, and progression status
 * Supports JSON/YAML editing, Mermaid graph visualization, and Project Manager integration
 */
const Tasks = () => {
  const dispatch = useDispatch();
  const { tasks, loading, error } = useSelector(state => state.tasks);
  const agents = useSelector(state => state.agents.agents);
  
  // State for task editor
  const [selectedTask, setSelectedTask] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorLanguage, setEditorLanguage] = useState('json');
  const [showEditor, setShowEditor] = useState(false);
  
  // State for task creation/editing
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState({
    id: '',
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    milestones: [],
    goals: [],
    assignedAgents: [],
    progress: 0,
    createdAt: '',
    updatedAt: ''
  });
  
  // State for milestone management
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState({
    id: '',
    title: '',
    description: '',
    dueDate: '',
    status: 'pending',
    assignedAgent: null
  });
  
  // State for Project Manager integration
  const [orchestrationMenuAnchor, setOrchestrationMenuAnchor] = useState(null);
  const [orchestrationDialogOpen, setOrchestrationDialogOpen] = useState(false);
  const [orchestrationPrompt, setOrchestrationPrompt] = useState('');
  
  // State for Mermaid graph
  const [mermaidGraph, setMermaidGraph] = useState('');
  const mermaidRef = useRef(null);
  
  // State for Project Manager chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSize, setChatSize] = useState({ width: 400, height: 500 });
  const [isChatResizing, setIsChatResizing] = useState(false);
  const [chatPosition, setChatPosition] = useState({ x: window.innerWidth - 500, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const chatRef = useRef(null);
  const resizeRef = useRef(null);
  const dragRef = useRef(null);
  
  // Get settings from Redux store
  const settings = useSelector(state => state.settings || {});
  const selectedModel = settings.selectedModel || 'gpt-4';
  const savedChatSettings = settings.chatSettings || {};
  
  // Initialize chat position and size from saved settings if available
  useEffect(() => {
    if (savedChatSettings.size) {
      setChatSize(savedChatSettings.size);
    }
    
    if (savedChatSettings.position) {
      setChatPosition(savedChatSettings.position);
    }
  }, [savedChatSettings]);
  
  // Save chat settings when they change
  useEffect(() => {
    if (chatOpen) {
      // Debounce to avoid excessive saves
      const timer = setTimeout(() => {
        dispatch({
          type: 'UPDATE_CHAT_SETTINGS',
          payload: {
            size: chatSize,
            position: chatPosition
          }
        });
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [chatSize, chatPosition, chatOpen, dispatch]);
  
  // Initialize mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: { 
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      }
    });
  }, []);
  
  // Fetch tasks on component mount
  useEffect(() => {
    dispatch(fetchTasks());
    dispatch(logInfo(LOG_CATEGORIES.TASKS, 'Tasks component mounted'));
  }, [dispatch]);
  
  // Generate and render Mermaid graph when a task is selected
  useEffect(() => {
    if (selectedTask && mermaidRef.current) {
      const graph = generateMermaidGraph(selectedTask);
      setMermaidGraph(graph);
      
      try {
        // Clear previous graph
        mermaidRef.current.innerHTML = '';
        
        // Render new graph
        mermaid.render('mermaid-graph', graph).then(({ svg }) => {
          mermaidRef.current.innerHTML = svg;
        });
      } catch (error) {
        console.error('Failed to render Mermaid graph:', error);
        dispatch(logError(LOG_CATEGORIES.TASKS, 'Failed to render Mermaid graph', error));
      }
    }
  }, [selectedTask]);
  
  /**
   * Set up event listener for Project Manager responses
   */
  useEffect(() => {
    const handleProjectManagerResponse = (event) => {
      const { message, functionCall, toolCalls } = event.detail;
      
      // Log the response for debugging
      dispatch(logInfo(LOG_CATEGORIES.TASKS, `Received Project Manager response: ${message?.substring(0, 100) || 'No message'}`));
      
      // Handle function calls from the Project Manager
      if (functionCall) {
        handleFunctionCall(functionCall);
      }
      
      // Handle tool calls (newer format)
      if (toolCalls && Array.isArray(toolCalls)) {
        toolCalls.forEach(toolCall => {
          if (toolCall.type === 'function') {
            handleFunctionCall(toolCall.function);
          }
        });
      }
      
      // Handle regular message responses
      if (message && typeof message === 'string') {
        // Check if the response contains a task creation instruction
        if (message.includes('create_task') || message.includes('createTask')) {
          try {
            // Extract task data from the response if it has a structured format
            const taskMatch = message.match(/```json\s*({[^`]*})\s*```/);
            if (taskMatch && taskMatch[1]) {
              const taskData = JSON.parse(taskMatch[1]);
              
              // Create a new task with the extracted data
              const newTask = {
                id: uuidv4(),
                ...taskData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              
              dispatch(createTask(newTask));
              dispatch(addNotification({
                type: 'success',
                message: `Task created by Project Manager: ${newTask.title}`
              }));
            }
          } catch (error) {
            console.error('Error parsing task data from Project Manager response:', error);
            dispatch(logError(LOG_CATEGORIES.TASKS, 'Failed to parse task data from Project Manager', error));
          }
        }
      }
    };
    
    /**
     * Handles function calls from the Project Manager
     * @param {Object} funcCall - The function call object
     */
    const handleFunctionCall = (funcCall) => {
      if (!funcCall || !funcCall.name) return;
      
      const { name, arguments: args } = funcCall;
      let parsedArgs;
      
      try {
        // Parse arguments if they're a string
        parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
        
        dispatch(logInfo(LOG_CATEGORIES.TASKS, `Handling function call: ${name}`));
        
        // Handle different function calls
        switch (name) {
          case 'createTask':
            handleLlmCreateTask(parsedArgs);
            break;
          case 'updateTask':
            handleLlmUpdateTask(parsedArgs);
            break;
          case 'deleteTask':
            handleLlmDeleteTask(parsedArgs);
            break;
          case 'listTasks':
            handleLlmListTasks(parsedArgs);
            break;
          default:
            dispatch(logInfo(LOG_CATEGORIES.TASKS, `Unknown function call: ${name}`));
        }
      } catch (error) {
        console.error(`Error handling function call ${name}:`, error);
        dispatch(logError(LOG_CATEGORIES.TASKS, `Failed to handle function call ${name}`, error));
      }
    };
    
    // Add event listener for Project Manager responses
    window.addEventListener('project-manager-message', handleProjectManagerResponse);
    
    // Add event listeners for task management events
    window.addEventListener('task-created', handleTaskCreatedEvent);
    window.addEventListener('task-updated', handleTaskUpdatedEvent);
    window.addEventListener('task-deleted', handleTaskDeletedEvent);
    window.addEventListener('tasks-list-request', handleTasksListRequestEvent);
    
    // Cleanup event listeners on component unmount
    return () => {
      window.removeEventListener('project-manager-message', handleProjectManagerResponse);
      window.removeEventListener('task-created', handleTaskCreatedEvent);
      window.removeEventListener('task-updated', handleTaskUpdatedEvent);
      window.removeEventListener('task-deleted', handleTaskDeletedEvent);
      window.removeEventListener('tasks-list-request', handleTasksListRequestEvent);
    };
  }, [dispatch, tasks]);
  
  /**
   * Handle task created event from ProjectManager
   */
  const handleTaskCreatedEvent = (event) => {
    const { task } = event.detail;
    
    if (!task || !task.id) {
      dispatch(logError(LOG_CATEGORIES.TASKS, 'Invalid task data in task-created event'));
      return;
    }
    
    dispatch(createTask(task));
    dispatch(addNotification({
      type: 'success',
      message: `Task created: ${task.title}`
    }));
  };
  
  /**
   * Handle task updated event from ProjectManager
   */
  const handleTaskUpdatedEvent = (event) => {
    const { taskId, updates } = event.detail;
    
    if (!taskId || !updates) {
      dispatch(logError(LOG_CATEGORIES.TASKS, 'Invalid data in task-updated event'));
      return;
    }
    
    // Find the task to update
    const taskToUpdate = tasks.find(task => task.id === taskId);
    
    if (!taskToUpdate) {
      dispatch(logError(LOG_CATEGORIES.TASKS, `Task not found for update: ${taskId}`));
      return;
    }
    
    // Update the task
    const updatedTask = {
      ...taskToUpdate,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    dispatch(updateTaskStatus(updatedTask));
    dispatch(addNotification({
      type: 'info',
      message: `Task updated: ${updatedTask.title}`
    }));
  };
  
  /**
   * Handle task deleted event from ProjectManager
   */
  const handleTaskDeletedEvent = (event) => {
    const { taskId } = event.detail;
    
    if (!taskId) {
      dispatch(logError(LOG_CATEGORIES.TASKS, 'Invalid data in task-deleted event'));
      return;
    }
    
    // Find the task to delete
    const taskToDelete = tasks.find(task => task.id === taskId);
    
    if (!taskToDelete) {
      dispatch(logError(LOG_CATEGORIES.TASKS, `Task not found for deletion: ${taskId}`));
      return;
    }
    
    // Delete the task (implement this action in your Redux store)
    dispatch({ type: 'DELETE_TASK', payload: taskId });
    dispatch(addNotification({
      type: 'info',
      message: `Task deleted: ${taskToDelete.title}`
    }));
  };
  
  /**
   * Handle tasks list request event from ProjectManager
   */
  const handleTasksListRequestEvent = (event) => {
    const { status } = event.detail;
    
    // Filter tasks by status if provided
    const filteredTasks = status 
      ? tasks.filter(task => task.status === status)
      : tasks;
    
    // Dispatch response event
    const responseEvent = new CustomEvent('tasks-list-response', {
      detail: { tasks: filteredTasks }
    });
    window.dispatchEvent(responseEvent);
  };
  
  /**
   * Handle create task function call from Project Manager
   */
  const handleLlmCreateTask = (args) => {
    if (!args || !args.title) {
      dispatch(logError(LOG_CATEGORIES.TASKS, 'Invalid arguments for createTask function call'));
      return;
    }
    
    const newTask = {
      id: uuidv4(),
      ...args,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: args.status || 'pending',
      progress: args.progress || 0
    };
    
    dispatch(createTask(newTask));
    dispatch(addNotification({
      type: 'success',
      message: `Task created: ${newTask.title}`
    }));
  };
  
  /**
   * Handle update task function call from Project Manager
   */
  const handleLlmUpdateTask = (args) => {
    if (!args || !args.taskId) {
      dispatch(logError(LOG_CATEGORIES.TASKS, 'Invalid arguments for updateTask function call'));
      return;
    }
    
    const { taskId, ...updates } = args;
    
    // Find the task to update
    const taskToUpdate = tasks.find(task => task.id === taskId);
    
    if (!taskToUpdate) {
      dispatch(logError(LOG_CATEGORIES.TASKS, `Task not found for update: ${taskId}`));
      return;
    }
    
    // Update the task
    const updatedTask = {
      ...taskToUpdate,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    dispatch(updateTaskStatus(updatedTask));
    dispatch(addNotification({
      type: 'info',
      message: `Task updated: ${updatedTask.title}`
    }));
  };
  
  /**
   * Handle delete task function call from Project Manager
   */
  const handleLlmDeleteTask = (args) => {
    if (!args || !args.taskId) {
      dispatch(logError(LOG_CATEGORIES.TASKS, 'Invalid arguments for deleteTask function call'));
      return;
    }
    
    const { taskId } = args;
    
    // Find the task to delete
    const taskToDelete = tasks.find(task => task.id === taskId);
    
    if (!taskToDelete) {
      dispatch(logError(LOG_CATEGORIES.TASKS, `Task not found for deletion: ${taskId}`));
      return;
    }
    
    // Delete the task (implement this action in your Redux store)
    dispatch({ type: 'DELETE_TASK', payload: taskId });
    dispatch(addNotification({
      type: 'info',
      message: `Task deleted: ${taskToDelete.title}`
    }));
  };
  
  /**
   * Handle list tasks function call from Project Manager
   */
  const handleLlmListTasks = (args) => {
    const status = args?.status;
    
    // Filter tasks by status if provided
    const filteredTasks = status 
      ? tasks.filter(task => task.status === status)
      : tasks;
    
    // Send the tasks back to the Project Manager
    const event = new CustomEvent('project-manager-message', {
      detail: { 
        message: JSON.stringify(filteredTasks, null, 2),
        type: 'tasksListed'
      }
    });
    window.dispatchEvent(event);
  };
  
  /**
   * Sends an orchestration request to the Project Manager
   * @param {string} prompt - The orchestration prompt to send
   */
  const sendOrchestrationRequest = (prompt) => {
    if (!prompt.trim()) return;
    
    // Get the orchestration template from settings if available
    const orchestrationTemplate = settings.orchestrationTemplate || `
As the Project Manager, I need your help with task orchestration. 
Here's what I want to do: {prompt}

You have access to the following task orchestration tools:
1. create_task(title, description, priority, milestones, goals) - Creates a new task
2. assign_task(taskId, agentId) - Assigns a task to an agent
3. update_task_status(taskId, status) - Updates a task's status
4. split_task(taskId, subtasks) - Splits a task into smaller subtasks
5. complete_task(taskId) - Marks a task as complete

If you need to create a structured task, please provide it in JSON format like this:
\`\`\`json
{
  "title": "Task Title",
  "description": "Task Description",
  "priority": "high",
  "milestones": [
    {
      "title": "Milestone 1",
      "description": "Milestone Description",
      "dueDate": "2023-12-31"
    }
  ],
  "goals": [
    "Goal 1",
    "Goal 2"
  ]
}
\`\`\`

Please help me orchestrate this task efficiently.
    `;
    
    // Substitute the prompt into the template
    const enhancedPrompt = orchestrationTemplate.replace('{prompt}', prompt);
    
    // Get all necessary settings from the Redux store
    const llmParams = settings.llmParameters || {};
    
    // Define tool functions for the Project Manager to use
    const functionDefinitions = [
      {
        name: "create_task",
        description: "Creates a new task with the specified details",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "The title of the task"
            },
            description: {
              type: "string",
              description: "Detailed description of the task"
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
              description: "The priority level of the task"
            },
            milestones: {
              type: "array",
              description: "List of milestones for this task",
              items: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Title of the milestone"
                  },
                  description: {
                    type: "string",
                    description: "Description of the milestone"
                  },
                  dueDate: {
                    type: "string",
                    description: "Due date in YYYY-MM-DD format"
                  },
                  status: {
                    type: "string",
                    enum: ["pending", "in_progress", "completed", "blocked"],
                    description: "Current status of the milestone"
                  }
                }
              }
            },
            goals: {
              type: "array",
              description: "List of goals for this task",
              items: {
                type: "string"
              }
            }
          },
          required: ["title"]
        }
      },
      {
        name: "assign_task",
        description: "Assigns a task to an agent",
        parameters: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID of the task to assign"
            },
            agentId: {
              type: "string",
              description: "ID of the agent to assign the task to"
            }
          },
          required: ["taskId", "agentId"]
        }
      },
      {
        name: "update_task_status",
        description: "Updates the status of a task",
        parameters: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID of the task to update"
            },
            status: {
              type: "string",
              enum: ["pending", "in_progress", "completed", "blocked"],
              description: "New status for the task"
            }
          },
          required: ["taskId", "status"]
        }
      },
      {
        name: "split_task",
        description: "Splits a task into multiple subtasks",
        parameters: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID of the task to split"
            },
            subtasks: {
              type: "array",
              description: "List of subtasks to create",
              items: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Title of the subtask"
                  },
                  description: {
                    type: "string",
                    description: "Description of the subtask"
                  }
                },
                required: ["title"]
              }
            }
          },
          required: ["taskId", "subtasks"]
        }
      },
      {
        name: "complete_task",
        description: "Marks a task as complete",
        parameters: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID of the task to mark as complete"
            }
          },
          required: ["taskId"]
        }
      },
      {
        name: "add_milestone",
        description: "Adds a milestone to an existing task",
        parameters: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID of the task to add the milestone to"
            },
            milestone: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "Title of the milestone"
                },
                description: {
                  type: "string",
                  description: "Description of the milestone"
                },
                dueDate: {
                  type: "string",
                  description: "Due date in YYYY-MM-DD format"
                }
              },
              required: ["title"]
            }
          },
          required: ["taskId", "milestone"]
        }
      }
    ];
    
    // Get current available agents for reference
    const availableAgents = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      capabilities: agent.capabilities || []
    }));
    
    // Get current tasks for reference
    const currentTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status
    }));
    
    // Dispatch a custom event to notify the Project Manager component
    const event = new CustomEvent('project-manager-request', {
      detail: { 
        message: enhancedPrompt,
        model: settings.selectedModel,
        temperature: llmParams.temperature,
        maxTokens: llmParams.maxTokens,
        topP: llmParams.topP,
        presencePenalty: llmParams.presencePenalty,
        frequencyPenalty: llmParams.frequencyPenalty,
        source: 'tasks', // Identify the source of the request
        functionDefinitions, // Add function definitions for tool use
        contextData: {  // Add additional context data
          availableAgents,
          currentTasks,
          selectedTask: selectedTask ? {
            id: selectedTask.id,
            title: selectedTask.title,
            status: selectedTask.status,
            milestones: selectedTask.milestones,
            goals: selectedTask.goals
          } : null
        },
        functions: functionDefinitions, // Support for different formats
        tools: functionDefinitions.map(func => ({ 
          type: "function", 
          function: func 
        })), // Support for OpenAI format
        enableFunctionCalling: true  // Explicitly enable function calling
      }
    });
    window.dispatchEvent(event);
    
    dispatch(logInfo(LOG_CATEGORIES.TASKS, `Sent orchestration request to Project Manager: ${prompt}`));
    
    // Show notification to user
    dispatch(addNotification({
      type: 'info',
      message: 'Task orchestration request sent to Project Manager'
    }));
    
    // Close the dialog
    setOrchestrationDialogOpen(false);
    setOrchestrationPrompt('');
  };
  
  /**
   * Opens the orchestration menu
   * @param {Event} event - The click event
   */
  const handleOrchestrationMenuOpen = (event) => {
    setOrchestrationMenuAnchor(event.currentTarget);
  };
  
  /**
   * Closes the orchestration menu
   */
  const handleOrchestrationMenuClose = () => {
    setOrchestrationMenuAnchor(null);
  };
  
  /**
   * Opens the orchestration dialog
   */
  const handleOrchestrationDialogOpen = () => {
    setOrchestrationDialogOpen(true);
    handleOrchestrationMenuClose();
  };
  
  /**
   * Sends a quick orchestration command to the Project Manager
   * @param {string} command - The orchestration command to send
   */
  const handleQuickOrchestrate = (command) => {
    let prompt = '';
    
    switch (command) {
      case 'createBasicTask':
        prompt = 'Create a basic task with title, description, and at least one goal';
        break;
      case 'splitSelectedTask':
        if (selectedTask) {
          prompt = `Split the task "${selectedTask.title}" into smaller, manageable subtasks with appropriate milestones`;
        } else {
          dispatch(addNotification({
            type: 'warning',
            message: 'Please select a task to split'
          }));
          handleOrchestrationMenuClose();
          return;
        }
        break;
      case 'assignAgents':
        prompt = 'Suggest agent assignments for all pending tasks based on agent capabilities and availability';
        break;
      case 'createMilestones':
        if (selectedTask) {
          prompt = `Create appropriate milestones for the task "${selectedTask.title}" based on its description and goals`;
        } else {
          dispatch(addNotification({
            type: 'warning',
            message: 'Please select a task to create milestones for'
          }));
          handleOrchestrationMenuClose();
          return;
        }
        break;
      default:
        prompt = 'Help me organize and optimize the current task list';
    }
    
    sendOrchestrationRequest(prompt);
    handleOrchestrationMenuClose();
  };
  
  /**
   * Generates a Mermaid graph definition for the selected task
   * @param {Object} task - The task to visualize
   * @returns {string} - Mermaid graph definition
   */
  const generateMermaidGraph = (task) => {
    if (!task) return '';
    
    let graph = 'graph TD\n';
    
    // Main task node
    graph += `  task[${task.title}]\n`;
    graph += `  task:::${task.status}\n`;
    
    // Description node
    if (task.description) {
      const shortDesc = task.description.length > 50 
        ? task.description.substring(0, 50) + '...' 
        : task.description;
      graph += `  desc["Description: ${shortDesc}"]\n`;
      graph += '  task --> desc\n';
    }
    
    // Goals section
    if (task.goals && task.goals.length > 0) {
      graph += '  goals[Goals]\n';
      graph += '  task --> goals\n';
      
      task.goals.forEach((goal, index) => {
        const shortGoal = goal.length > 30 ? goal.substring(0, 30) + '...' : goal;
        graph += `  goal${index}["${shortGoal}"]\n`;
        graph += `  goals --> goal${index}\n`;
      });
    }
    
    // Milestones section
    if (task.milestones && task.milestones.length > 0) {
      graph += '  milestones[Milestones]\n';
      graph += '  task --> milestones\n';
      
      task.milestones.forEach((milestone, index) => {
        graph += `  ms${index}["${milestone.title}"]\n`;
        graph += `  ms${index}:::${milestone.status}\n`;
        graph += `  milestones --> ms${index}\n`;
        
        if (milestone.assignedAgent) {
          graph += `  agent${index}["Agent: ${milestone.assignedAgent}"]\n`;
          graph += `  ms${index} --> agent${index}\n`;
        }
      });
    }
    
    // Assigned agents section
    if (task.assignedAgents && task.assignedAgents.length > 0) {
      graph += '  assigned[Assigned Agents]\n';
      graph += '  task --> assigned\n';
      
      task.assignedAgents.forEach((agent, index) => {
        graph += `  agent${index}["${agent}"]\n`;
        graph += `  assigned --> agent${index}\n`;
      });
    }
    
    // Add class definitions for status colors
    graph += '\n  classDef pending fill:#f9f9f9,stroke:#ccc,stroke-width:1px';
    graph += '\n  classDef in_progress fill:#e3f2fd,stroke:#2196f3,stroke-width:2px';
    graph += '\n  classDef completed fill:#e8f5e9,stroke:#4caf50,stroke-width:2px';
    graph += '\n  classDef blocked fill:#ffebee,stroke:#f44336,stroke-width:2px';
    
    return graph;
  };
  
  /**
   * Handles task selection and prepares editor
   * @param {Object} task - The task to select
   */
  const handleTaskSelect = (task) => {
    setSelectedTask(task);
    
    // Convert task to JSON/YAML for editor
    const taskData = JSON.stringify(task, null, 2);
    setEditorContent(taskData);
    setShowEditor(true);
  };
  
  /**
   * Handles editor content changes
   * @param {string} value - The new editor content
   */
  const handleEditorChange = (value) => {
    setEditorContent(value);
  };
  
  /**
   * Toggles editor language between JSON and YAML
   */
  const toggleEditorLanguage = () => {
    setEditorLanguage(editorLanguage === 'json' ? 'yaml' : 'json');
  };
  
  /**
   * Saves the current editor content as a task
   */
  const saveTaskFromEditor = () => {
    try {
      const taskData = JSON.parse(editorContent);
      
      // Update the task in the store
      dispatch(updateTaskStatus(taskData.id, taskData.status));
      
      // Show success notification
      dispatch(addNotification({
        type: 'success',
        message: `Task "${taskData.title}" updated successfully`
      }));
      
      // Log the action
      dispatch(logInfo(LOG_CATEGORIES.TASKS, `Task ${taskData.id} updated via editor`));
      
      // Update selected task for graph rendering
      setSelectedTask(taskData);
    } catch (error) {
      // Show error notification
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to parse task data. Please check your JSON syntax.'
      }));
      
      // Log the error
      dispatch(logError(LOG_CATEGORIES.TASKS, 'Failed to parse task data', error));
    }
  };
  
  /**
   * Opens the task creation dialog
   */
  const handleCreateTask = () => {
    setCurrentTask({
      id: uuidv4(),
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      milestones: [],
      goals: [],
      assignedAgents: [],
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setTaskDialogOpen(true);
  };
  
  /**
   * Handles task dialog submission
   */
  const handleTaskDialogSubmit = () => {
    dispatch(createTask(currentTask));
    setTaskDialogOpen(false);
    
    // Log the action
    dispatch(logInfo(LOG_CATEGORIES.TASKS, `Task ${currentTask.id} created`));
  };
  
  /**
   * Opens the milestone creation dialog
   */
  const handleAddMilestone = () => {
    setCurrentMilestone({
      id: uuidv4(),
      title: '',
      description: '',
      dueDate: '',
      status: 'pending',
      assignedAgent: null
    });
    setMilestoneDialogOpen(true);
  };
  
  /**
   * Handles milestone dialog submission
   */
  const handleMilestoneDialogSubmit = () => {
    setCurrentTask({
      ...currentTask,
      milestones: [...currentTask.milestones, currentMilestone]
    });
    setMilestoneDialogOpen(false);
  };
  
  /**
   * Removes a milestone from the current task
   * @param {string} milestoneId - The ID of the milestone to remove
   */
  const handleRemoveMilestone = (milestoneId) => {
    setCurrentTask({
      ...currentTask,
      milestones: currentTask.milestones.filter(m => m.id !== milestoneId)
    });
  };
  
  /**
   * Adds a goal to the current task
   * @param {string} goal - The goal to add
   */
  const handleAddGoal = (goal) => {
    if (goal.trim() === '') return;
    
    setCurrentTask({
      ...currentTask,
      goals: [...currentTask.goals, goal]
    });
  };
  
  /**
   * Removes a goal from the current task
   * @param {number} index - The index of the goal to remove
   */
  const handleRemoveGoal = (index) => {
    setCurrentTask({
      ...currentTask,
      goals: currentTask.goals.filter((_, i) => i !== index)
    });
  };
  
  /**
   * Assigns an agent to a task
   * @param {string} taskId - The ID of the task
   * @param {string} agentId - The ID of the agent
   */
  const handleAssignAgent = (taskId, agentId) => {
    dispatch(assignTask(taskId, agentId));
  };
  
  /**
   * Marks a task as complete
   * @param {string} taskId - The ID of the task to complete
   */
  const handleCompleteTask = (taskId) => {
    dispatch(completeTask(taskId));
  };
  
  /**
   * Calculates the progress percentage of a task based on completed milestones
   * @param {Object} task - The task to calculate progress for
   * @returns {number} - The progress percentage
   */
  const calculateTaskProgress = (task) => {
    if (!task.milestones || task.milestones.length === 0) return 0;
    
    const completedMilestones = task.milestones.filter(m => m.status === 'completed').length;
    return Math.round((completedMilestones / task.milestones.length) * 100);
  };
  
  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Tasks
        </Typography>
        <Box>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleCreateTask}
            sx={{ mr: 1 }}
          >
            Create Task
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<SettingsIcon />}
            onClick={handleOrchestrationMenuOpen}
          >
            Orchestrate
          </Button>
          
          {/* Orchestration Menu */}
          <Menu
            anchorEl={orchestrationMenuAnchor}
            open={Boolean(orchestrationMenuAnchor)}
            onClose={handleOrchestrationMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={() => handleQuickOrchestrate('createBasicTask')}>
              <AddIcon fontSize="small" sx={{ mr: 1 }} />
              Create Basic Task
            </MenuItem>
            <MenuItem onClick={() => handleQuickOrchestrate('splitSelectedTask')}>
              <TimelineIcon fontSize="small" sx={{ mr: 1 }} />
              Split Selected Task
            </MenuItem>
            <MenuItem onClick={() => handleQuickOrchestrate('assignAgents')}>
              <GroupsIcon fontSize="small" sx={{ mr: 1 }} />
              Suggest Agent Assignments
            </MenuItem>
            <MenuItem onClick={() => handleQuickOrchestrate('createMilestones')}>
              <FlagIcon fontSize="small" sx={{ mr: 1 }} />
              Create Milestones
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleOrchestrationDialogOpen}>
              <ChatIcon fontSize="small" sx={{ mr: 1 }} />
              Custom Orchestration...
            </MenuItem>
          </Menu>
        </Box>
      </Box>
      
      {loading ? (
        <LinearProgress />
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Grid container spacing={3}>
          {/* Compact Task List */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Task List
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {tasks.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  No tasks available. Create a new task to get started.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tasks.map(task => (
                        <TableRow 
                          key={task.id}
                          hover
                          selected={selectedTask?.id === task.id}
                          onClick={() => handleTaskSelect(task)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                              {task.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={task.status} 
                              color={
                                task.status === 'completed' ? 'success' :
                                task.status === 'in_progress' ? 'primary' :
                                task.status === 'pending' ? 'default' : 'warning'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskSelect(task);
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteTask(task.id);
                              }}
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>
          
          {/* Task Visualization and Editor */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, height: '100%' }}>
              {showEditor ? (
                <Grid container spacing={2}>
                  {/* Task Visualization */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Task: {selectedTask?.title}
                      </Typography>
                      <Box>
                        <Button 
                          variant="outlined" 
                          size="small" 
                          onClick={toggleEditorLanguage}
                          sx={{ mr: 1 }}
                        >
                          {editorLanguage === 'json' ? 'Switch to YAML' : 'Switch to JSON'}
                        </Button>
                        <Button 
                          variant="contained" 
                          color="primary" 
                          size="small" 
                          startIcon={<SaveIcon />}
                          onClick={saveTaskFromEditor}
                        >
                          Save
                        </Button>
                      </Box>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    
                    {/* Mermaid Graph */}
                    <Box sx={{ mb: 3, p: 2, border: '1px solid #eee', borderRadius: 1, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Task Structure Visualization
                      </Typography>
                      <Box 
                        ref={mermaidRef} 
                        sx={{ 
                          width: '100%', 
                          minHeight: '200px',
                          display: 'flex',
                          justifyContent: 'center'
                        }}
                      />
                    </Box>
                    
                    {/* Monaco Editor */}
                    <Box sx={{ height: '400px', border: '1px solid #ddd' }}>
                      <Editor
                        height="100%"
                        language={editorLanguage}
                        value={editorContent}
                        onChange={handleEditorChange}
                        options={{
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          wordWrap: 'on'
                        }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Task Visualization
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Select a task from the list to view its structure and edit it.
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={<AddIcon />}
                    onClick={handleCreateTask}
                  >
                    Create Task
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* Task Creation/Edit Dialog */}
      <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentTask.id ? 'Edit Task' : 'Create New Task'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Title"
                fullWidth
                value={currentTask.title}
                onChange={(e) => setCurrentTask({ ...currentTask, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={4}
                value={currentTask.description}
                onChange={(e) => setCurrentTask({ ...currentTask, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={currentTask.priority}
                  label="Priority"
                  onChange={(e) => setCurrentTask({ ...currentTask, priority: e.target.value })}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={currentTask.status}
                  label="Status"
                  onChange={(e) => setCurrentTask({ ...currentTask, status: e.target.value })}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="blocked">Blocked</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Goals Section */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">
                    <FlagIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Goals
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      label="Add Goal"
                      fullWidth
                      placeholder="Enter a goal and press Enter"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddGoal(e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                  </Box>
                  <List>
                    {currentTask.goals.map((goal, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <FlagIcon />
                        </ListItemIcon>
                        <ListItemText primary={goal} />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" onClick={() => handleRemoveGoal(index)}>
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            </Grid>
            
            {/* Milestones Section */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">
                    <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Milestones
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleAddMilestone}
                    >
                      Add Milestone
                    </Button>
                  </Box>
                  <List>
                    {currentTask.milestones.map((milestone) => (
                      <ListItem key={milestone.id}>
                        <ListItemIcon>
                          <TimelineIcon />
                        </ListItemIcon>
                        <ListItemText 
                          primary={milestone.title} 
                          secondary={milestone.description}
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" onClick={() => handleRemoveMilestone(milestone.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleTaskDialogSubmit}
            disabled={!currentTask.title}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Milestone Dialog */}
      <Dialog open={milestoneDialogOpen} onClose={() => setMilestoneDialogOpen(false)}>
        <DialogTitle>Add Milestone</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Title"
                fullWidth
                value={currentMilestone.title}
                onChange={(e) => setCurrentMilestone({ ...currentMilestone, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={currentMilestone.description}
                onChange={(e) => setCurrentMilestone({ ...currentMilestone, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Due Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={currentMilestone.dueDate}
                onChange={(e) => setCurrentMilestone({ ...currentMilestone, dueDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={currentMilestone.status}
                  label="Status"
                  onChange={(e) => setCurrentMilestone({ ...currentMilestone, status: e.target.value })}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="blocked">Blocked</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMilestoneDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleMilestoneDialogSubmit}
            disabled={!currentMilestone.title}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Orchestration Dialog */}
      <Dialog open={orchestrationDialogOpen} onClose={() => setOrchestrationDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Task Orchestration</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Describe what you want to do with your tasks, and the Project Manager will help orchestrate them.
            You can create, split, assign, or manage tasks using natural language.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Orchestration prompt"
            placeholder="E.g., Create a task for implementing a login system with appropriate milestones and assign it to the backend team"
            value={orchestrationPrompt}
            onChange={(e) => setOrchestrationPrompt(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrchestrationDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => sendOrchestrationRequest(orchestrationPrompt)}
            disabled={!orchestrationPrompt.trim()}
          >
            Send to Project Manager
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Tasks;
