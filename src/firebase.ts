import * as admin from 'firebase-admin';

// The service account key determines which Firebase project we're using.

// Recommendation is to use LTIJS_APPLICATION_CREDENTIALS environment variable to locate the service account key: https://github.com/examind-ai/ltijs-firestore/issues/3
const credential = process.env.LTIJS_APPLICATION_CREDENTIALS;

// If credential is undefined, initializeApp looks for GOOGLE_APPLICATION_CREDENTIALS environment variable to locate the service account key.
const app = admin.initializeApp(
  credential
    ? { credential: admin.credential.cert(credential) }
    : undefined,
  'ltijs-firestore', // Provide a named instance so multiple apps can be initialized: https://github.com/examind-ai/ltijs-firestore/issues/3
);

const db = app.firestore();

db.settings({ ignoreUndefinedProperties: true });

export { admin, db };
