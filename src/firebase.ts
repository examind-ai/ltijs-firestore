import * as admin from 'firebase-admin';

const credential = process.env.LTIJS_APPLICATION_CREDENTIALS;

// initializeApp looks for service account credentials in GOOGLE_APPLICATION_CREDENTIALS environment variable
// and determines which Firebase project we're using.
// Provide a named instance so multiple apps can be initialized: https://github.com/examind-ai/ltijs-firestore/issues/3
const app = admin.initializeApp(
  credential
    ? { credential: admin.credential.cert(credential) }
    : undefined,
  'ltijs-firestore',
);

const db = app.firestore();

db.settings({ ignoreUndefinedProperties: true });

export { admin, db };
