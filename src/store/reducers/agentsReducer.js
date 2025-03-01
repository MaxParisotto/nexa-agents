export const agentReducer = (state = {
  agents: [
    {
      id: 'project-manager',
      name: 'Project Manager',
      isProjectManager: true,
      status: 'active',
      capabilities: ['coordination', 'workflow_management'],
      systemPrompt: 'Default project management instructions...',
      createdAt: new Date().toISOString()
    }
  ],
  loading: false,
  error: null,
  selectedAgent: null
}, action) => {
  switch (action.type) {
    case 'FETCH_AGENTS_REQUEST':
      return {
        ...state,
        loading: true
      };
    case 'FETCH_AGENTS_SUCCESS':
      return {
        ...state,
        loading: false,
        agents: action.payload.map(newAgent => {
          const existing = state.agents.find(a => a.id === newAgent.id);
          return existing ? {...existing, ...newAgent} : newAgent;
        }),
        error: null,
        lastFetched: new Date().toISOString()
      };
    case 'FETCH_AGENTS_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    case 'SELECT_AGENT':
      return {
        ...state,
        selectedAgent: action.payload
      };
    case 'UPDATE_AGENT_STATUS':
      return {
        ...state,
        agents: state.agents.map(agent =>
          agent.id === action.payload.id
            ? { ...agent, status: action.payload.status }
            : agent
        )
      };
    default:
      return state;
  }
};

export default agentReducer;
