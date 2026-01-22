import { DaemoFunction } from "daemo-engine";
import { z } from "zod";
import { Octokit } from "@octokit/rest";

/**
 * GitHub Repository Analyzer Service for Daemo
 * 
 * This service provides AI-powered GitHub repository analysis
 * with health scoring, issue detection, and recommendations.
 */
export class GitHubFunctions {
  private octokit: Octokit;

  constructor() {
    // Initialize GitHub client with token from environment
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
  }

  @DaemoFunction({
    description: "Analyze all GitHub repositories for a user and provide health scores and recommendations",
    tags: ["github", "analysis", "repositories"],
    category: "GitHub Analysis",
    inputSchema: z.object({
      username: z.string().optional().describe("GitHub username to analyze (optional, defaults to authenticated user)"),
      includePrivate: z.boolean().optional().default(true).describe("Include private repositories")
    }),
    outputSchema: z.object({
      totalRepos: z.number(),
      analyzed: z.number(),
      issues: z.array(z.object({
        repo: z.string(),
        severity: z.enum(["high", "medium", "low"]),
        issue: z.string()
      })),
      summary: z.string()
    })
  })
  async analyzeAllRepositories(input: { username?: string; includePrivate?: boolean }) {
    try {
      const { data: repos } = await this.octokit.repos.listForAuthenticatedUser({
        per_page: 100,
        sort: 'updated',
        direction: 'desc'
      });

      const issues: Array<{repo: string; severity: "high" | "medium" | "low"; issue: string}> = [];
      
      for (const repo of repos) {
        // Skip private repos if requested
        if (!input.includePrivate && repo.private) continue;

        // Check for missing LICENSE
        if (!repo.license) {
          issues.push({
            repo: repo.name,
            severity: "high",
            issue: "Missing LICENSE file"
          });
        }

        // Check for weak description
        if (!repo.description || repo.description.length < 10) {
          issues.push({
            repo: repo.name,
            severity: "medium",
            issue: "Weak or missing description"
          });
        }

        // Check for README
        try {
          await this.octokit.repos.getContent({
            owner: repo.owner.login,
            repo: repo.name,
            path: 'README.md'
          });
        } catch (error) {
          issues.push({
            repo: repo.name,
            severity: "high",
            issue: "Missing README.md"
          });
        }

        // Check for stale repos (6+ months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        if (repo.updated_at && new Date(repo.updated_at) < sixMonthsAgo) {
          issues.push({
            repo: repo.name,
            severity: "low",
            issue: "Repository hasn't been updated in 6+ months"
          });
        }

        // Check for practice/demo repos that should be private
        const practiceKeywords = ['practice', 'test', 'learning', 'tutorial', 'example', 'demo', 'temp'];
        const isPractice = practiceKeywords.some(keyword => 
          repo.name.toLowerCase().includes(keyword) ||
          (repo.description && repo.description.toLowerCase().includes(keyword))
        );
        if (isPractice && !repo.private) {
          issues.push({
            repo: repo.name,
            severity: "medium",
            issue: "Practice/demo code should be private"
          });
        }
      }

      const highPriority = issues.filter(i => i.severity === "high").length;
      const mediumPriority = issues.filter(i => i.severity === "medium").length;
      const lowPriority = issues.filter(i => i.severity === "low").length;

      return {
        totalRepos: repos.length,
        analyzed: repos.length,
        issues: issues,
        summary: `Analyzed ${repos.length} repositories. Found ${issues.length} total issues: ${highPriority} high priority, ${mediumPriority} medium priority, ${lowPriority} low priority.`
      };
    } catch (error: any) {
      throw new Error(`GitHub API error: ${error.message}`);
    }
  }

  @DaemoFunction({
    description: "Get detailed health score and analysis for a specific GitHub repository",
    tags: ["github", "repository", "health"],
    category: "GitHub Analysis",
    inputSchema: z.object({
      owner: z.string().describe("Repository owner username"),
      repo: z.string().describe("Repository name")
    }),
    outputSchema: z.object({
      name: z.string(),
      healthScore: z.number().min(0).max(100),
      issues: z.array(z.string()),
      strengths: z.array(z.string()),
      recommendations: z.array(z.object({
        priority: z.enum(["high", "medium", "low"]),
        action: z.string()
      }))
    })
  })
  async getRepositoryHealth(input: { owner: string; repo: string }) {
    try {
      const { data: repo } = await this.octokit.repos.get({
        owner: input.owner,
        repo: input.repo
      });

      const issues: string[] = [];
      const strengths: string[] = [];
      let healthScore = 100;

      // Check LICENSE
      if (!repo.license) {
        issues.push("Missing LICENSE file");
        healthScore -= 15;
      } else {
        strengths.push(`Has ${repo.license.name} license`);
      }

      // Check description
      if (!repo.description || repo.description.length < 10) {
        issues.push("Weak or missing description");
        healthScore -= 10;
      } else {
        strengths.push("Has detailed description");
      }

      // Check README
      try {
        await this.octokit.repos.getContent({
          owner: input.owner,
          repo: input.repo,
          path: 'README.md'
        });
        strengths.push("Has README.md");
      } catch (error) {
        issues.push("Missing README.md");
        healthScore -= 20;
      }

      // Check activity
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      if (repo.updated_at && new Date(repo.updated_at) > oneMonthAgo) {
        strengths.push("Recently updated");
      } else {
        issues.push("Not recently updated");
        healthScore -= 10;
      }

      // Check stars/engagement
      if (repo.stargazers_count > 10) {
        strengths.push(`${repo.stargazers_count} stars`);
      }

      // Generate recommendations
      const recommendations: Array<{priority: "high" | "medium" | "low"; action: string}> = [];
      
      if (issues.includes("Missing README.md")) {
        recommendations.push({
          priority: "high",
          action: "Add a comprehensive README with installation and usage instructions"
        });
      }
      
      if (issues.includes("Missing LICENSE file")) {
        recommendations.push({
          priority: "high",
          action: "Add an appropriate LICENSE file (MIT recommended for open source)"
        });
      }
      
      if (issues.includes("Weak or missing description")) {
        recommendations.push({
          priority: "medium",
          action: "Add a clear, concise description explaining what the project does"
        });
      }

      healthScore = Math.max(0, Math.min(100, healthScore));

      return {
        name: repo.name,
        healthScore,
        issues,
        strengths,
        recommendations
      };
    } catch (error: any) {
      throw new Error(`Failed to analyze repository: ${error.message}`);
    }
  }

  @DaemoFunction({
    description: "Find all repositories with specific issues (missing LICENSE, README, etc.)",
    tags: ["github", "search", "issues"],
    category: "GitHub Analysis",
    inputSchema: z.object({
      issueType: z.enum(["missing-license", "missing-readme", "weak-description", "stale", "all"])
        .describe("Type of issue to search for")
    }),
    outputSchema: z.object({
      repositories: z.array(z.object({
        name: z.string(),
        url: z.string(),
        issue: z.string()
      })),
      count: z.number()
    })
  })
  async findRepositoriesWithIssues(input: { issueType: string }) {
    try {
      const { data: repos } = await this.octokit.repos.listForAuthenticatedUser({
        per_page: 100
      });

      const results: Array<{name: string; url: string; issue: string}> = [];

      for (const repo of repos) {
        if (input.issueType === "missing-license" || input.issueType === "all") {
          if (!repo.license) {
            results.push({
              name: repo.name,
              url: repo.html_url,
              issue: "Missing LICENSE file"
            });
          }
        }

        if (input.issueType === "missing-readme" || input.issueType === "all") {
          try {
            await this.octokit.repos.getContent({
              owner: repo.owner.login,
              repo: repo.name,
              path: 'README.md'
            });
          } catch (error) {
            results.push({
              name: repo.name,
              url: repo.html_url,
              issue: "Missing README.md"
            });
          }
        }

        if (input.issueType === "weak-description" || input.issueType === "all") {
          if (!repo.description || repo.description.length < 10) {
            results.push({
              name: repo.name,
              url: repo.html_url,
              issue: "Weak or missing description"
            });
          }
        }

        if (input.issueType === "stale" || input.issueType === "all") {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          if (repo.updated_at && new Date(repo.updated_at) < sixMonthsAgo) {
            results.push({
              name: repo.name,
              url: repo.html_url,
              issue: "Not updated in 6+ months"
            });
          }
        }
      }

      return {
        repositories: results,
        count: results.length
      };
    } catch (error: any) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  @DaemoFunction({
    description: "Get portfolio-wide statistics and insights across all repositories",
    tags: ["github", "statistics", "portfolio"],
    category: "GitHub Analysis",
    inputSchema: z.object({}),
    outputSchema: z.object({
      totalRepositories: z.number(),
      publicRepos: z.number(),
      privateRepos: z.number(),
      totalStars: z.number(),
      totalForks: z.number(),
      languages: z.record(z.number()),
      licenseCoverage: z.number(),
      readmeCoverage: z.number(),
      insights: z.array(z.string())
    })
  })
  async getPortfolioStatistics() {
    try {
      const { data: repos } = await this.octokit.repos.listForAuthenticatedUser({
        per_page: 100
      });

      const stats = {
        totalRepositories: repos.length,
        publicRepos: repos.filter(r => !r.private).length,
        privateRepos: repos.filter(r => r.private).length,
        totalStars: repos.reduce((sum, r) => sum + r.stargazers_count, 0),
        totalForks: repos.reduce((sum, r) => sum + r.forks_count, 0),
        languages: {} as Record<string, number>,
        licenseCoverage: 0,
        readmeCoverage: 0,
        insights: [] as string[]
      };

      // Count languages
      repos.forEach(repo => {
        if (repo.language) {
          stats.languages[repo.language] = (stats.languages[repo.language] || 0) + 1;
        }
      });

      // Calculate coverage
      stats.licenseCoverage = Math.round((repos.filter(r => r.license).length / repos.length) * 100);
      
      // Check README coverage
      stats.readmeCoverage = 85; // Placeholder

      // Generate insights
      if (stats.licenseCoverage < 80) {
        stats.insights.push(`Only ${stats.licenseCoverage}% of repositories have licenses. Consider adding licenses to protect your work.`);
      }
      
      if (stats.publicRepos > stats.privateRepos * 2) {
        stats.insights.push(`You have significantly more public repos (${stats.publicRepos}) than private (${stats.privateRepos}). Consider organizing practice/demo code privately.`);
      }

      const topLanguage = Object.entries(stats.languages).sort((a, b) => b[1] - a[1])[0];
      if (topLanguage) {
        stats.insights.push(`Your primary language is ${topLanguage[0]} with ${topLanguage[1]} repositories.`);
      }

      return stats;
    } catch (error: any) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  // ==================== NEW FUNCTIONS ====================

  @DaemoFunction({
    description: "List all repository names with basic information",
    tags: ["github", "list", "repositories"],
    category: "GitHub Analysis",
    inputSchema: z.object({
      username: z.string().optional().describe("GitHub username (optional)")
    }),
    outputSchema: z.object({
      repositories: z.array(z.object({
        name: z.string(),
        description: z.string(),
        url: z.string(),
        language: z.string(),
        isPrivate: z.boolean()
      })),
      count: z.number()
    })
  })
  async listAllRepositoryNames(input: { username?: string }) {
    try {
      const { data: repos } = await this.octokit.repos.listForAuthenticatedUser({
        per_page: 100
      });

      const repositories = repos.map(repo => ({
        name: repo.name,
        description: repo.description || 'No description',
        url: repo.html_url,
        language: repo.language || 'Not specified',
        isPrivate: repo.private
      }));

      return {
        repositories,
        count: repositories.length
      };
    } catch (error: any) {
      throw new Error(`Failed to list repositories: ${error.message}`);
    }
  }

  @DaemoFunction({
    description: "Add a LICENSE file to a repository",
    tags: ["github", "license", "create"],
    category: "GitHub Management",
    inputSchema: z.object({
      repoName: z.string().describe("Repository name"),
      licenseType: z.enum(["MIT", "Apache-2.0", "GPL-3.0"]).optional().default("MIT").describe("License type")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string()
    })
  })
  async addLicenseToRepo(input: { repoName: string; licenseType?: string }) {
    try {
      const { data: user } = await this.octokit.users.getAuthenticated();
      const owner = user.login;
      const licenseType = input.licenseType || "MIT";

      const licenses: Record<string, string> = {
        "MIT": `MIT License

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
        "Apache-2.0": `Apache License
Version 2.0, January 2004

Copyright ${new Date().getFullYear()} ${owner}

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.`,
        "GPL-3.0": `GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) ${new Date().getFullYear()} ${owner}`
      };

      const licenseContent = licenses[licenseType] || licenses["MIT"];

      // Check if LICENSE already exists
      try {
        await this.octokit.repos.getContent({
          owner,
          repo: input.repoName,
          path: 'LICENSE'
        });
        return {
          success: false,
          message: `LICENSE file already exists in ${owner}/${input.repoName}`
        };
      } catch (e) {
        // LICENSE doesn't exist, proceed to create
      }

      // Create LICENSE file
      await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo: input.repoName,
        path: 'LICENSE',
        message: `Add ${licenseType} LICENSE`,
        content: Buffer.from(licenseContent).toString('base64')
      });

      return {
        success: true,
        message: `Successfully added ${licenseType} LICENSE to ${owner}/${input.repoName}!`
      };
    } catch (error: any) {
      throw new Error(`Failed to add LICENSE: ${error.message}`);
    }
  }

  @DaemoFunction({
    description: "Add a README file to a repository",
    tags: ["github", "readme", "create"],
    category: "GitHub Management",
    inputSchema: z.object({
      repoName: z.string().describe("Repository name"),
      title: z.string().optional().describe("README title"),
      description: z.string().optional().describe("Project description")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string()
    })
  })
  async addReadmeToRepo(input: { repoName: string; title?: string; description?: string }) {
    try {
      const { data: user } = await this.octokit.users.getAuthenticated();
      const owner = user.login;

      // Get repo info
      const { data: repoData } = await this.octokit.repos.get({ 
        owner, 
        repo: input.repoName 
      });

      const readmeTitle = input.title || repoData.name;
      const readmeDescription = input.description || repoData.description || 'A description of this project.';

      const readmeContent = `# ${readmeTitle}

${readmeDescription}

## Installation

\`\`\`bash
git clone https://github.com/${owner}/${input.repoName}.git
cd ${input.repoName}
\`\`\`

## Usage

Add usage instructions here.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ${repoData.license ? repoData.license.name : 'MIT'} License - see the [LICENSE](LICENSE) file for details.

## Contact

Created by [@${owner}](https://github.com/${owner})
`;

      // Check if README already exists
      try {
        await this.octokit.repos.getContent({
          owner,
          repo: input.repoName,
          path: 'README.md'
        });
        return {
          success: false,
          message: `README.md already exists in ${owner}/${input.repoName}`
        };
      } catch (e) {
        // README doesn't exist, proceed to create
      }

      // Create README file
      await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo: input.repoName,
        path: 'README.md',
        message: 'Add README.md',
        content: Buffer.from(readmeContent).toString('base64')
      });

      return {
        success: true,
        message: `Successfully added README.md to ${owner}/${input.repoName}!`
      };
    } catch (error: any) {
      throw new Error(`Failed to add README: ${error.message}`);
    }
  }

  @DaemoFunction({
    description: "Automatically fix common issues across all repositories (add missing LICENSE, README, make practice repos private)",
    tags: ["github", "autofix", "batch"],
    category: "GitHub Management",
    inputSchema: z.object({}),
    outputSchema: z.object({
      fixed: z.array(z.object({
        repo: z.string(),
        actions: z.array(z.string())
      })),
      totalFixed: z.number(),
      message: z.string()
    })
  })
  async autoFixAllIssues() {
    try {
      const { data: user } = await this.octokit.users.getAuthenticated();
      const { data: repos } = await this.octokit.repos.listForAuthenticatedUser({
        per_page: 100
      });

      const fixed: Array<{repo: string; actions: string[]}> = [];

      for (const repo of repos) {
        const actions: string[] = [];

        // Check and add LICENSE
        if (!repo.license) {
          try {
            await this.octokit.repos.getContent({
              owner: repo.owner.login,
              repo: repo.name,
              path: 'LICENSE'
            });
          } catch (e) {
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

            await this.octokit.repos.createOrUpdateFileContents({
              owner: repo.owner.login,
              repo: repo.name,
              path: 'LICENSE',
              message: 'Add MIT LICENSE',
              content: Buffer.from(licenseContent).toString('base64')
            });
            actions.push('Added LICENSE');
          }
        }

        // Check and add README
        try {
          await this.octokit.repos.getContent({
            owner: repo.owner.login,
            repo: repo.name,
            path: 'README.md'
          });
        } catch (e) {
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

          await this.octokit.repos.createOrUpdateFileContents({
            owner: repo.owner.login,
            repo: repo.name,
            path: 'README.md',
            message: 'Add README.md',
            content: Buffer.from(readmeContent).toString('base64')
          });
          actions.push('Added README');
        }

        // Make practice repos private
        const practiceKeywords = ['practice', 'demo', 'test', 'learning', 'tutorial', 'example', 'temp'];
        const isPractice = practiceKeywords.some(keyword => 
          repo.name.toLowerCase().includes(keyword)
        );
        
        if (isPractice && !repo.private) {
          await this.octokit.repos.update({
            owner: repo.owner.login,
            repo: repo.name,
            private: true
          });
          actions.push('Made private');
        }

        if (actions.length > 0) {
          fixed.push({ repo: repo.name, actions });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      return {
        fixed,
        totalFixed: fixed.length,
        message: fixed.length === 0 
          ? 'No issues to fix! All repositories are healthy.' 
          : `Fixed issues in ${fixed.length} repositories`
      };
    } catch (error: any) {
      throw new Error(`Auto-fix failed: ${error.message}`);
    }
  }

  @DaemoFunction({
    description: "Change repository visibility (make public or private)",
    tags: ["github", "visibility", "privacy"],
    category: "GitHub Management",
    inputSchema: z.object({
      repoName: z.string().describe("Repository name"),
      makePrivate: z.boolean().describe("True to make private, false to make public")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string()
    })
  })
  async changeRepoVisibility(input: { repoName: string; makePrivate: boolean }) {
    try {
      const { data: user } = await this.octokit.users.getAuthenticated();
      const owner = user.login;

      await this.octokit.repos.update({
        owner,
        repo: input.repoName,
        private: input.makePrivate
      });

      return {
        success: true,
        message: `Successfully made ${owner}/${input.repoName} ${input.makePrivate ? 'private' : 'public'}!`
      };
    } catch (error: any) {
      throw new Error(`Failed to change visibility: ${error.message}`);
    }
  }
}
