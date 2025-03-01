import websocketService from '../../services/websocket';
import { addError } from './systemActions';

// Agent List Actions
export const fetchAgentsRequest = () => ({
  type: 'FETCH_AGENTS_REQUEST'
});

export const fetchAgentsSuccess = (agents) => ({
  type: 'FETCH_AGENTS_SUCCESS',
  payload: agents
});

export const fetchAgentsFailure = (error) => ({
  type: 'FETCH_AGENTS_FAILURE',
  payload: error
});
export const selectAgent = (agent) => ({
  type: 'SELECT_AGENT',
  payload: agent
});

export const updateAgentStatus = (agentId, status) => ({
  type: 'UPDATE_AGENT_STATUS',
  payload: { id: agentId, status }
});

// Thunk action creators for async operations
export const fetchAgents = () => {
  return async (dispatch, getState) => {
    dispatch(fetchAgentsRequest());
    try {
      // In a real application, this would be an API call
      // Ensure Project Manager exists
      const existingAgents = getState().agents.agents;
      
      const baseAgents = [
        {
          id: 'project-manager',
          name: 'Project Manager',
          isProjectManager: true,
          status: 'active',
          capabilities: ['coordination', 'workflow_management'],
          systemPrompt: getState().agents.agents.find(a => a.isProjectManager)?.systemPrompt || 'Default project management instructions...', 
          createdAt: new Date().toISOString(),
          configurable: true
        },
        { id: 1, name: 'Agent-1', status: 'idle', capabilities: ['task1', 'task2'] },
        { id: 2, name: 'Agent-2', status: 'busy', capabilities: ['task2', 'task3'] },
        { id: 3, name: 'Agent-3', status: 'error', capabilities: ['task1', 'task3'] }
      ];

      // Merge existing agents with base agents, preserving any updates
      const mergedAgents = baseAgents.map(baseAgent => {
        const existing = existingAgents.find(a => a.id === baseAgent.id);
        return existing ? {...baseAgent, ...existing} : baseAgent;
      });

      // Filter out duplicates
      const mockAgents = mergedAgents.filter((agent, index, self) =>
        index === self.findIndex(a => a.id === agent.id)
      );
      
      dispatch(fetchAgentsSuccess(mockAgents));
    } catch (error) {
      dispatch(fetchAgentsFailure(error.message));
      dispatch(addError({
        type: 'agent',
        message: 'Failed to fetch agents',
        error: error.message
      }));
    }
  };
};

export const registerAgent = (agentData) => {
  return async (dispatch) => {
    try {
      // Send registration to WebSocket server
      websocketService.registerAgent(agentData);
      
      // Optimistically update local state
      dispatch({
        type: 'ADD_AGENT',
        payload: {
          ...agentData,
          status: 'idle',
          registeredAt: new Date().toISOString()
        }
      });
    } catch (error) {
      dispatch(addError({
        type: 'agent',
        message: 'Failed to register agent',
        error: error.message
      }));
    }
  };
};

export const deactivateAgent = (agentId) => {
  return async (dispatch) => {
    try {
      dispatch(updateAgentStatus(agentId, 'deactivating'));
      
      // In a real application, this would be an API call
      // await api.deactivateAgent(agentId);
      
      dispatch(updateAgentStatus(agentId, 'deactivated'));
    } catch (error) {
      dispatch(updateAgentStatus(agentId, 'error'));
      dispatch(addError({
        type: 'agent',
        message: `Failed to deactivate agent ${agentId}`,
        error: error.message
      }));
    }
  };
};

export const reactivateAgent = (agentId) => {
  return async (dispatch) => {
    try {
      dispatch(updateAgentStatus(agentId, 'activating'));
      
      // In a real application, this would be an API call
      // await api.reactivateAgent(agentId);
      
      dispatch(updateAgentStatus(agentId, 'idle'));
    } catch (error) {
      dispatch(updateAgentStatus(agentId, 'error'));
      dispatch(addError({
        type: 'agent',
        message: `Failed to reactivate agent ${agentId}`,
        error: error.message
      }));
    }
  };
};
