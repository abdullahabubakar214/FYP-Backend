const admin = require('firebase-admin');
const serviceAccount = require('../firebaseServiceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL  // Set your Firebase Realtime Database URL if needed
});

console.log("Firebase Admin Initialized");

// Export Firebase Admin for use in other files
const db = admin.firestore();

module.exports = { admin, db };  // Keep as is
