const { Octokit } = require('@octokit/rest');
const { Daemo } = require('daemo-engine');
require('dotenv').config();

/**
 * Complete AI GitHub Repository Manager with Daemo AI Integration
 * 
 * Features:
 * - Analyze repositories
 * - Add LICENSE and README files
 * - Auto-fix common issues
 * - Change repository visibility
 * - Get health reports and statistics
 */

// Initialize Daemo SDK for function registration
const daemo = new Daemo({
    apiKey: process.env.DAEMO_API_KEY,
});

// Daemo AI Client Setup
class DaemoClient {
    constructor() {
        this.apiKey = process.env.DAEMO_API_KEY;
        this.agentId = process.env.DAEMO_AGENT_ID;
        this.baseUrl = 'https://backend.daemo.ai';
    }

    /**
     * Use natural language to query repository data stored in Daemo
     */
    async query(naturalLanguageQuery) {
        try {
            const response = await fetch(`${this.baseUrl}/agents/${this.agentId}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({
                    query: naturalLanguageQuery,
                    schema: 'github_repos'
                })
            });

            if (!response.ok) {
                throw new Error(`Daemo API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.results;
        } catch (error) {
            console.error(`⚠️ Daemo query failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Store repository analysis results in Daemo's database
     */
    async storeAnalysis(repoData) {
        try {
            const response = await fetch(`${this.baseUrl}/store`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    schema: 'github_repos',
                    data: repoData
                })
            });

            if (!response.ok) {
                throw new Error(`Daemo storage error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`⚠️ Daemo storage failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Use Daemo's AI to generate insights from stored data
     */
    async generateInsights(context) {
        try {
            const response = await fetch(`${this.baseUrl}/insights`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    schema: 'github_repos',
                    context: context,
                    analysisType: 'repository_health'
                })
            });

            if (!response.ok) {
                throw new Error(`Daemo insights error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`⚠️ Daemo insights failed: ${error.message}`);
            return null;
        }
    }
}

// ==================== DAEMO REGISTERED FUNCTIONS ====================

/**
 * Get detailed analysis of ALL repositories with full information
 */
daemo.register('analyzeAllRepositories', async (username) => {
    try {
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });

        // Use authenticated user if no username provided
        let repos;
        if (username) {
            const { data } = await octokit.repos.listForUser({
                username: username,
                per_page: 100,
                type: 'all'
            });
            repos = data;
        } else {
            const { data } = await octokit.repos.listForAuthenticatedUser({
                per_page: 100
            });
            repos = data;
        }

        let totalStars = 0;
        let totalForks = 0;
        const languages = {};
        const repoDetails = [];

        for (const repo of repos) {
            totalStars += repo.stargazers_count;
            totalForks += repo.forks_count;

            if (repo.language) {
                languages[repo.language] = (languages[repo.language] || 0) + 1;
            }

            // Check for README
            let hasReadme = false;
            try {
                await octokit.repos.getContent({
                    owner: repo.owner.login,
                    repo: repo.name,
                    path: 'README.md'
                });
                hasReadme = true;
            } catch (e) {
                // README doesn't exist
            }

            // Check for issues
            const issues = [];
            
            if (!repo.license) {
                issues.push('Missing LICENSE file');
            }
            
            if (!hasReadme) {
                issues.push('Missing README.md');
            }
            
            if (!repo.description || repo.description.length < 10) {
                issues.push('Weak or missing description');
            }
            
            const practiceKeywords = ['practice', 'test', 'learning', 'tutorial', 'example', 'demo', 'temp', 'experiment'];
            const isPractice = practiceKeywords.some(keyword => 
                repo.name.toLowerCase().includes(keyword) ||
                (repo.description && repo.description.toLowerCase().includes(keyword))
            );
            
            if (isPractice && !repo.private) {
                issues.push('Practice/demo code should be private');
            }

            repoDetails.push({
                name: repo.name,
                description: repo.description || 'No description',
                url: repo.html_url,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                language: repo.language || 'Not specified',
                hasLicense: !!repo.license,
                hasReadme: hasReadme,
                isPrivate: repo.private,
                lastUpdated: new Date(repo.updated_at).toLocaleDateString(),
                issues: issues,
                healthScore: Math.max(0, 100 - (issues.length * 20))
            });
        }

        // Sort by stars
        repoDetails.sort((a, b) => b.stars - a.stars);

        // Find most common language
        const mostCommonLang = Object.keys(languages).length > 0
            ? Object.entries(languages).sort((a, b) => b[1] - a[1])[0][0]
            : 'N/A';

        // Build response - SHOW ALL REPOS
        let response = `# Complete GitHub Repository Analysis\n\n`;
        response += `**User:** ${username || 'authenticated user'}\n\n`;
        
        response += `## Summary Statistics\n`;
        response += `* 📊 **Total repositories:** ${repos.length}\n`;
        response += `* ⭐ **Total stars:** ${totalStars}\n`;
        response += `* 🍴 **Total forks:** ${totalForks}\n`;
        response += `* 💻 **Most common language:** ${mostCommonLang}\n`;
        response += `* ⚠️ **Repos with issues:** ${repoDetails.filter(r => r.issues.length > 0).length}\n`;
        response += `* ✅ **Healthy repos:** ${repoDetails.filter(r => r.issues.length === 0).length}\n\n`;

        response += `## All Repositories\n\n`;

        repoDetails.forEach((repo, index) => {
            const statusEmoji = repo.issues.length === 0 ? '✅' : '⚠️';
            response += `### ${index + 1}. ${statusEmoji} [${repo.name}](${repo.url})\n`;
            response += `   * **Description:** ${repo.description}\n`;
            response += `   * **Language:** ${repo.language}\n`;
            response += `   * **Stars:** ⭐ ${repo.stars} | **Forks:** 🍴 ${repo.forks}\n`;
            response += `   * **Health Score:** ${repo.healthScore}/100\n`;
            response += `   * **License:** ${repo.hasLicense ? '✅ Yes' : '❌ Missing'}\n`;
            response += `   * **README:** ${repo.hasReadme ? '✅ Yes' : '❌ Missing'}\n`;
            response += `   * **Visibility:** ${repo.isPrivate ? '🔒 Private' : '🌐 Public'}\n`;
            
            if (repo.issues.length > 0) {
                response += `   * **Issues:**\n`;
                repo.issues.forEach(issue => response += `      - ${issue}\n`);
            } else {
                response += `   * **Status:** No issues detected! 🎉\n`;
            }
            
            response += `   * **Last updated:** ${repo.lastUpdated}\n\n`;
        });

        // Summary of issues
        const reposWithIssues = repoDetails.filter(r => r.issues.length > 0);
        if (reposWithIssues.length > 0) {
            response += `## Issues Summary\n\n`;
            
            const allIssues = {};
            reposWithIssues.forEach(repo => {
                repo.issues.forEach(issue => {
                    if (!allIssues[issue]) {
                        allIssues[issue] = [];
                    }
                    allIssues[issue].push(repo.name);
                });
            });

            Object.entries(allIssues).forEach(([issue, repos]) => {
                response += `### ${issue} (${repos.length} repos)\n`;
                repos.forEach(repoName => response += `* ${repoName}\n`);
                response += '\n';
            });
        }

        return response;

    } catch (error) {
        return `Error analyzing repositories: ${error.message}`;
    }
});

