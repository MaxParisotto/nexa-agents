import { configureStore, createSlice } from '@reduxjs/toolkit';

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    lmStudio: {
      apiUrl: 'http://localhost:1234',
      defaultModel: ''
    },
    ollama: {
      apiUrl: 'http://localhost:11434',
      defaultModel: ''
    }
  },
  reducers: {
    updateSettings: (state, action) => {
      return { ...state, ...action.payload };
    }
  }
});

export const { updateSettings } = settingsSlice.actions;

const store = configureStore({
  reducer: {
    settings: settingsSlice.reducer
  }
});

export default store; 