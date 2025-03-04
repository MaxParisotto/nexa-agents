import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { useSocket } from '../services/socket';

/**
 * Custom hook for managing workflows
 */
export function useWorkflows() {
  const [workflows, setWorkflows] = useState([]);
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { socket, connected } = useSocket();

  /**
   * Fetch all workflows
   */
  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getWorkflows();
      setWorkflows(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching workflows:', err);
      setError('Failed to load workflows. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch a specific workflow by ID
   */
  const fetchWorkflow = useCallback(async (id) => {
    setLoading(true);
    try {
      const response = await apiService.getWorkflow(id);
      setCurrentWorkflow(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      console.error(`Error fetching workflow ${id}:`, err);
      setError('Failed to load workflow. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new workflow
   */
  const createWorkflow = useCallback(async (workflow) => {
    setLoading(true);
    try {
      const response = await apiService.createWorkflow(workflow);
      setWorkflows(prev => [...prev, response.data]);
      setError(null);
      return response.data;
    } catch (err) {
      console.error('Error creating workflow:', err);
      setError('Failed to create workflow. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update an existing workflow
   */
  const updateWorkflow = useCallback(async (id, updates) => {
    setLoading(true);
    try {
      const response = await apiService.updateWorkflow(id, updates);
      setWorkflows(prev => 
        prev.map(workflow => workflow.id === id ? response.data : workflow)
      );
      if (currentWorkflow?.id === id) {
        setCurrentWorkflow(response.data);
      }
      setError(null);
      return response.data;
    } catch (err) {
      console.error(`Error updating workflow ${id}:`, err);
      setError('Failed to update workflow. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkflow]);

  /**
   * Delete a workflow
   */
  const deleteWorkflow = useCallback(async (id) => {
    setLoading(true);
    try {
      await apiService.deleteWorkflow(id);
      setWorkflows(prev => prev.filter(workflow => workflow.id !== id));
      if (currentWorkflow?.id === id) {
        setCurrentWorkflow(null);
      }
      setError(null);
    } catch (err) {
      console.error(`Error deleting workflow ${id}:`, err);
      setError('Failed to delete workflow. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkflow]);

  // Listen for workflow updates over socket connection
  useEffect(() => {
    if (!socket || !connected) return;

    const handleWorkflowUpdate = (updatedWorkflow) => {
      setWorkflows(prev => 
        prev.map(workflow => workflow.id === updatedWorkflow.id ? updatedWorkflow : workflow)
      );
      
      if (currentWorkflow?.id === updatedWorkflow.id) {
        setCurrentWorkflow(updatedWorkflow);
      }
    };

    socket.on('workflow_update', handleWorkflowUpdate);

    return () => {
      socket.off('workflow_update', handleWorkflowUpdate);
    };
  }, [socket, connected, currentWorkflow]);

  // Fetch workflows on initial load
  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  return {
    workflows,
    currentWorkflow,
    loading,
    error,
    fetchWorkflows,
    fetchWorkflow,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow
  };
}