/**
 * Simply list all repository names
 */
daemo.register('listAllRepositoryNames', async (username) => {
    try {
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });

        let repos;
        if (username) {
            const { data } = await octokit.repos.listForUser({
                username: username,
                per_page: 100
            });
            repos = data;
        } else {
            const { data } = await octokit.repos.listForAuthenticatedUser({
                per_page: 100
            });
            repos = data;
        }

        let response = `# All Repository Names for ${username || 'authenticated user'}\n\n`;
        response += `**Total:** ${repos.length} repositories\n\n`;
        
        repos.forEach((repo, index) => {
            const privacyIcon = repo.private ? '🔒' : '🌐';
            response += `${index + 1}. ${privacyIcon} **${repo.name}**\n`;
            response += `   - ${repo.description || 'No description'}\n`;
            response += `   - Language: ${repo.language || 'Not specified'}\n`;
            response += `   - ${repo.html_url}\n\n`;
        });

        return response;

    } catch (error) {
        return `Error listing repositories: ${error.message}`;
    }
});

/**
 * Get repository health for a specific repo
 */
daemo.register('getRepositoryHealth', async (repoUrl) => {
    try {
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });

        // Parse repo URL or name
        let owner, repoName;
        
        if (repoUrl.includes('github.com')) {
            const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
            if (!match) {
                return 'Invalid GitHub URL';
            }
            [, owner, repoName] = match;
        } else {
            // Assume format is "owner/repo"
            [owner, repoName] = repoUrl.split('/');
        }

        const { data: repo } = await octokit.repos.get({
            owner,
            repo: repoName
        });

        let healthScore = 100;
        const issues = [];

        // Check license
        if (!repo.license) {
            healthScore -= 20;
            issues.push('❌ Missing LICENSE file');
        }

        // Check README
        try {
            await octokit.repos.getContent({
                owner,
                repo: repoName,
                path: 'README.md'
            });
        } catch (e) {
            healthScore -= 20;
            issues.push('❌ Missing README.md');
        }

        // Check description
        if (!repo.description || repo.description.length < 10) {
            healthScore -= 10;
            issues.push('⚠️ Weak or missing description');
        }

        // Check recent activity
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        if (new Date(repo.updated_at) < sixMonthsAgo) {
            healthScore -= 10;
            issues.push('⏰ Not updated in 6+ months');
        }

        let response = `# Repository Health Report\n\n`;
        response += `## ${repo.name}\n`;
        response += `**URL:** ${repo.html_url}\n\n`;
        response += `### Health Score: ${healthScore}/100\n\n`;
        
        if (issues.length === 0) {
            response += `✅ **Excellent!** No issues found.\n\n`;
        } else {
            response += `### Issues Found\n\n`;
            issues.forEach(issue => response += `${issue}\n`);
            response += '\n';
        }

        response += `### Stats\n`;
        response += `* ⭐ Stars: ${repo.stargazers_count}\n`;
        response += `* 🍴 Forks: ${repo.forks_count}\n`;
        response += `* 👁️ Watchers: ${repo.watchers_count}\n`;
        response += `* 📝 Language: ${repo.language || 'Not specified'}\n`;
        response += `* 📅 Last updated: ${new Date(repo.updated_at).toLocaleDateString()}\n`;

        return response;

    } catch (error) {
        return `Error checking repository health: ${error.message}`;
    }
});

