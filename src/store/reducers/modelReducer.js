import {
  FETCH_MODELS_REQUEST,
  FETCH_MODELS_SUCCESS,
  FETCH_MODELS_FAILURE,
  SET_DEFAULT_MODEL_SUCCESS,
  UPDATE_MODEL_SETTINGS_SUCCESS
} from '../actions/types';

const initialState = {
  models: [],
  loading: false,
  error: null
};

export default function modelReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_MODELS_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };
      
    case FETCH_MODELS_SUCCESS:
      return {
        ...state,
        models: action.payload,
        loading: false,
        error: null
      };
      
    case FETCH_MODELS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
      
    case SET_DEFAULT_MODEL_SUCCESS:
      return {
        ...state,
        models: state.models.map(model => ({
          ...model,
          isDefault: model.id === action.payload
        }))
      };
      
    case UPDATE_MODEL_SETTINGS_SUCCESS:
      return {
        ...state,
        models: state.models.map(model => 
          model.id === action.payload.modelId
            ? { ...model, settings: action.payload.settings }
            : model
        )
      };
      
    default:
      return state;
  }
}
