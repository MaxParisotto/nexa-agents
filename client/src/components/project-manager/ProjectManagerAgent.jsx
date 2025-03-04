import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Divider, 
  CircularProgress, Chip, Card, CardContent, List,
  ListItem, ListItemText, ListItemIcon, Avatar, IconButton,
  Grid, Alert, Accordion, AccordionSummary, AccordionDetails,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import BuildIcon from '@mui/icons-material/Build';
import FolderIcon from '@mui/icons-material/Folder';
import TaskIcon from '@mui/icons-material/Task';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PersonIcon from '@mui/icons-material/Person';
import ReportIcon from '@mui/icons-material/Assessment';

import projectManagerAgentService from '../../services/ProjectManagerAgentService';
import { useSettings } from '../../contexts/SettingsContext';
import ReactMarkdown from 'react-markdown';

/**
 * Project Manager Agent Component
 * Provides an interface for interacting with the project manager agent
 */
export default function ProjectManagerAgent() {
  const { settings } = useSettings();
  const [input, setInput] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const messagesEndRef = useRef(null);

  // Load dashboard on component mount
  useEffect(() => {
    loadDashboard();
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [conversations]);

  // Load dashboard data
  const loadDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const data = await projectManagerAgentService.getProjectDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      setError("Failed to load project dashboard. Please try again later.");
    } finally {
      setLoadingDashboard(false);
    }
  };

  // Scroll to bottom of message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle input change
  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  // Send message to agent
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = input;
    setInput('');
    setLoading(true);
    setError(null);
    
    // Add user message to conversations
    setConversations(prev => [...prev, { role: 'user', content: userMessage }]);
    
    try {
      // Send message to agent
      const response = await projectManagerAgentService.sendMessage(userMessage);
      
      if (response.error) {
        setError(response.message || "Failed to get response. Please try again.");
      } else {
        // Add agent response to conversations
        setConversations(prev => [...prev, { 
          role: 'assistant', 
          content: response.content,
          toolResults: response.toolResults 
        }]);
        
        // Refresh dashboard if tool was executed
        if (response.toolResults) {
          loadDashboard();
        }
      }
    } catch (error) {
      console.error("Error sending message to agent:", error);
      setError("Failed to communicate with the agent. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Reset conversation
  const handleReset = () => {
    setConversations([]);
    projectManagerAgentService.clearConversation();
    loadDashboard();
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'operational':
      case 'completed':
      case 'healthy':
        return 'success';
      case 'warning':
      case 'degraded':
        return 'warning';
      case 'error':
      case 'critical':
      case 'canceled':
      case 'down':
        return 'error';
      default:
        return 'info';
    }
  };

  // Format tool results for display
  const formatToolResults = (toolResults) => {
    if (!toolResults) return null;
    
    return Object.entries(toolResults).map(([toolName, result]) => (
      <Box key={toolName} mt={1}>
        <Typography variant="subtitle2" color="primary">{toolName}</Typography>
        <Box sx={{ 
          backgroundColor: 'background.default', 
          p: 1, 
          borderRadius: 1, 
          maxHeight: '150px', 
          overflow: 'auto',
          fontSize: '0.8rem'
        }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </Box>
      </Box>
    ));
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Chat Panel */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: '600px', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>Project Manager Assistant</Typography>
            <Divider sx={{ mb: 2 }} />
            
            {/* Messages Container */}
            <Box sx={{ 
              flexGrow: 1, 
              overflow: 'auto', 
              mb: 2, 
              display: 'flex', 
              flexDirection: 'column'
            }}>
              {conversations.length === 0 ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%', 
                  opacity: 0.7 
                }}>
                  <BuildIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                  <Typography variant="h6" color="textSecondary">
                    Project Management Assistant
                  </Typography>
                  <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 1 }}>
                    Ask me to create projects, assign tasks, generate reports, or check system status.
                  </Typography>
                </Box>
              ) : (
                conversations.map((msg, index) => (
                  <Box 
                    key={index} 
                    sx={{ 
                      display: 'flex',
                      mb: 2,
                      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    }}
                  >
                    <Avatar 
                      sx={{ 
                        bgcolor: msg.role === 'user' ? 'primary.main' : 'secondary.main',
                        width: 32, 
                        height: 32
                      }}
                    >
                      {msg.role === 'user' ? 'U' : 'PM'}
                    </Avatar>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        ml: msg.role === 'user' ? 0 : 1,
                        mr: msg.role === 'user' ? 1 : 0,
                        maxWidth: '75%',
                        backgroundColor: msg.role === 'user' ? 'primary.light' : 'background.paper',
                      }}
                      elevation={1}
                    >
                      <ReactMarkdown>
                        {msg.content}
                      </ReactMarkdown>
                      {msg.toolResults && formatToolResults(msg.toolResults)}
                    </Paper>
                  </Box>
                ))
              )}
              <div ref={messagesEndRef} />
            </Box>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {/* Input Area */}
            <Box sx={{ display: 'flex' }}>
              <TextField
                fullWidth
                placeholder="Ask the project manager agent..."
                variant="outlined"
                value={input}
                onChange={handleInputChange}
                disabled={loading}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                sx={{ mr: 1 }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleSendMessage}
                disabled={!input.trim() || loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              >
                Send
              </Button>
              <IconButton color="inherit" onClick={handleReset} sx={{ ml: 1 }}>
                <RefreshIcon />
              </IconButton>
            </Box>
          </Paper>
        </Grid>
        
        {/* Dashboard Panel */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: '600px', overflow: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Project Dashboard</Typography>
              <IconButton size="small" onClick={loadDashboard} disabled={loadingDashboard}>
                {loadingDashboard ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Box>
            
            {loadingDashboard ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
              </Box>
            ) : dashboardData?.error ? (
              <Alert severity="error">
                {dashboardData.error || "Failed to load dashboard data"}
              </Alert>
            ) : dashboardData?.success ? (
              <>
                {/* Active Projects */}
                <Typography variant="subtitle1" gutterBottom>
                  Active Projects ({dashboardData.activeProjects?.length || 0})
                </Typography>
                
                {dashboardData.activeProjects?.length > 0 ? (
                  dashboardData.activeProjects.map((project, index) => (
                    <Card key={project.id || index} variant="outlined" sx={{ mb: 2 }}>
                      <CardContent sx={{ pb: 1, "&:last-child": { pb: 1 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <FolderIcon sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography variant="subtitle1">
                              {project.name}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${project.completion || 0}%`}
                            color={
                              project.completion >= 75 ? "success" : 
                              project.completion >= 25 ? "primary" : 
                              "default"
                            }
                            size="small"
                          />
                        </Box>
                        
                        <Typography variant="body2" color="textSecondary" noWrap>
                          {project.description}
                        </Typography>
                        
                        <Divider sx={{ my: 1 }} />
                        
                        <Grid container spacing={1} sx={{ mt: 0.5 }}>
                          <Grid item xs={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <TaskIcon sx={{ mr: 0.5, fontSize: '0.9rem', color: 'text.secondary' }} />
                              <Typography variant="body2" color="textSecondary">
                                Tasks: {project.tasks?.length || 0}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <PersonIcon sx={{ mr: 0.5, fontSize: '0.9rem', color: 'text.secondary' }} />
                              <Typography variant="body2" color="textSecondary">
                                Team: {project.resources?.length || 0}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    No active projects found. Ask the agent to create your first project.
                  </Alert>
                )}
                
                {/* System Status */}
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  System Status
                </Typography>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          {dashboardData.systemStatus?.components ? (
                            Object.entries(dashboardData.systemStatus.components).map(([component, status]) => (
                              <TableRow key={component}>
                                <TableCell>{component}</TableCell>
                                <TableCell>
                                  <Chip 
                                    size="small"
                                    label={status.status || 'Unknown'} 
                                    color={getStatusColor(status.status)}
                                  />
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell>Overall Status</TableCell>
                              <TableCell>
                                <Chip 
                                  size="small"
                                  label={dashboardData.systemStatus?.status || 'Unknown'} 
                                  color={getStatusColor(dashboardData.systemStatus?.status)}
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
                
                {/* Tool Capabilities */}
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Available Tools
                </Typography>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2">Project Management</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <BuildIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Create and manage projects" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <TaskIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Assign and track tasks" />
                      </ListItem>
                    </List>
                  </AccordionDetails>
                </Accordion>
                
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2">Resource Management</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <PersonIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Assign team members" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <ScheduleIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Plan resource allocation" />
                      </ListItem>
                    </List>
                  </AccordionDetails>
                </Accordion>
                
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2">Reporting & System Management</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <ReportIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Generate project reports" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <BuildIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Manage system services" />
                      </ListItem>
                    </List>
                  </AccordionDetails>
                </Accordion>
              </>
            ) : (
              <Alert severity="warning">
                Dashboard data not available. Please refresh.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}