/**
 * Find repositories with specific issues
 */
daemo.register('findRepositoriesWithIssues', async (username) => {
    try {
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });

        let repos;
        if (username) {
            const { data } = await octokit.repos.listForUser({
                username: username,
                per_page: 100
            });
            repos = data;
        } else {
            const { data } = await octokit.repos.listForAuthenticatedUser({
                per_page: 100
            });
            repos = data;
        }

        const reposWithIssues = [];

        for (const repo of repos) {
            const issues = [];
            
            if (!repo.license) {
                issues.push({ severity: 'high', issue: 'Missing LICENSE file' });
            }
            
            try {
                await octokit.repos.getContent({
                    owner: repo.owner.login,
                    repo: repo.name,
                    path: 'README.md'
                });
            } catch (e) {
                issues.push({ severity: 'high', issue: 'Missing README.md' });
            }
            
            const practiceKeywords = ['practice', 'test', 'learning', 'tutorial', 'example', 'demo', 'temp'];
            const isPractice = practiceKeywords.some(keyword => 
                repo.name.toLowerCase().includes(keyword)
            );
            
            if (isPractice && !repo.private) {
                issues.push({ severity: 'medium', issue: 'Practice/demo code should be private' });
            }

            if (issues.length > 0) {
                reposWithIssues.push({
                    name: repo.name,
                    url: repo.html_url,
                    issues: issues
                });
            }
        }

        let response = `# Repositories with Issues\n\n`;
        response += `Found ${reposWithIssues.length} repositories with issues:\n\n`;

        reposWithIssues.forEach((repo, index) => {
            response += `## ${index + 1}. [${repo.name}](${repo.url})\n`;
            repo.issues.forEach(issue => {
                const emoji = issue.severity === 'high' ? '🔴' : '🟡';
                response += `   * ${emoji} **[${issue.severity}]** ${issue.issue}\n`;
            });
            response += '\n';
        });

        return response;

    } catch (error) {
        return `Error finding repositories with issues: ${error.message}`;
    }
});

