# GitHub Repository Organizer

AI-powered tool to help developers create professional, recruiter-ready GitHub profiles by automatically analyzing and organizing repositories.

##  Problem
When applying for internships/jobs, developers often have messy GitHub profiles with:
- Missing LICENSE files
- Weak or no descriptions
- Practice/demo repos cluttering their profile
- Inconsistent documentation

Manual cleanup takes hours. This tool automates it.

##  Current Features (v1)
- Connects to GitHub API to fetch all user repositories
- Analyzes each repo for common issues:
  - Missing LICENSE files
  - Weak or missing descriptions (< 10 characters)
  - Practice/demo code that should be private
- Provides clear, actionable recommendations
- Summary report of total issues across all repos

##  Tech Stack
- **Node.js** - Runtime environment
- **@octokit/rest** - GitHub API integration
- **dotenv** - Secure environment variable management

##  Installation
```bash
# Clone the repository
git clone https://github.com/selin-ozdemir/github-repo-organizer.git
cd github-repo-organizer

# Install dependencies
npm install

# Create .env file with your GitHub token
echo "GITHUB_TOKEN=your_github_token_here" > .env
```

##  Usage
```bash
node index.js
```

**Example Output:**
```
🚀 GitHub Repo Organizer

🔍 Connecting to GitHub...
✅ Found 6 repositories!

==================================================

🔍 Analyzing: turkish_alphabet
✅ Looks good!

🔍 Analyzing: count_loops
Issues found:
  💡 Looks like practice/demo code - consider making private

==================================================

📊 Summary: Found 8 total issues across 6 repos
```

##  Roadmap (Next Iterations)
- [ ] AI-powered description generation using LLMs
- [ ] MongoDB storage for analysis history
- [ ] Auto-generate LICENSE files
- [ ] Auto-update repository descriptions
- [ ] Web UI for easier interaction
- [ ] Batch fix application

##  Use Case
Built to solve my own pain point while applying for Summer 2026 SWE internships. Spent hours manually cleaning up my GitHub profile. This tool automates that process for all developers.

##  Daemo Winter Developer Fellowship
Created as part of the Daemo Winter Developer Fellowship (January 2026).

##  License
MIT License
