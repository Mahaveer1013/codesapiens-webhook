const express = require('express');
const admin = require('firebase-admin');
const crypto = require('crypto');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();


const serice_account = {
    "type": process.env.FIREBASE_TYPE,
    "project_id": process.env.FIREBASE_PROJECT_ID,
    "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
    "private_key": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    "client_id": process.env.FIREBASE_CLIENT_ID,
    "auth_uri": process.env.FIREBASE_AUTH_URI,
    "token_uri": process.env.FIREBASE_TOKEN_URI,
    "auth_provider_x509_cert_url": process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    "client_x509_cert_url": process.env.FIREBASE_CLIENT_CERT_URL,
    "universe_domain": process.env.FIREBASE_UNIVERSE_DOMAIN,
}

// Firebase Admin SDK init
admin.initializeApp({
    credential: admin.credential.cert(serice_account)
});

const db = admin.firestore();
const collectionName = process.env.FIREBASE_COLLECTION || 'github_webhooks';

const app = express();

const allowedOrigins = [
    'cs-analytics.vercel.app',
    process.env.CLIENT_URL
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        const url = new URL(origin);

        const isAllowed =
            allowedOrigins.includes(origin) ||
            url.hostname.endsWith('.mahaveer.dev') ||
            url.hostname.endsWith('.codesapiens.in');

        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('❌ Not allowed by CORS'));
        }
    },
    credentials: true
};

app.use(cors(corsOptions))

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

    console.log(signature);

    const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
    hmac.update(req.rawBody);
    const digest = `sha256=${hmac.digest('hex')}`;

    try {
        const isValid = crypto.timingSafeEqual(
            Buffer.from(signature, 'utf8'),
            Buffer.from(digest, 'utf8')
        );
        console.log(isValid);


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

        const githubEvent = req.headers['x-github-event'];

        const data = req.body;

        // Save to Firestore
        await db.collection(collectionName).add({
            ...data,
            githubEvent,
            receivedAt: new Date().toISOString()
        });

        res.status(202).send('Accepted');
    } catch (err) {
        console.error('❌ Error saving webhook:', err);
        res.status(500).send('Database error');
    }
});

// Health check
app.get('/', (req, res) => {
    res.send('Webhook server running');
});

// Optional: Fetch recent webhooks
app.get('/webhooks', async (req, res) => {
    try {
        const snapshot = await db.collection(collectionName).orderBy('receivedAt', 'desc').limit(10).get();
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(docs);
    } catch (err) {
        console.error('❌ Error fetching webhooks:', err);
        res.status(500).send('Failed to fetch data');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});
