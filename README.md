# GitHub Repository Manager 🚀

An AI-powered GitHub repository analyzer and management tool built with Daemo AI. Automatically analyze, fix, and maintain your GitHub repositories through natural language commands.

## ✨ Features

- 🔍 **Analyze Repositories** - Get health scores and identify issues across all your repos
- 📄 **Auto-add LICENSE files** - Automatically add MIT, Apache, or GPL licenses
- 📝 **Auto-add README files** - Generate professional README templates
- 🔒 **Manage Visibility** - Make repositories public or private
- 🤖 **Auto-fix Issues** - Automatically fix common problems across all repos
- 📊 **Portfolio Statistics** - Get insights on languages, stars, and health metrics

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [GitHub Personal Access Token](https://github.com/settings/tokens)
- [Daemo AI Account](https://daemo.ai)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/selin-ozdemir/github_repo_organizer.git
cd github_repo_organizer
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and add your keys:
```bash
GITHUB_TOKEN=your_github_token_here
DAEMO_AGENT_API_KEY=your_daemo_api_key_here
DAEMO_AGENT_ID=your_agent_id_here
```

4. **Start the server:**
```bash
npm run dev
```

The server will start at `http://localhost:5000` and connect to Daemo AI.

## 🎯 Usage

Once the server is running, interact with your GitHub repositories through the Daemo chatbot:

### Example Commands

**Analyze repositories:**
- "Analyze all my repositories"
- "List all repository names"
- "Get portfolio statistics"
- "Find repositories with issues"

**Fix issues:**
- "Add MIT license to [repo-name]"
- "Add README to [repo-name]"
- "Make [repo-name] private"
- "Automatically fix all issues in my repositories"

**Get health reports:**
- "Check the health of [repo-name]"
- "What issues does my portfolio have?"

## 🛠️ Available Functions

| Function | Description |
|----------|-------------|
| `analyzeAllRepositories` | Scan all repos for health issues and recommendations |
| `listAllRepositoryNames` | List all repository names with basic info |
| `getRepositoryHealth` | Get detailed health score for a specific repo |
| `findRepositoriesWithIssues` | Find repos with specific problems |
| `getPortfolioStatistics` | Get portfolio-wide statistics and insights |
| `addLicenseToRepo` | Add a LICENSE file to a repository |
| `addReadmeToRepo` | Add a README file to a repository |
| `autoFixAllIssues` | Automatically fix common issues across all repos |
| `changeRepoVisibility` | Make a repository public or private |

## 🔐 Security

- ⚠️ **Never commit your `.env` file** - It contains sensitive tokens
- ✅ Your `.gitignore` is configured to prevent token exposure
- 🔑 Store tokens securely and regenerate them if compromised
- 🔒 This tool is for personal use - see deployment notes for multi-user setup

## 📁 Project Structure
```
github_repo_organizer/
├── src/
│   ├── app.ts                    # Main server entry point
│   ├── services/
│   │   ├── daemoService.ts       # Daemo service registration
│   │   └── githubFunctions.ts    # GitHub API functions
│   └── controllers/
│       └── agentController.ts    # Query handling
├── .env                          # Your tokens (git-ignored)
├── .env.example                  # Template for environment variables
├── package.json
└── README.md
```

## 🚧 Deployment

**For personal use:**
- Current setup works great! Just run `npm run dev` when needed.

**For multi-user deployment:**
- Implement GitHub OAuth flow
- Add user authentication
- Store user tokens encrypted in a database
- See security notes in code comments

## 🤝 Contributing

Contributions are welcome! This is a personal project but feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Selin Ozdemir**
- GitHub: [@selin-ozdemir](https://github.com/selin-ozdemir)

## 🙏 Acknowledgments

- Built with [Daemo AI](https://daemo.ai)
- Powered by [GitHub API](https://docs.github.com/en/rest)
- Uses [Octokit](https://github.com/octokit/rest.js)

---

**Need help?** Check the [issues](https://github.com/selin-ozdemir/github_repo_organizer/issues) or reach out!
