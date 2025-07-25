// check_github_and_generate.js
require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const { old_repositories } = require('./data');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function main() {
  // Flatten and deduplicate mentors
  const mentors = [...new Set(old_repositories.flatMap(repo => repo.mentor))];

  for (const username of mentors) {
    try {
      await octokit.users.getByUsername({ username });
      console.log(`✅ Found: ${username}`);
    } catch (e) {
      console.warn(`❌ Not found: ${username}`);
    }
  }
}

main().catch(console.error);
