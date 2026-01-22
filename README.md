# Daemo AI Agent Engine (Boilerplate)

A lightweight, unopinionated boilerplate for building AI agents with the [Daemo Engine](https://github.com/daemo-ai).

This template is designed to be **LLM-friendly** and **easy to extend**. It comes pre-configured with a sample service (SF 311 Data) but is stripped of complex authentication, making it perfect for rapid prototyping and local development.

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone <your-repo-url>
cd daemo-sf-311-agent
npm install
```

### 3. Configuration

Copy the example environment file and configure your keys:

```bash
cp env.example .env
```

Open `.env` and add your keys:
- **`DAEMO_AGENT_API_KEY`**: Required to connect to the Daemo Engine → Go to https://app.daemo.ai/ to get it.
- **`GEMINI_API_KEY`** (or other provider key): Required for the AI model.
- **`SF_311_APP_TOKEN`**: Recommended for the sample SF 311 service (prevents rate limits).

See `env.example` for additional optional configuration (port, gateway URL, model overrides).

### 4. Running the Engine

Start the development server:

```bash
npm run dev
```

The server will start at `http://localhost:5000`.

## 📡 API Endpoints

Since authentication has been disabled for this boilerplate, you can query the agent directly using standard HTTP requests.

### Query the Agent

**POST** `/agent/query`

Ask a question and receive a complete response.

```bash
curl -X POST http://localhost:5000/agent/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How many 311 incidents are there by type?",
    "thread_id": "optional-thread-id",
    "max_tokens": 2048
  }'
```

**Response:**
```json
{
  "success": true,
  "response": "There are 1,234 incidents of 'Street and Sidewalk Cleaning'...",
  "threadId": "abc123",
  "toolInteractions": [...],
  "executionTimeMs": 150
}
```

### Query with Streaming

**POST** `/agent/query-stream`

Ask a question and receive a streamed response via Server-Sent Events (SSE).

```bash
curl -X POST http://localhost:5000/agent/query-stream \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the top issues in the Mission district?"}'
```

### Thread Management

Threads allow you to maintain conversation history across multiple queries.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/agent/threads` | Create a new conversation thread |
| `GET` | `/agent/threads` | List all threads |
| `GET` | `/agent/threads/:threadId` | Get a specific thread with messages |
| `DELETE` | `/agent/threads/:threadId` | Delete a thread |

## 📂 Project Structure

This boilerplate is organized to separate the "Core Engine" (which you rarely touch) from your "Custom Services" (where you build your agent).

### 🟢 Customization Zone (Where you work)

- **`src/services/`**: This is where the magic happens!
  - **`daemoService.ts`**: The registry file. Initialize and register your custom tools here. Also contains the system prompt.
  - **`sf311Functions.ts`**: An *example* service showing how to build tools with the `@DaemoFunction` decorator. You can replace or extend this.
  - **`sf311.schemas.ts`**: *Example* Zod schemas demonstrating how to structure input/output validation.
  - **`socrataClient.ts`**: HTTP client utilities for the SF 311 Socrata API.

### 🔴 Core Engine (Do not modify)

- **`src/app.ts`**: Main entry point. Sets up Express, middleware, routes, and starts the server.
- **`src/controllers/`**: Handles low-level communication with the Daemo Agent API and manages threads.
  - **`agentController.ts`**: Query processing, streaming, and thread CRUD operations.
- **`src/middlewares/`**: Standard Express middlewares.
  - **`errorHandler.ts`**: Global error handling middleware.
- **`src/utils/`**: Shared utilities and interfaces.
  - **`interfaces.ts`**: TypeScript type definitions.

### 📁 Other Directories

- **`client/`**: Optional frontend client (if applicable).

## 🛠 Adding Your Own Tools

To add new capabilities to the agent:

1.  **Define the Logic**: Create a class (like `SF311Functions`) with methods for your tool in `src/services/`.
2.  **Add Decorators**: Use `@DaemoFunction` to describe what the tool does and define input/output schemas using Zod.
3.  **Register**: Import your class in `src/services/daemoService.ts` and register it with `builder.registerService(new MyService())`.

### Example Tool

```typescript
import { DaemoFunction } from "daemo-engine";
import { z } from "zod";

export class MyService {
  @DaemoFunction({
    description: "Get the current weather for a city",
    tags: ["weather"],
    category: "Weather",
    inputSchema: z.object({
      city: z.string().describe("The city name"),
    }),
    outputSchema: z.object({
      temperature: z.number(),
      conditions: z.string(),
    }),
  })
  async getWeather(input: { city: string }) {
    // Your logic here
    return { temperature: 72, conditions: "Sunny" };
  }
}
```

## 🤖 LLM Configuration

The engine supports **Gemini** (default), **Anthropic**, and **OpenAI**.

To switch providers, update `.env`:

```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

You can also override the specific model:

```bash
LLM_MODEL=claude-3-5-sonnet-20241022
```

---

*This is a community boilerplate for the Daemo Engine. Feel free to fork and modify!*
