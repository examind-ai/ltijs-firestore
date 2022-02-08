import * as admin from 'firebase-admin';

// initializeApp looks for service account credentials in GOOGLE_APPLICATION_CREDENTIALS environment variable
// and determines which Firebase project we're using
admin.initializeApp();

export const db = admin.firestore();
