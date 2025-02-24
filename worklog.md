# Worklog

## 2/24/2025

- Updated `src/components/Layout/DashboardLayout.js` to add `onClick` handler to the navigation buttons. This fixes the issue where the navbar buttons were not working.
- Incorporated React Flow into the `Agents.js` component to create a basic drag-and-drop visual programming interface.
- Updated `Agents.js` to use the `reactflow` package instead of `react-flow-renderer`.
- Enriched the agent nodes in `Agents.js` by adding input fields for agent name, description, API address, model temperature, and repetition penalty, as well as a dropdown menu for selecting the inference API (LM Studio or Ollama).
