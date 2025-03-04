import { createContext, useContext, useReducer } from 'react';
import { logInfo, LOG_CATEGORIES } from '../../store/actions/logActions';
import { addNotification } from '../../store/actions/systemActions';

const SettingsContext = createContext();

const initialState = {
  lmStudio: {
    apiUrl: '',
    defaultModel: ''
  },
  ollama: {
    apiUrl: '',
    defaultModel: ''
  },
  projectManager: {
    apiUrl: '',
    model: '',
    serverType: 'lmStudio',
    parameters: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      repeatPenalty: 1.1,
      maxTokens: 1024,
      contextLength: 4096
    }
  },
  openai: {
    websocketUrl: 'ws://localhost:3001/ws',
    restUrl: 'http://localhost:3001/api',
    apiKey: '',
    enabled: false
  }
};

function settingsReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        [action.section]: {
          ...state[action.section],
          [action.field]: action.value
        }
      };
    case 'SET_SETTINGS':
      return {
        ...state,
        ...action.payload
      };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

export const SettingsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(settingsReducer, initialState);

  const setField = (section, field, value) => {
    dispatch({ type: 'SET_FIELD', section, field, value });
  };

  const setSettings = (settings) => {
    dispatch({ type: 'SET_SETTINGS', payload: settings });
  };

  const value = { state, setField, setSettings };
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
