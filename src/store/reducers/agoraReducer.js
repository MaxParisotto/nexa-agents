const initialState = {
  selected: [],
  selected2: [],
  messages: [],
  channels: [
    { id: 'general', name: 'General', unread: 0 },
    { id: 'agents', name: 'Agents', unread: 0 },
    { id: 'system', name: 'System', unread: 0 }
  ],
  activeChannel: 'general'
};

const agoraReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_SELECTED_ITEMS':
      return {
        ...state,
        selected: action.payload
      };
    case 'SET_ADDITIONAL_ITEMS':
      return {
        ...state,
        selected2: action.payload
      };
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };
    case 'SET_ACTIVE_CHANNEL':
      return {
        ...state,
        activeChannel: action.payload
      };
    case 'MARK_CHANNEL_READ':
      return {
        ...state,
        channels: state.channels.map(c => 
          c.id === action.payload ? { ...c, unread: 0 } : c
        )
      };
    default:
      return state;
  }
};

export default agoraReducer;
