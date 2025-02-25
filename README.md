# Nexa Agents - AI Agent Orchestration System

## Overview

Nexa Agents is a full-stack real-time AI agent orchestration system designed to enable autonomous team operations with minimal supervision. It features a modern React-based dashboard with WebSocket connectivity for live updates and comprehensive agent management capabilities.

## Core Components

### Frontend Layer

- **React Dashboard**
  - Modern responsive web interface
  - Real-time updates via WebSocket
  - Drag-and-drop task assignment
  - Redux state management
  - Performance monitoring widgets

### Backend Infrastructure

- **WebSocket Server**
  - Bidirectional real-time communication
  - Event broadcasting system
  - Client state synchronization
  - Connection management

- **Task Management API**
  - RESTful endpoints
  - WebSocket integration
  - Load balancing
  - Task queue management

- **Rust Message Queue**
  - High-performance message processing
  - Publish/subscribe patterns
  - In-memory storage with persistence options
  - Intelligent load distribution

### Agent System

- **Containerized Agents**
  - Isolated execution environments
  - Standardized task interfaces
  - Built-in monitoring
  - Automatic error recovery

### Data Management

- **Database Layer**
  - Real-time data persistence
  - Performance metrics storage
  - Historical analysis capabilities
  - Task and agent state tracking

- **Logging System**
  - Centralized log aggregation
  - Error tracking and reporting
  - Audit trail maintenance
  - System health monitoring

### Configuration System

- **Persistent Configuration**
  - JSON/YAML file-based configuration
  - Application settings persistence
  - Environment-specific configuration
  - Automatic loading on startup

- **Configuration Editor**
  - In-app Monaco editor for configuration files
  - Real-time validation
  - Syntax highlighting
  - Save/load operations

## Getting Started

### Prerequisites

- Node.js 16+ for the frontend and WebSocket server
- Rust for the message queue (optional)
- Docker for containerized agents (optional)

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/nexa-agents.git
cd nexa-agents
```

2; Install dependencies

```bash
npm install
```

3; Start the development server

```bash
npm run dev
```

## Configuration

The application uses a file-based configuration system that supports both JSON and YAML formats. Configuration files are stored in the `config/` directory at the workspace root.

### Configuration Files

- `config/nexa-config.json` - Main configuration file (JSON format)
- `config/nexa-config.yaml` - Alternative configuration file (YAML format)

### Configuration Properties

```json
{
  "lmStudio": {
    "apiUrl": "http://localhost:1234",
    "defaultModel": "model-name"
  },
  "ollama": {
    "apiUrl": "http://localhost:11434",
    "defaultModel": "llama2"
  },
  "nodeEnv": "development",
  "port": 3001
}
```

### Loading Configuration

Configuration is automatically loaded when the application starts. The system will:

1. Attempt to load the configuration from the file
2. Fall back to values stored in localStorage if the file is not found
3. Use default values if neither file nor localStorage entries exist

### Managing Configuration

You can manage configuration through:

- The **Settings** page in the application UI
- Directly editing the configuration files
- Using the test script: `node src/scripts/test-config.js`
