# Synaptic MCP API Documentation

## Overview

The Synaptic MCP API provides RESTful endpoints for managing AI memories, processing interactions, and accessing blockchain features. All endpoints return JSON responses and use standard HTTP status codes.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this standard format:

```json
{
  "success": true,
  "data": {},
  "message": "Optional message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Error responses:

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Endpoints

### Authentication

#### POST /api/auth/wallet
Authenticate using wallet signature.

**Request Body:**
```json
{
  "walletAddress": "string",
  "signature": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "user-id",
      "walletAddress": "wallet-address"
    }
  }
}
```

#### GET /api/auth/profile
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "walletAddress": "wallet-address",
    "email": "user@example.com",
    "preferences": {}
  }
}
```

### Memory Management

#### POST /api/memory
Create a new memory.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "content": "Memory content",
  "type": "knowledge|preference|conversation|project|context|skill|template",
  "category": "personal|professional|educational|creative|technical|social",
  "tags": ["tag1", "tag2"],
  "privacyLevel": 0,
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "mem_1234567890_abcdefghi",
    "content": "Memory content",
    "type": "knowledge",
    "category": "technical",
    "tags": ["tag1", "tag2"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "quality": 0.8
  }
}
```

#### GET /api/memory/search
Search memories using semantic search.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `query` (required): Search query string
- `type` (optional): Filter by memory type
- `category` (optional): Filter by category
- `limit` (optional): Number of results (default: 10, max: 100)
- `minQuality` (optional): Minimum quality score (0-1)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "mem_1234567890_abcdefghi",
      "content": "Memory content",
      "type": "knowledge",
      "category": "technical",
      "similarity": 0.95,
      "quality": 0.8
    }
  ],
  "count": 1
}
```

#### GET /api/memory/:id
Get a specific memory by ID.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "mem_1234567890_abcdefghi",
    "content": "Memory content",
    "type": "knowledge",
    "category": "technical",
    "metadata": {},
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PUT /api/memory/:id
Update a memory.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "content": "Updated content",
  "tags": ["new-tag"],
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "mem_1234567890_abcdefghi",
    "content": "Updated content",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "version": 2
  }
}
```

#### DELETE /api/memory/:id
Delete a memory.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Memory deleted successfully"
}
```

#### GET /api/memory/stats/overview
Get memory statistics for the current user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalMemories": 150,
    "memoriesByType": {
      "knowledge": 50,
      "preference": 30,
      "conversation": 70
    },
    "memoriesByCategory": {
      "technical": 80,
      "personal": 40,
      "professional": 30
    },
    "averageQuality": 0.75,
    "totalRewards": "1000"
  }
}
```

### AI Integration

#### POST /api/ai/interaction
Process an AI interaction and extract memories.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "platform": "claude|openai|gemini|cursor|windsurf",
  "userMessage": "User's message to AI",
  "aiResponse": {
    "content": "AI's response",
    "model": "claude-3-sonnet",
    "usage": {
      "promptTokens": 100,
      "completionTokens": 200,
      "totalTokens": 300
    }
  },
  "sessionId": "session_1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "AI interaction processed successfully"
}
```

#### POST /api/ai/context
Get relevant memories for AI context injection.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentContext": "Current conversation context",
  "aiPlatform": "claude",
  "maxMemories": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "mem_1234567890_abcdefghi",
      "content": "Relevant memory content",
      "type": "knowledge",
      "relevanceScore": 0.9
    }
  ],
  "count": 1
}
```

#### GET /api/ai/platforms
Get list of supported AI platforms.

**Response:**
```json
{
  "success": true,
  "data": ["claude", "openai", "gemini", "cursor", "windsurf", "custom"],
  "count": 6
}
```

### Blockchain Integration

#### GET /api/blockchain/rewards/:userId
Get user's mining rewards.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRewards": "1000",
    "pendingRewards": "50",
    "recentRewards": [
      {
        "amount": "100",
        "reason": "quality_contribution",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "transactionHash": "abc123..."
      }
    ]
  }
}
```

#### GET /api/blockchain/mining/stats
Get mining statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalMiners": 1000,
    "totalRewardsDistributed": "1000000",
    "averageQualityScore": 0.75,
    "rewardsPerDay": "10000"
  }
}
```

#### GET /api/blockchain/token/info
Get SYNA token information.

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "SYNA",
    "name": "Synaptic Token",
    "decimals": 9,
    "network": "Solana",
    "totalSupply": "1000000000",
    "circulatingSupply": "100000000"
  }
}
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 501 | Not Implemented |

## Rate Limiting

API requests are limited to 100 requests per 15-minute window per IP address. Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import SynapticMCP, { MemoryType, MemoryCategory } from 'synaptic-mcp';

const client = new SynapticMCP({
  apiUrl: 'http://localhost:3000/api',
  apiKey: 'your-api-key'
});

// Create a memory
const memory = await client.createMemory(
  'TypeScript is great for large applications',
  MemoryType.KNOWLEDGE,
  MemoryCategory.TECHNICAL,
  { tags: ['typescript', 'programming'] }
);

// Search memories
const results = await client.searchMemories('typescript programming');
```

### Python

```python
import requests

class SynapticMCP:
    def __init__(self, api_url, api_key):
        self.api_url = api_url
        self.headers = {'Authorization': f'Bearer {api_key}'}
    
    def create_memory(self, content, type, category, tags=None):
        data = {
            'content': content,
            'type': type,
            'category': category,
            'tags': tags or []
        }
        response = requests.post(f'{self.api_url}/memory', json=data, headers=self.headers)
        return response.json()
```

## Webhooks

Synaptic MCP supports webhooks for real-time notifications:

### Memory Events
- `memory.created`
- `memory.updated`
- `memory.deleted`

### Mining Events
- `reward.earned`
- `quality.assessed`

### Webhook Payload Example

```json
{
  "event": "memory.created",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "memoryId": "mem_1234567890_abcdefghi",
    "userId": "user-id",
    "type": "knowledge"
  }
}
``` 