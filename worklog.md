# Worklog - Runtime Error Fix

## 2025-03-01 10:41 AM
- **Issue**: Fixed "Cannot read properties of undefined (reading 'models')" error in settings reducer
- **Changes**:
  - Updated Redux selectors to properly access namespaced state under `state.settings`
  - Added null checks and default empty arrays for model lists
  - Improved selector safety with fallback empty objects/arrays
