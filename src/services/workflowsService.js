/**
 * Workflow Service - Handles business logic for workflow operations
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '../../../data');
const WORKFLOWS_DIR = path.join(DATA_DIR, 'workflows');

// Ensure directories exist
if (!fs.existsSync(WORKFLOWS_DIR)) {
  fs.mkdirSync(WORKFLOWS_DIR, { recursive: true });
}

// Get all workflows
function getAllWorkflows() {
  try {
    const files = fs.readdirSync(WORKFLOWS_DIR).filter(file => file.endsWith('.json'));
    return files.map(file => {
      try {
        const data = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8');
        return JSON.parse(data);
      } catch (error) {
        console.error(`Error reading workflow file ${file}:`, error);
        return null;
      }
    }).filter(Boolean); // Remove nulls
  } catch (error) {
    console.error('Error reading workflows directory:', error);
    return [];
  }
}

// Get workflow by ID
function getWorkflowById(id) {
  const filePath = path.join(WORKFLOWS_DIR, `${id}.json`);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading workflow file for ID ${id}:`, error);
    return null;
  }
}

// Create new workflow
function createWorkflow(workflowData) {
  const now = new Date().toISOString();
  const id = uuidv4();
  
  const workflow = {
    id,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    steps: [],
    ...workflowData
  };
  
  const filePath = path.join(WORKFLOWS_DIR, `${id}.json`);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
    return workflow;
  } catch (error) {
    console.error('Error creating workflow:', error);
    throw new Error('Failed to create workflow');
  }
}

// Update workflow
function updateWorkflow(id, workflowData) {
  const filePath = path.join(WORKFLOWS_DIR, `${id}.json`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Workflow with ID ${id} not found`);
  }
  
  try {
    const existingData = fs.readFileSync(filePath, 'utf8');
    const existingWorkflow = JSON.parse(existingData);
    
    const updatedWorkflow = {
      ...existingWorkflow,
      ...workflowData,
      id, // Ensure ID doesn't change
      createdAt: existingWorkflow.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(updatedWorkflow, null, 2));
    return updatedWorkflow;
  } catch (error) {
    console.error(`Error updating workflow ${id}:`, error);
    throw new Error('Failed to update workflow');
  }
}

// Delete workflow
function deleteWorkflow(id) {
  const filePath = path.join(WORKFLOWS_DIR, `${id}.json`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Workflow with ID ${id} not found`);
  }
  
  try {
    const workflowData = fs.readFileSync(filePath, 'utf8');
    const workflow = JSON.parse(workflowData);
    
    fs.unlinkSync(filePath);
    return workflow;
  } catch (error) {
    console.error(`Error deleting workflow ${id}:`, error);
    throw new Error('Failed to delete workflow');
  }
}

// Add step to workflow
function addWorkflowStep(workflowId, stepData) {
  const workflow = getWorkflowById(workflowId);
  
  if (!workflow) {
    throw new Error(`Workflow with ID ${workflowId} not found`);
  }
  
  const step = {
    id: uuidv4(),
    status: 'pending',
    dependencies: [],
    ...stepData
  };
  
  workflow.steps.push(step);
  workflow.updatedAt = new Date().toISOString();
  
  const filePath = path.join(WORKFLOWS_DIR, `${workflowId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
  
  return step;
}

// Update workflow step
function updateWorkflowStep(workflowId, stepId, stepData) {
  const workflow = getWorkflowById(workflowId);
  
  if (!workflow) {
    throw new Error(`Workflow with ID ${workflowId} not found`);
  }
  
  const stepIndex = workflow.steps.findIndex(step => step.id === stepId);
  
  if (stepIndex === -1) {
    throw new Error(`Step with ID ${stepId} not found in workflow ${workflowId}`);
  }
  
  workflow.steps[stepIndex] = {
    ...workflow.steps[stepIndex],
    ...stepData,
    id: stepId // Ensure ID doesn't change
  };
  
  workflow.updatedAt = new Date().toISOString();
  
  const filePath = path.join(WORKFLOWS_DIR, `${workflowId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
  
  return workflow.steps[stepIndex];
}

module.exports = {
  getAllWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  addWorkflowStep,
  updateWorkflowStep
};
