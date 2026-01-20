# GitHub Repository Analyzer - Daemo AI Agent

An intelligent AI agent built with the Daemo platform that analyzes GitHub repositories, detects issues, and provides actionable recommendations using Claude AI.

## 🌟 Features

### AI-Powered Analysis
- **Repository Health Scoring** - Get a 0-100 health score for any repository
- **Issue Detection** - Automatically find missing LICENSE, README, weak descriptions, and stale repos
- **Smart Recommendations** - Prioritized (High/Medium/Low) action items with explanations
- **Portfolio Statistics** - Overview of all repositories with language breakdown and insights

### Natural Language Interface
Ask questions like:
- "Analyze all my GitHub repositories"
- "What's the health score of my selin_ozdemir repo?"
- "Find all repositories missing a LICENSE"
- "Show me my portfolio statistics"
- "Which repos need urgent attention?"

### Daemo Integration
- ✅ Connected to Daemo AI platform
- ✅ Agent ID: `696e749bf290ceb142d6f946`
- ✅ Real-time processing with Claude AI
- ✅ Thread management for conversation history
- ✅ Streaming responses

## 🛠️ Tech Stack

- **Platform:** Daemo AI Agent Engine
- **AI Model:** Claude 3.5 Sonnet (Anthropic)
- **Language:** TypeScript + Node.js
- **APIs:** GitHub REST API (@octokit/rest)
- **Validation:** Zod schemas

## 📦 Installation

### Prerequisites
- Node.js v18+
- npm
- GitHub Personal Access Token
- Daemo Agent API Key
- Claude API Key (Anthropic)

### Setup

1. **Clone the repository**
```bash
   git clone https://github.com/selin-ozdemir/github_repo_organizer.git
   cd github_repo_organizer/daemo-agent
```

2. **Install dependencies**
```bash
   npm install
```

3. **Configure environment**
```bash
   cp .env.example .env
```

4. **Add your API keys to `.env`**
```env
   DAEMO_AGENT_API_KEY=your_daemo_key_here
   ANTHROPIC_API_KEY=sk-ant-your_claude_key_here
   GITHUB_TOKEN=ghp_your_github_token_here
   LLM_PROVIDER=anthropic
   PORT=5000
```

5. **Start the agent**
```bash
   npm run dev
```

## 🔑 Getting API Keys

### GitHub Token
1. Go to [GitHub Settings → Tokens](https://github.com/settings/tokens)
2. Generate new token (classic)
3. Select scopes: `repo` and `read:user`
4. Copy token to `.env`

### Daemo Agent API Key
1. Visit [Daemo AI](https://app.daemo.ai/)
2. Navigate to API settings
3. Generate agent API key
4. Copy to `.env`

### Claude API Key
1. Sign up at [Anthropic Console](https://console.anthropic.com/)
2. Create API key
3. Copy to `.env`

## 🎯 Available Functions

### 1. analyzeAllRepositories
Comprehensive analysis of all your repositories.

**Input:**
```json
{
  "username": "optional",
  "includePrivate": true
}
```

**Output:**
- Total repositories analyzed
- Issues found with severity levels (high/medium/low)
- Summary statistics

### 2. getRepositoryHealth
Detailed health analysis for a specific repository.

**Input:**
```json
{
  "owner": "selin-ozdemir",
  "repo": "github_repo_organizer"
}
```

**Output:**
- Health score (0-100)
- Issues list
- Strengths
- Prioritized recommendations

### 3. findRepositoriesWithIssues
Search for repositories with specific problems.

**Input:**
```json
{
  "issueType": "missing-license" | "missing-readme" | "weak-description" | "stale" | "all"
}
```

**Output:**
- List of matching repositories
- Issue descriptions
- Repository URLs

### 4. getPortfolioStatistics
Portfolio-wide insights and statistics.

**Input:** `{}` (no parameters needed)

**Output:**
- Total repositories (public/private split)
- Total stars and forks
- Language breakdown
- License coverage percentage
- AI-generated insights

## 📡 API Usage

### Query the Agent
```bash
curl -X POST http://localhost:5000/agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Analyze all my GitHub repositories"}'
```

### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/agent/query" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"query": "Show me my portfolio statistics"}'
```

### Response Format
```json
{
  "success": true,
  "response": "I've analyzed all 7 of your repositories...",
  "threadId": "thread_abc123",
  "toolInteractions": [...],
  "executionTimeMs": 1250
}
```

## 🏗️ Architecture
```
┌─────────────────────────────────────────┐
│   Daemo AI Agent (localhost:5000)      │
├─────────────────────────────────────────┤
│                                         │
│  GitHub Analyzer Service                │
│  ├── analyzeAllRepositories()          │
│  ├── getRepositoryHealth()             │
│  ├── findRepositoriesWithIssues()      │
│  └── getPortfolioStatistics()          │
│                                         │
│  Integrated with:                       │
│  ├── Claude AI (Anthropic)             │
│  ├── GitHub API                         │
│  └── Daemo Platform                     │
└─────────────────────────────────────────┘
         ↕ (Connected via gRPC)
┌─────────────────────────────────────────┐
│   Daemo Gateway                         │
│   https://engine.daemo.ai:50052         │
└─────────────────────────────────────────┘
```

## 🎓 Example Queries
```
"Analyze all my GitHub repositories"
→ Returns comprehensive analysis with all issues found

"What's the health score of my github_repo_organizer repo?"
→ Returns detailed health report with score and recommendations

"Find all repositories missing a LICENSE"
→ Lists all repos without licenses

"Show me repos that haven't been updated in 6 months"
→ Finds stale repositories

"What are my portfolio statistics?"
→ Overview of all repos with language breakdown
```

## 🐛 Known Issues

### Server Connection (In Progress)
- Daemo gateway connection: ✅ Working
- Agent registration: ✅ Working
- Express server: ⚠️ Debugging connection issue
- Status: Seeking support from Daemo team

## 📝 Development

### Project Structure
```
daemo-agent/
├── src/
│   ├── app.ts                    # Main entry point
│   ├── services/
│   │   ├── githubFunctions.ts   # GitHub analysis functions
│   │   └── daemoService.ts      # Service registration
│   ├── controllers/
│   │   └── agentController.ts   # Request handling
│   └── middlewares/
│       └── errorHandler.ts      # Error handling
├── package.json
├── .env.example
└── README.md
```

### Adding New Functions

1. Add method to `githubFunctions.ts`
2. Use `@DaemoFunction` decorator
3. Define input/output schemas with Zod
4. Restart the agent

Example:
```typescript
@DaemoFunction({
  description: "Your function description",
  tags: ["github"],
  category: "GitHub Analysis",
  inputSchema: z.object({...}),
  outputSchema: z.object({...})
})
async yourFunction(input: {...}) {
  // Your logic here
}
```

## 🤝 Contributing

This project was built for the Daemo AI Fellowship program. Feedback and suggestions are welcome!

## 📄 License

MIT License

## 👤 Author

**Selin Ozdemir**
- GitHub: [@selin-ozdemir](https://github.com/selin-ozdemir)

## 🙏 Acknowledgments

- Built with [Daemo AI Platform](https://www.daemo.ai/)
- Powered by [Claude AI](https://www.anthropic.com/) (Anthropic)
- Uses [Octokit](https://github.com/octokit/rest.js) for GitHub API

---

**Status:** 🚀 Active Development | Daemo Fellowship Project
**Agent ID:** 696e749bf290ceb142d6f946
