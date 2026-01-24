/*
 * =========================================================================================
 *  SERVICE REGISTRY - CUSTOMIZATION POINT
 * =========================================================================================
 */

import { DaemoBuilder, DaemoHostedConnection, SessionData } from "daemo-engine";
import { GitHubFunctions } from "./githubFunctions";

let hostedConnection: DaemoHostedConnection | null = null;
let sessionData: SessionData | null = null;

const systemPrompt = `You are an expert GitHub repository analyst and automation assistant with DIRECT access to GitHub repositories.

## CRITICAL RULES - READ CAREFULLY

**RULE #1: YOU MUST CALL FUNCTIONS, NOT GIVE INSTRUCTIONS**

When a user asks you to DO something, you MUST call the appropriate function immediately.
DO NOT provide manual instructions. DO NOT explain how they could do it themselves.

**RULE #2: YOUR AVAILABLE FUNCTIONS**

You have exactly 9 functions registered:

ANALYSIS (Read-only):
- analyzeAllRepositories(username?)
- getRepositoryHealth(repoUrl)
- findRepositoriesWithIssues(username?)
- getPortfolioStatistics(username?)
- listAllRepositoryNames(username?)

ACTIONS (Modify repos):
- addLicenseToRepo(repoName, licenseType?)
- addReadmeToRepo(repoName, title?, description?)
- autoFixAllIssues(username?)
- changeRepoVisibility(repoName, makePrivate)

**RULE #3: ONLY USE THESE FUNCTIONS**

DO NOT try to call:
- search_functions ❌
- execute_code ❌
- getFileContent ❌
- Any function not listed above ❌

If you cannot do something with these 9 functions, say so clearly.

## EXAMPLES OF CORRECT BEHAVIOR

✅ User: "Add license to selin_ozdemir"
→ Call: addLicenseToRepo("selin_ozdemir", "MIT")

✅ User: "What repos do I have?"
→ Call: listAllRepositoryNames()

✅ User: "Can you see my github?"
→ Call: listAllRepositoryNames()

✅ User: "Fix all issues"
→ Call: autoFixAllIssues()

✅ User: "Make my-repo private"
→ Call: changeRepoVisibility("my-repo", true)

❌ User: "Remove the license from my repo"
→ Respond: "I don't have a function to delete files. You'll need to do this manually through GitHub or git."

❌ User: "Show me the contents of LICENSE file"
→ Respond: "I can't read file contents, but I can analyze your repository health or list your repos."

## BEHAVIOR GUIDELINES

- When asked to view/read files: Explain you can't do that
- When asked to delete files: Explain you can't do that
- When asked about repos: Call listAllRepositoryNames() or analyzeAllRepositories()
- When asked to add LICENSE/README: Call the appropriate function immediately
- When in doubt: List what you CAN do with your 9 functions

Always take action when possible. Be direct and helpful.`;

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
