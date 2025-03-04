import { configureStore, createSlice } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import logsReducer from './slices/logsSlice';

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

// Configure persist for settings
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['settings'] // Only persist settings
};

const persistedReducer = persistReducer(persistConfig, settingsSlice.reducer);

const store = configureStore({
  reducer: {
    settings: persistedReducer,
    logs: logsReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false // Disable serializable check for persist
    })
});

export const persistor = persistStore(store);
export default store; 