import { configureStore } from '@reduxjs/toolkit';
import thunk from 'redux-thunk';
import rootReducer from './reducers';
import logReducer from './reducers/logReducer';
import agoraReducer from './reducers/agoraReducer';

// Include all reducers here
const store = configureStore({
  reducer: {
    ...rootReducer,
    logs: logReducer, // Ensure logReducer is included
    agora: agoraReducer, // Add this line if not already included in rootReducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(thunk),
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;