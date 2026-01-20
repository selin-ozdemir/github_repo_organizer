/*
 * =========================================================================================
 *  SERVICE REGISTRY - CUSTOMIZATION POINT
 * =========================================================================================
 */

import { DaemoBuilder, DaemoHostedConnection, SessionData } from "daemo-engine";
import { GitHubFunctions } from "./githubFunctions";

let hostedConnection: DaemoHostedConnection | null = null;
let sessionData: SessionData | null = null;

const systemPrompt = `You are an expert GitHub repository analyst and software engineering consultant.

Your role is to help developers:
- Analyze their GitHub repositories for quality and completeness
- Identify missing documentation, licenses, and best practices
- Provide actionable recommendations to improve repository health
- Track portfolio-wide statistics and trends

## 🛠️ TOOLKIT

### 1. analyzeAllRepositories
Scan all repositories for a comprehensive overview.
- **Input**: { username?: string, includePrivate?: boolean }
- Returns: Total repos, issues found with severity levels, summary

### 2. getRepositoryHealth
Deep dive into a specific repository with health scoring.
- **Input**: { owner: string, repo: string }
- Returns: Health score (0-100), issues, strengths, recommendations

### 3. findRepositoriesWithIssues
Search for repositories with specific problems.
- **Input**: { issueType: "missing-license" | "missing-readme" | "weak-description" | "stale" | "all" }
- Returns: List of repositories with the specified issue

### 4. getPortfolioStatistics
Get portfolio-wide statistics and insights.
- **Input**: {} (no parameters needed)
- Returns: Comprehensive stats including language breakdown, license coverage, insights

## 📋 BEST PRACTICES
- Always be constructive and encouraging
- Prioritize high-impact improvements
- Explain WHY each recommendation matters
- Provide specific, actionable steps
- Recognize what's being done well

Always be helpful, professional, and focused on actionable improvements!
`;

export function initializeDaemoService(): SessionData {
  console.log("[Daemo] Initializing GitHub Repository Analyzer service...");

  const builder = new DaemoBuilder()
    .withServiceName("github_analyzer_service")
    .withSystemPrompt(systemPrompt);

  // Register the GitHub analysis service
  const githubFunctions = new GitHubFunctions();
  builder.registerService(githubFunctions);

  sessionData = builder.build();
  sessionData.Port = 50052;
  console.log(`[Daemo] Registered ${sessionData.Functions.length} functions`);

  return sessionData;
}

export async function startHostedConnection(
  sessionData: SessionData,
): Promise<void> {
  const agentApiKey = process.env.DAEMO_AGENT_API_KEY;
  const gatewayUrl = process.env.DAEMO_GATEWAY_URL || "localhost:50052";

  if (!agentApiKey) {
    console.warn(
      "[Daemo] DAEMO_AGENT_API_KEY not set. Hosted connection will not start.",
    );
    return;
  }

  console.log(`[Daemo] Starting hosted connection to ${gatewayUrl}...`);

  hostedConnection = new DaemoHostedConnection(
    {
      daemoGatewayUrl: gatewayUrl,
      agentApiKey: agentApiKey,
    },
    sessionData,
  );

  await hostedConnection.start();
  console.log("[Daemo] Hosted connection started successfully");
}

export function stopHostedConnection(): void {
  if (hostedConnection) {
    hostedConnection.stop();
    hostedConnection = null;
    console.log("[Daemo] Hosted connection stopped");
  }
}

export function getSessionData(): SessionData | null {
  return sessionData;
}
