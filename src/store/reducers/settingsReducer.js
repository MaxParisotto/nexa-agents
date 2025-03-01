import { UPDATE_SETTINGS } from '../actions/settingsActions';

const initialState = {
  lmStudio: { models: [] },
  ollama: { models: [] },
  uplink: {
    enabled: false,
    websocketPort: 3001,
    authToken: '',
    connectedGPTs: [],
    openaiKey: '',
    apiSchemaVersion: '1.0'
  }
};

const settingsReducer = (state = initialState, action) => {
  switch (action.type) {
    case UPDATE_SETTINGS:
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

export const selectLLMServers = (state) => [
  ...(state.settings?.lmStudio?.models?.map(model => ({
    id: `lmstudio-${model.id}`,
    name: model.name,
    type: 'LM Studio',
    ...model
  })) || []),
  ...(state.settings?.ollama?.models?.map(model => ({
    id: `ollama-${model.name}`,
    name: model.name,
    type: 'Ollama', 
    ...model
  })) || [])
];

export const selectAvailableModels = (state) => [
  ...(state.settings?.lmStudio?.models || []),
  ...(state.settings?.ollama?.models || [])
];

export default settingsReducer;
