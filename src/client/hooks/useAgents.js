import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { useSocket } from '../services/socket';

/**
 * Custom hook for working with agents
 * Pure data fetching without business logic (which is in the server)
 */
export function useAgents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { socket, connected } = useSocket();
  
  // Fetch all agents
  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getAgents();
      setAgents(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch agents: ' + (err.response?.data?.error || err.message));
      console.error('Error fetching agents:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Create new agent
  const createAgent = useCallback(async (agentData) => {
    try {
      const response = await apiService.createAgent(agentData);
      setAgents(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      setError('Failed to create agent: ' + (err.response?.data?.error || err.message));
      console.error('Error creating agent:', err);
      throw err;
    }
  }, []);
  
  // Update agent
  const updateAgent = useCallback(async (id, agentData) => {
    try {
      const response = await apiService.updateAgent(id, agentData);
      setAgents(prev => prev.map(a => a.id === id ? response.data : a));
      return response.data;
    } catch (err) {
      setError('Failed to update agent: ' + (err.response?.data?.error || err.message));
      console.error(`Error updating agent ${id}:`, err);
      throw err;
    }
  }, []);
  
  // Delete agent
  const deleteAgent = useCallback(async (id) => {
    try {
      const response = await apiService.deleteAgent(id);
      setAgents(prev => prev.filter(a => a.id !== id));
      return response.data;
    } catch (err) {
      setError('Failed to delete agent: ' + (err.response?.data?.error || err.message));
      console.error(`Error deleting agent ${id}:`, err);
      throw err;
    }
  }, []);
  
  // Update agent status via socket
  const updateAgentStatus = useCallback((id, status) => {
    if (!socket || !connected) return;
    socket.emit('agent_status', { id, status });
  }, [socket, connected]);
  
  // Listen for agent updates via socket
  useEffect(() => {
    if (!socket) return;
    
    const handleAgentStatus = (updatedAgent) => {
      setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
    };
    
    socket.on('agent_status', handleAgentStatus);
    
    return () => {
      socket.off('agent_status', handleAgentStatus);
    };
  }, [socket]);
  
  // Fetch agents on init
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);
  
  return {
    agents,
    loading,
    error,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    updateAgentStatus
  };
}