/**
 * Get portfolio-wide statistics
 */
daemo.register('getPortfolioStatistics', async (username) => {
    try {
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });

        let repos;
        if (username) {
            const { data } = await octokit.repos.listForUser({
                username: username,
                per_page: 100
            });
            repos = data;
        } else {
            const { data } = await octokit.repos.listForAuthenticatedUser({
                per_page: 100
            });
            repos = data;
        }

        let totalStars = 0;
        let totalForks = 0;
        const languages = {};
        let withLicense = 0;
        let withReadme = 0;
        let privateRepos = 0;

        for (const repo of repos) {
            totalStars += repo.stargazers_count;
            totalForks += repo.forks_count;
            
            if (repo.language) {
                languages[repo.language] = (languages[repo.language] || 0) + 1;
            }
            
            if (repo.license) withLicense++;
            if (repo.private) privateRepos++;
            
            try {
                await octokit.repos.getContent({
                    owner: repo.owner.login,
                    repo: repo.name,
                    path: 'README.md'
                });
                withReadme++;
            } catch (e) {
                // No README
            }
        }

        const topLanguages = Object.entries(languages)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        let response = `# Portfolio Statistics\n\n`;
        response += `**User:** ${username || 'authenticated user'}\n\n`;
        response += `## Overview\n`;
        response += `* 📊 **Total Repositories:** ${repos.length}\n`;
        response += `* 🌐 **Public:** ${repos.length - privateRepos}\n`;
        response += `* 🔒 **Private:** ${privateRepos}\n`;
        response += `* ⭐ **Total Stars:** ${totalStars}\n`;
        response += `* 🍴 **Total Forks:** ${totalForks}\n\n`;

        response += `## Repository Health\n`;
        response += `* ✅ **With LICENSE:** ${withLicense} (${Math.round(withLicense/repos.length*100)}%)\n`;
        response += `* 📝 **With README:** ${withReadme} (${Math.round(withReadme/repos.length*100)}%)\n\n`;

        response += `## Top Languages\n`;
        topLanguages.forEach(([lang, count], index) => {
            response += `${index + 1}. **${lang}**: ${count} repos\n`;
        });

        return response;

    } catch (error) {
        return `Error getting portfolio statistics: ${error.message}`;
    }
});

/**
 * Add LICENSE file to a repository
 */
daemo.register('addLicenseToRepo', async (repoName, licenseType = 'MIT') => {
    try {
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });

        // Parse repo name
        let owner, repo;
        if (repoName.includes('/')) {
            [owner, repo] = repoName.split('/');
        } else {
            const { data: user } = await octokit.users.getAuthenticated();
            owner = user.login;
            repo = repoName;
        }

        // License templates
        const licenses = {
            'MIT': `MIT License

Copyright (c) ${new Date().getFullYear()} ${owner}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`,
            'Apache-2.0': `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

Copyright ${new Date().getFullYear()} ${owner}

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`,
            'GPL-3.0': `GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) ${new Date().getFullYear()} ${owner}

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.`
        };

        const licenseContent = licenses[licenseType] || licenses['MIT'];

        // Check if LICENSE already exists
        try {
            await octokit.repos.getContent({
                owner,
                repo,
                path: 'LICENSE'
            });
            return `⚠️ LICENSE file already exists in ${owner}/${repo}. Delete it first if you want to replace it.`;
        } catch (e) {
            // LICENSE doesn't exist, proceed to create
        }

        // Create LICENSE file
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: 'LICENSE',
            message: `Add ${licenseType} LICENSE`,
            content: Buffer.from(licenseContent).toString('base64')
        });

        return `✅ Successfully added ${licenseType} LICENSE to ${owner}/${repo}!`;

    } catch (error) {
        return `❌ Error adding LICENSE: ${error.message}`;
    }
});

