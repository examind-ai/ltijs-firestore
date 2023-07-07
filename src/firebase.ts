import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// The service account key determines which Firebase project we're using.

// Recommendation is to use LTIJS_APPLICATION_CREDENTIALS environment variable to locate the service account key: https://github.com/examind-ai/ltijs-firestore/issues/3
const credential = process.env.LTIJS_APPLICATION_CREDENTIALS;

// If credential is undefined, initializeApp looks for GOOGLE_APPLICATION_CREDENTIALS environment variable to locate the service account key.
const app = initializeApp(
  credential ? { credential: cert(credential) } : undefined,
  'ltijs-firestore', // Provide a named instance so multiple apps can be initialized: https://github.com/examind-ai/ltijs-firestore/issues/3
);

const db = getFirestore(app);

db.settings({
  ignoreUndefinedProperties: true,
  // Faster cold starts by using REST (instead of gRPC) where possible: https://github.com/firebase/firebase-admin-node/pull/1901
  // As of 2023-07-06, the only operation that requires gRPC is onSnapshot(), which we don't use on the server: https://firebase.google.com/docs/reference/admin/node/firebase-admin.firestore.firestoresettings
  // Cold start issue tracker: https://issuetracker.google.com/issues/158014637#comment212
  // Disable `preferRest` when running with emulator b/c it causes unit tests to time out on Linux and macOS: https://github.com/firebase/firebase-admin-node/issues/2016#issuecomment-1624775019
  preferRest: !process.env.FIRESTORE_EMULATOR_HOST,
});

export { db };
