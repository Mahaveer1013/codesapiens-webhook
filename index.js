const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

// MongoDB setup
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const WebhookSchema = new mongoose.Schema({}, { strict: false });
const WebhookEvent = mongoose.model('WebhookEvent', WebhookSchema);

const app = express();

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));


// GitHub Signature verification middleware
function verifyGitHubSignature(req, res, next) {
    const signature = req.headers['x-hub-signature-256'];
    console.log(req.rawBody);

    if (!signature || !req.rawBody) {
        return res.status(403).send('❌ Missing signature or raw body');
    }

    const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
    hmac.update(req.rawBody);
    const digest = `sha256=${hmac.digest('hex')}`;

    try {
        const isValid = crypto.timingSafeEqual(
            Buffer.from(signature, 'utf8'),
            Buffer.from(digest, 'utf8')
        );

        if (!isValid) {
            return res.status(403).send('❌ Invalid signature');
        }

        next();
    } catch (err) {
        console.error('❌ Signature verification error:', err);
        return res.status(500).send('Internal Server Error');
    }
}

// Webhook endpoint
app.post('/webhook', verifyGitHubSignature, async (req, res) => {
    try {
        res.status(202).send('Accepted');

        const githubEvent = req.headers['x-github-event'];

        const data = req.body;
        console.log(data);

        const action = data.action;

        if (action === 'opened') {
            console.log(`An issue was opened with this title: ${data.issue.title}`);
        } else if (action === 'closed') {
            console.log(`An issue was closed by ${data.issue.user.login}`);
        } else {
            console.log(`Unhandled action for the issue event: ${action}`);
        }

        const event = new WebhookEvent({...req.body, githubEvent});
        await event.save();

    } catch (err) {
        console.error('❌ Error saving webhook:', err);
        res.status(500).send('Database error');
    }
});

// Health check
app.get('/', (req, res) => {
    res.send('Webhook server running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});
