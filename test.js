const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config();

const service_account = {
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
};

admin.initializeApp({
    credential: admin.credential.cert(service_account)
});

const db = admin.firestore();
const collectionName = process.env.FIREBASE_COLLECTION || 'github_webhooks';

const eventsToDelete = ['ping', 'label', 'repository', 'workflow_dispatch'];

async function deleteDocs() {
    for (const event of eventsToDelete) {
        const snapshot = await db.collection(collectionName)
            .where('githubEvent', '==', event)
            .get();

        if (snapshot.empty) {
            console.log(`No documents found for event: ${event}`);
            continue;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`Deleted ${snapshot.size} documents for event: ${event}`);
    }
    process.exit(0);
}

deleteDocs().catch(err => {
    console.error('Error deleting documenkts:', err);
    process.exit(1);
});
