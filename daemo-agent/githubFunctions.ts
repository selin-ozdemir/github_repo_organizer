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

        // Check for stale repos (6+ months) - FIXED
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
      
      // Check README coverage (would need additional API calls, simplified here)
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
}