/**
 * Add README file to a repository
 */
daemo.register('addReadmeToRepo', async (repoName, title = null, description = null) => {
    try {
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });

        // Parse repo name
        let owner, repo;
        if (repoName.includes('/')) {
            [owner, repo] = repoName.split('/');
        } else {
            const { data: user } = await octokit.users.getAuthenticated();
            owner = user.login;
            repo = repoName;
        }

        // Get repo info for better README
        const { data: repoData } = await octokit.repos.get({ owner, repo });

        const readmeTitle = title || repoData.name;
        const readmeDescription = description || repoData.description || 'A description of this project.';

        const readmeContent = `# ${readmeTitle}

${readmeDescription}

## Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/${owner}/${repo}.git
cd ${repo}

# Install dependencies (if applicable)
npm install
# or
pip install -r requirements.txt
\`\`\`

## Usage

\`\`\`bash
# Add usage instructions here
\`\`\`

## Features

- Feature 1
- Feature 2
- Feature 3

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ${repoData.license ? repoData.license.name : 'MIT'} License - see the [LICENSE](LICENSE) file for details.

## Contact

Created by [@${owner}](https://github.com/${owner})
`;

        // Check if README already exists
        try {
            await octokit.repos.getContent({
                owner,
                repo,
                path: 'README.md'
            });
            return `⚠️ README.md already exists in ${owner}/${repo}. Delete it first if you want to replace it.`;
        } catch (e) {
            // README doesn't exist, proceed to create
        }

        // Create README file
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: 'README.md',
            message: 'Add README.md',
            content: Buffer.from(readmeContent).toString('base64')
        });

        return `✅ Successfully added README.md to ${owner}/${repo}!`;

    } catch (error) {
        return `❌ Error adding README: ${error.message}`;
    }
});

/**
 * Automatically fix all issues in repositories
 */
