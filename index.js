const { Octokit } = require('@octokit/rest');
require('dotenv').config();

/**
 * AI GitHub Repo Organizer with Daemo AI Integration
 * 
 * This version integrates Daemo AI's natural language database/API interface
 * to store and query repository analysis data efficiently.
 */

// Daemo AI Client Setup
class DaemoClient {
    constructor() {
    this.apiKey = process.env.DAEMO_API_KEY;
    this.agentId = process.env.DAEMO_AGENT_ID;
    this.baseUrl = 'https://backend.daemo.ai';
}

    /**
     * Use natural language to query repository data stored in Daemo
     * Example: "Find all repositories with high priority issues"
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
                    schema: 'github_repos' // Your data schema in Daemo
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

// AI-powered analysis using Claude (as before)
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
    
    // Example queries using natural language
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
    
    // Generate insights across all repos
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
    console.log('🚀 AI GitHub Repo Organizer with Daemo AI Integration');
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
        
        // If query mode, just run queries on existing data
        if (queryMode && daemoClient) {
            await queryDaemoInsights(daemoClient);
            return;
        }
        
        // Analyze each repo
        const analyses = [];
        for (const repo of repos) {
            const analysis = await analyzeRepo(repo, octokit, daemoClient, useAI);
            analyses.push(analysis);
            
            // Small delay to avoid rate limiting
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

main();
