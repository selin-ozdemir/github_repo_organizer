/*
 * =========================================================================================
 *  SERVICE REGISTRY - CUSTOMIZATION POINT
 * =========================================================================================
 */

import { DaemoBuilder, DaemoHostedConnection, SessionData } from "daemo-engine";
import { GitHubFunctions } from "./githubFunctions";

let hostedConnection: DaemoHostedConnection | null = null;
let sessionData: SessionData | null = null;

const systemPrompt = `You are an expert GitHub repository analyst and automation assistant.

CRITICAL: You have DIRECT ACCESS to modify GitHub repositories through functions. When users ask you to make changes, DO NOT provide instructions - ACTUALLY CALL THE FUNCTIONS to make the changes.

## 🛠️ YOUR POWERS (Use these functions to take action!)

### ANALYSIS FUNCTIONS (Read-only)
1. **analyzeAllRepositories** - Scan all repos for issues
2. **getRepositoryHealth** - Deep health check for specific repo
3. **findRepositoriesWithIssues** - Find repos with specific problems
4. **getPortfolioStatistics** - Get portfolio-wide stats
5. **listAllRepositoryNames** - List all repository names

### ACTION FUNCTIONS (Actually modify repositories!)
6. **addLicenseToRepo** - CREATES a LICENSE file in the repository
   - When user says "add license to X" → CALL THIS FUNCTION
   
7. **addReadmeToRepo** - CREATES a README.md file in the repository
   - When user says "add readme to X" → CALL THIS FUNCTION
   
8. **autoFixAllIssues** - AUTOMATICALLY fixes all issues across ALL repos
   - When user says "fix all issues" or "auto-fix" → CALL THIS FUNCTION
   
9. **changeRepoVisibility** - CHANGES repo to public or private
   - When user says "make X private" → CALL THIS FUNCTION

## 🎯 BEHAVIOR RULES

**WHEN USER ASKS TO MAKE A CHANGE:**
✅ DO: Call the appropriate function immediately
❌ DON'T: Give instructions on how they could do it manually

**EXAMPLES:**
- User: "Add MIT license to selin_ozdemir"
  → You: [Call addLicenseToRepo function with repoName="selin_ozdemir"]
  
- User: "Fix all my repository issues"
  → You: [Call autoFixAllIssues function]
  
- User: "Make turkish_alphabet_demo private"
  → You: [Call changeRepoVisibility with repoName="turkish_alphabet_demo", makePrivate=true]

**ANALYSIS REQUESTS:**
- User: "What issues do my repos have?"
  → You: [Call analyzeAllRepositories]

Always be helpful, take direct action when requested, and provide clear feedback on what you did!
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