daemo.register('autoFixAllIssues', async (username = null) => {
    try {
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });

        let repos;
        if (username) {
            const { data } = await octokit.repos.listForUser({
                username: username,
                per_page: 100
            });
            repos = data;
        } else {
            const { data } = await octokit.repos.listForAuthenticatedUser({
                per_page: 100
            });
            repos = data;
        }

        const results = [];

        // Get authenticated user to check ownership
        const { data: user } = await octokit.users.getAuthenticated();

        for (const repo of repos) {
            const fixedIssues = [];

            // Only fix repos you own
            if (repo.owner.login !== user.login) {
                continue;
            }

            // Check and add LICENSE
            if (!repo.license) {
                try {
                    await octokit.repos.getContent({
                        owner: repo.owner.login,
                        repo: repo.name,
                        path: 'LICENSE'
                    });
                } catch (e) {
                    // LICENSE doesn't exist, add it
                    const licenseContent = `MIT License

Copyright (c) ${new Date().getFullYear()} ${repo.owner.login}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

                    await octokit.repos.createOrUpdateFileContents({
                        owner: repo.owner.login,
                        repo: repo.name,
                        path: 'LICENSE',
                        message: 'Add MIT LICENSE',
                        content: Buffer.from(licenseContent).toString('base64')
                    });
                    fixedIssues.push('Added LICENSE');
                }
            }

            // Check and add README
            try {
                await octokit.repos.getContent({
                    owner: repo.owner.login,
                    repo: repo.name,
                    path: 'README.md'
                });
            } catch (e) {
                // README doesn't exist, add it
                const readmeContent = `# ${repo.name}

${repo.description || 'A description of this project.'}

## Installation

\`\`\`bash
git clone https://github.com/${repo.owner.login}/${repo.name}.git
\`\`\`

## Usage

Add usage instructions here.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
`;

                await octokit.repos.createOrUpdateFileContents({
                    owner: repo.owner.login,
                    repo: repo.name,
                    path: 'README.md',
                    message: 'Add README.md',
                    content: Buffer.from(readmeContent).toString('base64')
                });
                fixedIssues.push('Added README');
            }

            // Make practice repos private
            const practiceKeywords = ['practice', 'demo', 'test', 'learning', 'tutorial', 'example', 'temp'];
            const isPractice = practiceKeywords.some(keyword => 
                repo.name.toLowerCase().includes(keyword)
            );
            
            if (isPractice && !repo.private) {
                await octokit.repos.update({
                    owner: repo.owner.login,
                    repo: repo.name,
                    private: true
                });
                fixedIssues.push('Made private');
            }

            if (fixedIssues.length > 0) {
                results.push(`✅ **${repo.name}**: ${fixedIssues.join(', ')}`);
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (results.length === 0) {
            return '✅ No issues to fix! All repositories are healthy.';
        }

        let response = `# Auto-Fix Results\n\n`;
        response += `Fixed issues in ${results.length} repositories:\n\n`;
        results.forEach(result => response += `${result}\n`);

        return response;

    } catch (error) {
        return `❌ Error during auto-fix: ${error.message}`;
    }
});

/**
 * Make a repository private or public
 */
daemo.register('changeRepoVisibility', async (repoName, makePrivate = true) => {
    try {
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });

        // Parse repo name
        let owner, repo;
        if (repoName.includes('/')) {
            [owner, repo] = repoName.split('/');
        } else {
            const { data: user } = await octokit.users.getAuthenticated();
            owner = user.login;
            repo = repoName;
        }

        await octokit.repos.update({
            owner,
            repo,
            private: makePrivate
        });

        return `✅ Successfully made ${owner}/${repo} ${makePrivate ? 'private' : 'public'}!`;

    } catch (error) {
        return `❌ Error changing visibility: ${error.message}`;
    }
});

// ==================== END DAEMO REGISTERED FUNCTIONS ====================

// AI-powered analysis using Claude
async function analyzeWithAI(repo, octokit) {
    console.log(`🤖 AI Analysis for: ${repo.name}`);
    
    try {
        let readmeContent = '';
        try {
            const { data: readme } = await octokit.repos.getContent({
                owner: repo.owner.login,
                repo: repo.name,
                path: 'README.md'
            });
            readmeContent = Buffer.from(readme.content, 'base64').toString('utf-8');
        } catch (error) {
            readmeContent = 'No README found';
        }

        let commitActivity = '';
        try {
            const { data: commits } = await octokit.repos.listCommits({
                owner: repo.owner.login,
                repo: repo.name,
                per_page: 5
            });
            commitActivity = commits.map(c => c.commit.message).join('\n');
        } catch (error) {
            commitActivity = 'No commit history available';
        }

        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1000,
                messages: [
                    {
                        role: "user",
                        content: `Analyze this GitHub repository and provide actionable suggestions:

Repository Name: ${repo.name}
Description: ${repo.description || 'No description'}
Language: ${repo.language || 'Not specified'}
Stars: ${repo.stargazers_count}
Forks: ${repo.forks_count}
Is Private: ${repo.private}
Has License: ${repo.license ? 'Yes (' + repo.license.name + ')' : 'No'}
Last Updated: ${repo.updated_at}

README Content:
${readmeContent.substring(0, 2000)}

Recent Commits:
${commitActivity}

Please provide:
1. Overall assessment (1-2 sentences)
2. Top 3 specific improvements with priority (High/Medium/Low)
3. A suggested description if the current one is weak (max 80 characters)
4. Whether this should be public or private based on content
5. Any missing essential files (README, LICENSE, .gitignore, etc.)

Format your response as JSON with keys: assessment, improvements (array of {priority, suggestion}), suggestedDescription, visibility, missingFiles (array).`
                    }
                ],
            })
        });

        const data = await response.json();
        const aiResponse = data.content[0].text;
        
        let analysis;
        try {
            const cleanResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            analysis = JSON.parse(cleanResponse);
        } catch (e) {
            analysis = {
                assessment: aiResponse.substring(0, 200),
                improvements: [{ priority: 'Medium', suggestion: 'Review AI analysis manually' }],
                missingFiles: []
            };
        }

        return analysis;
    } catch (error) {
        console.error(`   ⚠️ AI analysis failed: ${error.message}`);
        return null;
    }
}

