require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const { old_repositories } = require('./data');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const org = process.env.ORG_NAME; // Add this in your .env file

async function createRepositories() {
    for (const repo of repositories) {
        try {
            await octokit.repos.get({
                owner: org,
                repo: repo.name,
            });
            console.log(`⚠️ Repo ${repo.name} already exists, skipping creation.`);
            continue; // skip to next repo
        } catch (error) {
            if (error.status !== 404) throw error; // real error
            try {
                const { data } = await octokit.repos.createInOrg({
                    org,
                    name: repo.name,
                    private: true,
                    auto_init: true,
                });
                console.log(`✅ Created: ${data.full_name}`);
            } catch (err) {
                const message = err.response?.data?.message || err.message;

                if (message.includes("name already exists")) {
                    console.log(`ℹ️ Skipped: ${repo.name} (already exists)`);
                    continue;
                }

                console.error(`❌ Failed to create ${repo.name}: ${message}`);
            }
        }
    }
}

const webhook_url = process.env.WEBHOOK_URL;
const webhook_secret = process.env.GITHUB_WEBHOOK_SECRET;

async function configureWebhooks() {
    for (const repo of repositories) {
        try {
            // Get all existing webhooks for the repo
            const { data: hooks } = await octokit.repos.listWebhooks({
                owner: org,
                repo: repo.name,
            });

            // Check if the webhook URL already exists
            const alreadyExists = hooks.some(hook => hook.config?.url === webhook_url);

            if (alreadyExists) {
                console.log(`⚠️ Webhook already exists for ${repo.name}, skipping.`);
                continue;
            }

            // Create the webhook
            await octokit.repos.createWebhook({
                owner: org,
                repo: repo.name,
                config: {
                    url: webhook_url,
                    content_type: 'json',
                    secret: webhook_secret,
                    insecure_ssl: '0',
                },
                events: [
                    'push',
                    'pull_request',
                    'pull_request_review',
                    'pull_request_review_comment',
                    'issues',
                    'issue_comment',
                    'create',
                    'delete',
                    'fork',
                    'star',
                    'workflow_run',
                    'check_run'
                ],
                active: true
            });

            console.log(`✅ Webhook configured for ${repo.name}`);
        } catch (err) {
            console.error(`❌ Failed to configure webhook for ${repo.name}: ${err.response?.data?.message || err.message}`);
        }
    }
}

async function addCollaborators() {
    for (const repo of old_repositories) {
        const repoName = repo.name;
        const users = repo.mentor || [];

        for (const username of users) {
            try {
                await octokit.repos.addCollaborator({
                    owner: org,
                    repo: repoName,
                    username,
                    permission: 'push', // or 'admin' if required
                });
                console.log(`✅ Added ${username} to ${repoName}`);
            } catch (err) {
                console.error(`❌ Failed to add ${username} to ${repoName}: ${err.response?.data?.message || err.message}`);
            }
        }
    }
}
// createRepositories().then(() => {
//     configureWebhooks().then(() => {
        addCollaborators().then(() => {
            console.log("✅ All Done");
        })
//     })
// })
