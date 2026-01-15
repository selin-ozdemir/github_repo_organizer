const { Octokit } = require('@octokit/rest');
require('dotenv').config();

async function analyzeRepo(repo) {
    console.log(`\n🔍 Analyzing: ${repo.name}`);
    
    const issues = [];
    
    // Check for LICENSE
    if (!repo.license) {
        issues.push('❌ Missing LICENSE file');
    }
    
    // Check for description
    if (!repo.description || repo.description.length < 10) {
        issues.push('⚠️  Weak or missing description');
    }
    
    // Check if it's a practice repo (should be private)
    const practiceKeywords = ['practice', 'test', 'learning', 'tutorial', 'example', 'demo'];
    const isPractice = practiceKeywords.some(keyword => 
        repo.name.toLowerCase().includes(keyword)
    );
    if (isPractice && !repo.private) {
        issues.push('💡 Looks like practice/demo code - consider making private');
    }
    
    // Report
    if (issues.length === 0) {
        console.log('✅ Looks good!');
    } else {
        console.log('Issues found:');
        issues.forEach(issue => console.log(`  ${issue}`));
    }
    
    return issues;
}

async function main() {
    console.log('🚀 GitHub Repo Organizer\n');
    console.log('🔍 Connecting to GitHub...');
    
    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    try {
        // Get your repos
        const { data: repos } = await octokit.repos.listForUser({
            username: 'selin-ozdemir'
        });

        console.log(`✅ Found ${repos.length} repositories!\n`);
        console.log('='.repeat(50));

        // Analyze each repo
        let totalIssues = 0;
        for (const repo of repos) {
            const issues = await analyzeRepo(repo);
            totalIssues += issues.length;
        }
        
        console.log('\n' + '='.repeat(50));
        console.log(`\n📊 Summary: Found ${totalIssues} total issues across ${repos.length} repos`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main();