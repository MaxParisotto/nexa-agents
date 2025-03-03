const fs = require("fs/promises");
const path = require("path");
const { v4 as uuidv4 } = require("uuid");
const { fileURLToPath } = require("url");

// Get __dirname in ES module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKFLOWS_DIR = path.join(__dirname, '../../..', 'data', 'workflows');

/**
 * Model for managing workflows
 */
class WorkflowModel {
  constructor() {
    this.initPromise = this.initialize();
    this.workflows = [];
  }
  
  /**
   * Initialize the workflows directory
   */
  async initialize() {
    try {
      // Create workflows directory if it doesn't exist
      try {
        await fs.access(WORKFLOWS_DIR);
      } catch (err) {
        console.log(`Creating workflows directory at ${WORKFLOWS_DIR}`);
        await fs.mkdir(WORKFLOWS_DIR, { recursive: true });
      }
      
      // Load existing workflows
      await this.loadWorkflows();
      return true;
    } catch (error) {
      console.error('Failed to initialize workflow model:', error);
      return false;
    }
  }
  
  /**
   * Load all workflows from disk
   */
  async loadWorkflows() {
    try {
      // Ensure the model is initialized
      await this.initPromise;
      
      // Read workflow files
      const files = await fs.readdir(WORKFLOWS_DIR);
      const workflowFiles = files.filter(file => file.endsWith('.json'));
      
      // Parse each file
      this.workflows = [];
      for (const file of workflowFiles) {
        try {
          const content = await fs.readFile(path.join(WORKFLOWS_DIR, file), 'utf8');
          const workflow = JSON.parse(content);
          this.workflows.push(workflow);
        } catch (err) {
          console.error(`Error loading workflow file ${file}:`, err);
        }
      }
      
      console.log(`Loaded ${this.workflows.length} workflows`);
      return this.workflows;
    } catch (error) {
      console.error('Error loading workflows:', error);
      return [];
    }
  }
  
  /**
   * Get all workflows
   */
  async getAll() {
    await this.initPromise;
    return this.workflows;
  }
  
  /**
   * Get a workflow by ID
   */
  async getById(id) {
    await this.initPromise;
    return this.workflows.find(workflow => workflow.id === id);
  }
  
  /**
   * Create a new workflow
   */
  async create(workflowData) {
    await this.initPromise;
    
    // Generate ID if not provided
    const workflow = {
      ...workflowData,
      id: workflowData.id || uuidv4(),
      createdAt: workflowData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to disk
    await fs.writeFile(
      path.join(WORKFLOWS_DIR, `${workflow.id}.json`),
      JSON.stringify(workflow, null, 2),
      'utf8'
    );
    
    // Add to in-memory collection
    const existingIndex = this.workflows.findIndex(w => w.id === workflow.id);
    if (existingIndex >= 0) {
      this.workflows[existingIndex] = workflow;
    } else {
      this.workflows.push(workflow);
    }
    
    return workflow;
  }
  
  /**
   * Update an existing workflow
   */
  async update(id, workflowData) {
    await this.initPromise;
    
    // Check if workflow exists
    const existingWorkflow = this.workflows.find(w => w.id === id);
    if (!existingWorkflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }
    
    // Update workflow
    const updatedWorkflow = {
      ...existingWorkflow,
      ...workflowData,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };
    
    // Save to disk
    await fs.writeFile(
      path.join(WORKFLOWS_DIR, `${id}.json`),
      JSON.stringify(updatedWorkflow, null, 2),
      'utf8'
    );
    
    // Update in-memory collection
    const index = this.workflows.findIndex(w => w.id === id);
    this.workflows[index] = updatedWorkflow;
    
    return updatedWorkflow;
  }
  
  /**
   * Delete a workflow
   */
  async delete(id) {
    await this.initPromise;
    
    // Check if workflow exists
    const existingIndex = this.workflows.findIndex(w => w.id === id);
    if (existingIndex < 0) {
      throw new Error(`Workflow with ID ${id} not found`);
    }
    
    // Remove file
    try {
      await fs.unlink(path.join(WORKFLOWS_DIR, `${id}.json`));
    } catch (err) {
      console.error(`Error deleting workflow file ${id}.json:`, err);
    }
    
    // Remove from in-memory collection
    this.workflows.splice(existingIndex, 1);
    
    return { success: true, id };
  }
}

// Create and export singleton instance
const workflowModel = new WorkflowModel();
module.exports = workflowModel;
