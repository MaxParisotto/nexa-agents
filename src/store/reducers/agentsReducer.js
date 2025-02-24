const initialState = {
  agents: [],
  loading: false,
  error: null,
  selectedAgent: null
};

const agentsReducer = (state = initialState, action) => {
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
        agents: action.payload,
        error: null
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

export default agentsReducer;
