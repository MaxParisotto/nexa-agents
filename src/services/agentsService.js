/**
 * Agent Service - Handles business logic for agent operations
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '../../../data');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Read all agents
function getAllAgents() {
  if (!fs.existsSync(AGENTS_FILE)) {
    // Initialize with default agents
    const defaultAgents = [
      {
        id: uuidv4(),
        name: 'Research Agent',
        status: 'idle',
        capabilities: ['research', 'data analysis'],
        lastActive: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        name: 'Assistant Agent',
        status: 'idle',
        capabilities: ['answering', 'scheduling'],
        lastActive: new Date().toISOString(),
      }
    ];
    saveAgents(defaultAgents);
    return defaultAgents;
  }
  
  try {
    const data = fs.readFileSync(AGENTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading agents file:', error);
    return [];
  }
}

// Get agent by ID
function getAgentById(id) {
  const agents = getAllAgents();
  return agents.find(agent => agent.id === id);
}

// Create new agent
function createAgent(agentData) {
  const agents = getAllAgents();
  const newAgent = {
    ...agentData,
    id: uuidv4(),
    lastActive: new Date().toISOString()
  };
  
  agents.push(newAgent);
  saveAgents(agents);
  return newAgent;
}

// Update agent
function updateAgent(id, agentData) {
  const agents = getAllAgents();
  const index = agents.findIndex(agent => agent.id === id);
  
  if (index === -1) {
    throw new Error(`Agent with ID ${id} not found`);
  }
  
  const updatedAgent = {
    ...agents[index],
    ...agentData,
    id, // Ensure ID doesn't change
    lastActive: new Date().toISOString()
  };
  
  agents[index] = updatedAgent;
  saveAgents(agents);
  return updatedAgent;
}

// Delete agent
function deleteAgent(id) {
  const agents = getAllAgents();
  const index = agents.findIndex(agent => agent.id === id);
  
  if (index === -1) {
    throw new Error(`Agent with ID ${id} not found`);
  }
  
  const deletedAgent = agents.splice(index, 1)[0];
  saveAgents(agents);
  return deletedAgent;
}

// Update agent status
function updateAgentStatus(id, status) {
  const agents = getAllAgents();
  const index = agents.findIndex(agent => agent.id === id);
  
  if (index === -1) {
    throw new Error(`Agent with ID ${id} not found`);
  }
  
  agents[index].status = status;
  agents[index].lastActive = new Date().toISOString();
  
  saveAgents(agents);
  return agents[index];
}

// Save agents to file
function saveAgents(agents) {
  try {
    fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
  } catch (error) {
    console.error('Error writing agents file:', error);
    throw new Error('Failed to save agents data');
  }
}

module.exports = {
  getAllAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  updateAgentStatus
};
