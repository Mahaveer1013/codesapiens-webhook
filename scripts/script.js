require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const { repositories } = require('./data');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const org = process.env.ORG_NAME; // Add this in your .env file

async function createRepositories() {
    for (const repo of repositories) {
        try {
            const { data } = await octokit.repos.createInOrg({
                org,
                name: repo.name,
                private: true,
                auto_init: true,
            });
            console.log(`✅ Created: ${data.full_name}`);
        } catch (err) {
            console.error(`❌ Failed to create ${repo}: ${err.response?.data?.message || err.message}`);
        }
    }
}



const webhook_url = process.env.WEBHOOK_URL;
const webhook_secret = process.env.GITHUB_WEBHOOK_SECRET;


async function configureWebhooks() {
    for (const repo of repositories) {
        try {
            await octokit.repos.createWebhook({
                owner: org,
                repo: repo.name,
                config: {
                    url: webhook_url,
                    content_type: 'json',
                    secret: webhook_secret,
                    insecure_ssl: '0'
                },
                events: [
                    'push',
                    'pull_request',
                    'pull_request_review',
                    'pull_request_review_comment',
                    'issues',
                    'issue_comment',
                    'create',        // for branch or tag creation
                    'delete',        // for branch or tag deletion
                    'fork',
                    'star',
                    'workflow_run',
                    'check_run'
                ],
                active: true
            });
            console.log(`✅ Webhook confwigured for ${repo.name}`);
        } catch (err) {
            console.error(`❌ Failed to configure webhook for ${repo.name}: ${err.message}`);
        }
    }
}

async function addCollaborators() {
    for (const repo of repositories) {
        const repoName = repo.name;
        const users = repo.collaborators || [];

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
createRepositories().then(() => {
    configureWebhooks().then(() => {
        addCollaborators().then(() => {
            console.log("✅ All Done");
        }).catch((err) => {
            console.log(err);
        })
    }).catch((err) => {
        console.log(err);
    })
}).catch((err) => {
    console.log(err);
})
