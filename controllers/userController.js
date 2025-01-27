const mongoose = require('mongoose');
const User = require('../models/userModel'); // MongoDB User model
const Contact = require('../models/contactModel'); // MongoDB Contact model
const { db } = require('../middlewares/firebaseAdmin'); // Firestore instance from admin.js

// Check if the database is connected
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1; // 1 means connected
};

// Function to fetch user profile from Firestore
const fetchUserProfileFromFirestore = async (uid) => {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      return userDoc.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error fetching Firestore user profile for UID ${uid}:`, error);
    throw error;
  }
};

// Controller function to fetch and store or remove user profile in MongoDB
const syncUserProfile = async (uid) => {
  try {
    const firestoreProfile = await fetchUserProfileFromFirestore(uid);

    if (!firestoreProfile) {
      if (isDatabaseConnected()) {
        await User.findOneAndDelete({ uid: uid });
        await Contact.deleteMany({ userId: uid });
        console.log(`User profile for UID: ${uid} was deleted from Firestore, so it has been removed from MongoDB.`);
      } else {
        console.log(`User profile for UID: ${uid} was deleted from Firestore, but remains in MongoDB due to offline status.`);
      }
    } else {
      const userData = {
        uid: uid,
        name: firestoreProfile.fullName || null,
        email: firestoreProfile.email || null,
        phoneNumber: firestoreProfile.phoneNumber || null,
        profileImage: firestoreProfile.profileImage || null,
        location: {
          latitude: firestoreProfile.latitude || null,
          longitude: firestoreProfile.longitude || null,
        },
        batteryLevel: firestoreProfile.batteryLevel || null,
        lastSynced: new Date(),
        expoPushToken: firestoreProfile.expoPushToken || null,
      };

      const updatedUser = await User.findOneAndUpdate(
        { uid: uid },
        { $set: userData },
        { new: true, upsert: true }
      );

      console.log(`User profile for UID: ${uid} synced to MongoDB.`);

      const existingContact = await Contact.findOne({ userId: uid });
      if (existingContact) {
        await Contact.findOneAndUpdate(
          { userId: uid },
          {
            $set: {
              name: updatedUser.name,
              email: updatedUser.email,
              phoneNumber: updatedUser.phoneNumber,
              location: {
                latitude: updatedUser.location.latitude,
                longitude: updatedUser.location.longitude,
              },
              batteryPercentage: updatedUser.batteryLevel,
              profileImage: updatedUser.profileImage,
              status: updatedUser.status,
              expoPushToken: updatedUser.expoPushToken,
            },
          },
          { new: true }
        );

        console.log(`Contact information for user ID: ${uid} updated in Contacts.`);
      } else {
        console.log(`User ID: ${uid} not found in Contacts; skipping update.`);
      }

      return updatedUser;
    }
  } catch (error) {
    console.error('Error syncing user profile to MongoDB:', error);
    throw error;
  }
};

// Function to sync all users initially and periodically
const syncAllUserProfiles = async () => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const promises = usersSnapshot.docs.map(async (userDoc) => {
      const uid = userDoc.id;
      await syncUserProfile(uid);
    });

    await Promise.all(promises);
    console.log('All user profiles have been synced to MongoDB.');
  } catch (error) {
    console.error('Error syncing all user profiles:', error);
  }
};

// Polling Firestore every 30 seconds for new profiles
const startPollingForNewProfiles = () => {
  setInterval(async () => {
    console.log('Polling Firestore for new user profiles...');
    try {
      await syncAllUserProfiles();
    } catch (error) {
      console.error('Error during polling for new user profiles:', error);
    }
  }, 30000); // Poll every 30 seconds
};

// Real-time Firestore listener for changes in the 'users' collection
const listenForUserProfileChanges = () => {
  db.collection('users').onSnapshot(
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const uid = change.doc.id;
        if (change.type === 'added' || change.type === 'modified') {
          console.log(`Real-time update detected for UID: ${uid}. Syncing to MongoDB.`);
          syncUserProfile(uid);
        } else if (change.type === 'removed') {
          if (isDatabaseConnected()) {
            User.findOneAndDelete({ uid: uid });
            Contact.deleteMany({ userId: uid });
            console.log(`User profile for UID: ${uid} was deleted from Firestore, so it has been removed from MongoDB.`);
          }
        }
      });
    },
    (error) => {
      console.error('Error listening for user profile changes:', error);
    }
  );
};

// Initialize the sync process
const initializeSyncProcess = async () => {
  await syncAllUserProfiles(); // Initial sync
  listenForUserProfileChanges(); // Real-time listener for changes
  startPollingForNewProfiles(); // Polling for newly added profiles
};

// Export the sync functions
module.exports = { syncUserProfile, syncAllUserProfiles, initializeSyncProcess };
