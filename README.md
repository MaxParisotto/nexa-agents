# Nexa Agents

AI Agent Orchestration System with a clean separation between frontend and backend.

## Repository Structure

This project is organized into separate client and server applications:

```
nexa-agents/
├── client/         # Frontend React application
├── server/         # Backend Express/Node.js API server
├── shared/         # Shared code between client and server
└── nexa-workspace.code-workspace  # VS Code workspace configuration
```

## Development with VS Code

1. Open the VS Code workspace file:
   ```
   code nexa-workspace.code-workspace
   ```

2. Install the recommended extensions when prompted

3. Open a terminal in VS Code and install dependencies:
   ```
   cd client && npm install
   cd ../server && npm install
   ```

4. Start the development servers:
   - Use the Vite extension to start the client
   - Use the integrated terminal to run `cd server && npm run dev` for the backend
   - Use the integrated terminal to run `cd server && npm run metrics` for the metrics service

## Manual Development

### Client

```bash
cd client
npm install
npm run dev
```

The frontend will be available at http://localhost:3000

### Server

```bash
cd server
npm install
npm run dev
```

The API server will run on http://localhost:3001

### Metrics Service

```bash
cd server
npm run metrics
```

The metrics service will run on http://localhost:3005
