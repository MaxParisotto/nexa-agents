import {
  FETCH_MODELS_REQUEST,
  FETCH_MODELS_SUCCESS,
  FETCH_MODELS_FAILURE,
  SET_DEFAULT_MODEL_SUCCESS,
  UPDATE_MODEL_SETTINGS_SUCCESS
} from './types';
import apiClient from '../../utils/apiClient';

export const fetchAvailableModels = () => async (dispatch) => {
  dispatch({ type: FETCH_MODELS_REQUEST });
  
  try {
    const response = await apiClient.models.getAvailableModels();
    
    dispatch({
      type: FETCH_MODELS_SUCCESS,
      payload: response.models
    });
    
    return response.models;
  } catch (error) {
    dispatch({
      type: FETCH_MODELS_FAILURE,
      payload: error.message
    });
    
    throw error;
  }
};

export const setDefaultModel = (modelId) => async (dispatch) => {
  try {
    await apiClient.models.setDefaultModel(modelId);
    
    dispatch({
      type: SET_DEFAULT_MODEL_SUCCESS,
      payload: modelId
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error setting default model:', error);
    throw error;
  }
};

export const updateModelSettings = (modelId, settings) => async (dispatch) => {
  try {
    await apiClient.models.updateModelSettings(modelId, settings);
    
    dispatch({
      type: UPDATE_MODEL_SETTINGS_SUCCESS,
      payload: { modelId, settings }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating model settings:', error);
    throw error;
  }
};
