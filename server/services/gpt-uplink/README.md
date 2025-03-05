# Nexa GPT Uplink Service

A dedicated WebSocket server that handles communication between Nexa Agents and Halcyon AI.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```env
GPT_UPLINK_PORT=9001
GPT_UPLINK_HOST=0.0.0.0
JWT_SECRET=your_jwt_secret
HALCYON_API_ENDPOINT=https://api.nexaethos.ai/halcyon
HALCYON_API_KEY=your_halcyon_api_key
```

3. Start the server:
```bash
npm start
```

## WebSocket API

### Connection
Connect to the WebSocket server at `wss://api.nexaethos.ai:9001`

### Message Types

1. Connect:
```json
{
  "type": "connect",
  "auth_token": "jwt_token",
  "info": {
    "client_version": "1.0",
    "client_name": "client_name",
    "client_type": "web",
    "protocol": "wss"
  }
}
```

2. Identify:
```json
{
  "type": "identify",
  "userId": "user_id",
  "userName": "user_name",
  "userType": "user",
  "uplink": {
    "enabled": true,
    "service": "gpt-uplink"
  }
}
```

3. Command:
```json
{
  "type": "command",
  "auth_token": "jwt_token",
  "command": "command_text",
  "messageId": "message_id"
}
```

4. Confirmation:
```json
{
  "type": "confirm",
  "auth_token": "jwt_token",
  "confirmation_id": "confirmation_id"
}
```

### Response Types

1. Connected:
```json
{
  "type": "connected",
  "message": "Successfully connected to GPT Uplink service"
}
```

2. Action Executed:
```json
{
  "type": "action_executed",
  "message": "Command response",
  "timestamp": "ISO timestamp"
}
```

3. Error:
```json
{
  "type": "error",
  "message": "Error message"
}
```

## Health Check

GET `/health` - Returns service health status and number of active connections 