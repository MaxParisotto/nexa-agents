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
  TableCell, TableContainer, TableHead, TableRow
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
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { createTask, fetchTasks, updateTaskStatus, assignTask, completeTask } from '../store/actions/taskActions';
import { addNotification } from '../store/actions/systemActions';
import { logInfo, logError, LOG_CATEGORIES } from '../store/actions/logActions';
import mermaid from 'mermaid';

/**
 * Tasks component for managing structured tasks with milestones, goals, and progression status
 * Supports JSON/YAML editing and Mermaid graph visualization
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
  
  // State for Mermaid graph
  const [mermaidGraph, setMermaidGraph] = useState('');
  const mermaidRef = useRef(null);
  
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
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleCreateTask}
        >
          Create Task
        </Button>
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
    </Box>
  );
};

export default Tasks;
