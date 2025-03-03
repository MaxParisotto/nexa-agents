# Nexa Agents Server

Backend server for the Nexa Agents application that handles API requests, manages agents, and orchestrates workflows.

## Overview

The server component of Nexa Agents provides:

- RESTful API endpoints for client interaction
- WebSocket connections for real-time updates
- Agent execution environment
- Workflow orchestration
- System monitoring

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn
- Access to LLM providers (if using AI capabilities)

### Installation

1. Install dependencies:

```bash
npm install
```

   Set up environment variables by creating a `.env` file (see `.env.example` for required variables)

   Start the development server:

```bash
npm run dev
```

## API Documentation

The server exposes the following API endpoints:

### Workflows

- `GET /api/workflows` - List all workflows
- `GET /api/workflows/:id` - Get a specific workflow
- `POST /api/workflows` - Create a new workflow
- `PUT /api/workflows/:id` - Update a workflow
- `DELETE /api/workflows/:id` - Delete a workflow

### Workflow Steps

- `GET /api/workflows/:workflowId/steps` - List steps in a workflow
- `POST /api/workflows/:workflowId/steps` - Add a step to a workflow
- `PUT /api/workflows/:workflowId/steps/:stepId` - Update a workflow step
- `DELETE /api/workflows/:workflowId/steps/:stepId` - Delete a workflow step

### Agents

- `GET /api/agents` - List all agents
- `GET /api/agents/:id` - Get a specific agent
- `POST /api/agents` - Create a new agent
- `PUT /api/agents/:id` - Update an agent
- `DELETE /api/agents/:id` - Delete an agent

### System

- `GET /api/system/status` - Get system status
- `GET /api/metrics/system` - Get current system metrics
- `GET /api/metrics/history` - Get historical metrics

### Settings

- `GET /api/settings` - Get application settings
- `PUT /api/settings` - Update settings
- `POST /api/settings/reset` - Reset settings to defaults

## Configuration

Configuration options are managed through environment variables and the `config` directory.

## Development

### Project Structure

``
server/
├── src/             # Source files
│   ├── api/         # API routes and controllers
│   ├── models/      # Data models
│   ├── services/    # Business logic and services
│   ├── utils/       # Utility functions
│   └── index.js     # Entry point
├── config/          # Configuration files
├── tests/           # Test files
└── .env.example     # Example environment variables
``

### Testing

Run tests with:

```bash
npm test
```

## License

This project is licensed under the MIT License.