async function analyzeRepo(repo, octokit, daemoClient, useAI = true) {
    console.log(`\n🔍 Analyzing: ${repo.name}`);
    console.log(`   📂 ${repo.html_url}`);
    
    const issues = [];
    
    // Basic checks
    if (!repo.license) {
        issues.push('❌ Missing LICENSE file');
    }
    
    if (!repo.description || repo.description.length < 10) {
        issues.push('⚠️  Weak or missing description');
    }
    
    try {
        await octokit.repos.getContent({
            owner: repo.owner.login,
            repo: repo.name,
            path: 'README.md'
        });
    } catch (error) {
        issues.push('❌ Missing README.md');
    }
    
    const practiceKeywords = ['practice', 'test', 'learning', 'tutorial', 'example', 'demo', 'temp', 'experiment'];
    const isPractice = practiceKeywords.some(keyword => 
        repo.name.toLowerCase().includes(keyword) ||
        (repo.description && repo.description.toLowerCase().includes(keyword))
    );
    if (isPractice && !repo.private) {
        issues.push('💡 Looks like practice/demo code - consider making private');
    }
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (new Date(repo.updated_at) < sixMonthsAgo) {
        issues.push('⏰ Repository hasn\'t been updated in 6+ months');
    }
    
    if (issues.length === 0) {
        console.log('   ✅ Basic checks passed!');
    } else {
        console.log('   Issues found:');
        issues.forEach(issue => console.log(`      ${issue}`));
    }
    
    // AI-powered deep analysis
    let aiAnalysis = null;
    if (useAI) {
        aiAnalysis = await analyzeWithAI(repo, octokit);
        
        if (aiAnalysis) {
            console.log('\n   🤖 AI Insights:');
            console.log(`      ${aiAnalysis.assessment}`);
            
            if (aiAnalysis.improvements && aiAnalysis.improvements.length > 0) {
                console.log('\n   📋 Recommended Actions:');
                aiAnalysis.improvements.forEach((imp, idx) => {
                    const emoji = imp.priority === 'High' ? '🔴' : imp.priority === 'Medium' ? '🟡' : '🟢';
                    console.log(`      ${idx + 1}. ${emoji} [${imp.priority}] ${imp.suggestion}`);
                });
            }
            
            if (aiAnalysis.suggestedDescription && (!repo.description || repo.description.length < 10)) {
                console.log(`\n   💡 Suggested Description: "${aiAnalysis.suggestedDescription}"`);
            }
            
            if (aiAnalysis.missingFiles && aiAnalysis.missingFiles.length > 0) {
                console.log(`\n   📄 Missing Files: ${aiAnalysis.missingFiles.join(', ')}`);
            }
        }
    }
    
    // Store in Daemo for future queries
    const analysisData = {
        repo_name: repo.name,
        repo_url: repo.html_url,
        owner: repo.owner.login,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        is_private: repo.private,
        has_license: !!repo.license,
        description: repo.description,
        last_updated: repo.updated_at,
        basic_issues: issues,
        ai_analysis: aiAnalysis,
        analysis_timestamp: new Date().toISOString()
    };
    
    if (daemoClient) {
        await daemoClient.storeAnalysis(analysisData);
        console.log('   💾 Stored in Daemo database');
    }
    
    return { basicIssues: issues, aiAnalysis };
}

