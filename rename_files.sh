#!/bin/bash

# Rename files with JSX content from .js to .jsx
mv src/components/Agora/Agora.js src/components/Agora/Agora.jsx
mv src/components/ApiStatus.js src/components/ApiStatus.jsx
mv src/components/NodeConfigurationWizard.js src/components/NodeConfigurationWizard.jsx
mv src/components/Agents/CustomNodes.js src/components/Agents/CustomNodes.jsx
mv src/components/Agents/WorkflowList.js src/components/Agents/WorkflowList.jsx
mv src/components/Agents/AgentManager.js src/components/Agents/AgentManager.jsx
mv src/components/Settings/SettingsTerminal.js src/components/Settings/SettingsTerminal.jsx
mv src/components/Settings/SettingsForm.js src/components/Settings/SettingsForm.jsx
mv src/components/Settings/SettingsContext.js src/components/Settings/SettingsContext.jsx
mv src/components/ProjectManager.js src/components/ProjectManager.jsx

echo "Files renamed successfully."