async function queryDaemoInsights(daemoClient) {
    console.log('\n🔮 Daemo AI Natural Language Queries');
    console.log('='.repeat(70));
    
    const queries = [
        "Find all repositories with high priority improvements",
        "Show me repositories that haven't been updated in over 6 months",
        "Which repositories are missing LICENSE files?",
        "What are my most starred public repositories?",
        "Find practice repositories that should be made private"
    ];
    
    console.log('\n📊 Running intelligent queries with Daemo AI...\n');
    
    for (const query of queries) {
        console.log(`\n❓ Query: "${query}"`);
        const results = await daemoClient.query(query);
        
        if (results && results.length > 0) {
            console.log(`   ✅ Found ${results.length} results:`);
            results.slice(0, 3).forEach(result => {
                console.log(`      • ${result.repo_name} - ${result.summary || 'No summary'}`);
            });
        } else {
            console.log('   ℹ️  No results found or query failed');
        }
    }
    
    console.log('\n\n🎯 Generating Portfolio Insights with Daemo AI...');
    const insights = await daemoClient.generateInsights({
        analysis_type: 'portfolio_health',
        time_range: '90_days'
    });
    
    if (insights) {
        console.log('\n📈 Key Findings:');
        if (insights.trends) {
            insights.trends.forEach(trend => {
                console.log(`   • ${trend}`);
            });
        }
        
        if (insights.recommendations) {
            console.log('\n💡 Daemo Recommendations:');
            insights.recommendations.forEach(rec => {
                console.log(`   • ${rec}`);
            });
        }
    }
}

async function main() {
    console.log('🚀 Complete AI GitHub Repository Manager');
    console.log('   Powered by Claude AI + Daemo AI\n');
    console.log('🔍 Connecting to GitHub and Daemo...');
    
    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });
    
    // Initialize Daemo client
    const daemoClient = process.env.DAEMO_API_KEY ? new DaemoClient() : null;
    
    if (!daemoClient) {
        console.log('⚠️  Daemo AI not configured. Set DAEMO_API_KEY in .env to enable.');
        console.log('   Running without Daemo integration...\n');
    } else {
        console.log('✅ Daemo AI connected!\n');
    }
    
    const args = process.argv.slice(2);
    const useAI = !args.includes('--no-ai');
    const queryMode = args.includes('--query');
    
    try {
        const { data: repos } = await octokit.repos.listForAuthenticatedUser({
            per_page: 100,
            sort: 'updated',
            direction: 'desc'
        });
        
        console.log(`✅ Found ${repos.length} repositories!\n`);
        console.log('='.repeat(70));
        
        if (queryMode && daemoClient) {
            await queryDaemoInsights(daemoClient);
            return;
        }
        
        const analyses = [];
        for (const repo of repos) {
            const analysis = await analyzeRepo(repo, octokit, daemoClient, useAI);
            analyses.push(analysis);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('📊 ANALYSIS COMPLETE');
        console.log('='.repeat(70));
        
        const totalBasicIssues = analyses.reduce((sum, a) => sum + a.basicIssues.length, 0);
        console.log(`\n⚠️  Total Issues Found: ${totalBasicIssues}`);
        
        if (daemoClient) {
            console.log('\n💡 Pro Tip: Use --query flag to run natural language queries on your data!');
            console.log('   Example: npm start -- --query');
        } else {
            console.log('\n💡 Enable Daemo AI for:');
            console.log('   • Natural language queries of your repos');
            console.log('   • Historical analysis and trends');
            console.log('   • Portfolio-wide insights');
            console.log('   • Automated recommendations');
            console.log('\n   Get started: Add DAEMO_API_KEY to your .env file');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Start Daemo service for registered functions
console.log('🎯 Starting Daemo AI Service...');
daemo.start();

// Run the main analysis function
main();
```

**Save this as your complete script and make sure you have:**

1. **.env file:**
```
GITHUB_TOKEN=your_github_token
DAEMO_API_KEY=your_daemo_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key