/*

const Signal = require('../models/signalModel'); // Changed from Beacon to Signal
const Circle = require('../models/circleModel');
const Contact = require('../models/contactModel');
const { sendSignalNotification, notifySignalCreator } = require('../services/sendPushNotification');


// Helper function to convert durations to milliseconds
const convertToMs = (duration, unit) => {
  switch (unit) {
    case 'minutes': return duration * 60000;
    case 'hours': return duration * 3600000;
    case 'days': return duration * 86400000;
    case 'weeks': return duration * 604800000;
    case 'months': return duration * 2592000000; // Approximation
    default: return 0;
  }
};

exports.createSignal = async (req, res) => {
  const { circleId, locationText, lat, lng, radius, duration, durationUnit, message } = req.body;

  // Log incoming request
  console.log('Request body:', req.body);
  console.log('User ID:', req.user.uid);

  // Validate required fields
  if (!circleId || !locationText || !lat || !lng || !radius || !duration || !durationUnit) {
    return res.status(400).send('Missing required fields.');
  }

  const validUnits = ['minutes', 'hours', 'days', 'weeks', 'months'];
  if (!validUnits.includes(durationUnit)) {
    return res.status(400).send('Invalid duration unit.');
  }

  const expirationDate = new Date(Date.now() + convertToMs(duration, durationUnit));

  try {
    // Fetch the circle and get the contact userIds
    const circle = await Circle.findById(circleId).select('contacts');

    if (!circle || !circle.contacts || circle.contacts.length === 0) {
      console.log('No contacts found in the circle:', circleId);
      return res.status(404).send('Circle not found or no contacts in the circle.');
    }

    console.log('Contacts in circle:', circle.contacts); // Debug: log contact details

    // Extract userId from contacts and fetch the contact details
    const userIds = circle.contacts.map(contact => contact.userId); // Assuming contact.userId is the Firebase ID
    const contacts = await Contact.find({ userId: { $in: userIds } });

    if (contacts.length === 0) {
      console.log('No contacts found for the provided userIds:', userIds);
      return res.status(404).send('No contacts found.');
    }

    console.log('Fetched contacts:', contacts); // Debug: log fetched contacts

    // Find the sender's contact information based on Firebase user ID
    const senderContact = contacts.find(contact => contact.userId === req.user.uid);
    if (!senderContact) {
      return res.status(404).send('Sender not found in contacts.');
    }

    const senderName = senderContact.name; // Assuming the contact has a `name` field
    const senderPushToken = senderContact.expoPushToken;

    // Create a new signal entry with creator's name
    const signal = new Signal({
      userId: req.user.uid, // Store the senderId as the userId for the signal
      circleId,
      locationText,
      lat,
      lng,
      radius,
      duration,
      durationUnit,
      expirationDate,
      message,
      notifiedContacts: contacts.map(contact => contact._id),  // Save the contact IDs for future reference
      createdBy: senderName // Save the name of the creator
    });

    await signal.save();

    // Notify contacts via the new signal notification function
    for (const contact of contacts) {
      if (contact.expoPushToken) {
        await sendSignalNotification(contact.expoPushToken, senderName, locationText, message, expirationDate, 'creation');
        console.log(`Notified ${contact.name} about signal creation.`);
      } else {
        console.log(`No push token found for contact ${contact.name || 'unknown'}.`);
      }
    }

    // Notify the signal creator about the successful creation of their signal
    if (senderPushToken) {
      await notifySignalCreator(senderPushToken, locationText, expirationDate, 'creation');
    } else {
      console.log(`No Expo Push Token found for signal creator: ${senderName}`);
    }

    res.status(201).json({ message: 'Signal created and contacts notified.', signal });
  } catch (error) {
    console.error('Error creating signal:', error);
    res.status(500).send('Failed to create signal.');
  }
};

exports.getSignalsByUserIdAndCircleId = async (req, res) => {
  const { userId, circleId } = req.params;

  try {
    const signals = await Signal.find({
      userId,
      circleId,
      expirationDate: { $gt: new Date() },
    });

    if (signals.length === 0) {
      return res.status(404).send('No active signals found for this user in the specified circle.');
    }

    res.status(200).json(signals);
  } catch (error) {
    console.error('Error fetching signals by userId and circleId:', error);
    res.status(500).send('Failed to fetch signals.');
  }
};

// Fetch all Signals by Circle ID
exports.getSignalsByCircleId = async (req, res) => {
  const { circleId } = req.params; // Assuming circleId is passed as a route parameter

  try {
    const signals = await Signal.find({ circleId, expirationDate: { $gt: new Date() } });

    if (signals.length === 0) {
      return res.status(404).send('No active signals found for this circle.');
    }

    res.status(200).json(signals);
  } catch (error) {
    console.error('Error fetching signals by circle ID:', error);
    res.status(500).send('Failed to fetch signals by circle ID.');
  }
};

exports.deleteSignal = async (req, res) => {
  try {
    // Find the signal by ID and make sure it belongs to the user requesting deletion
    const signal = await Signal.findOneAndDelete({ _id: req.params.id, userId: req.user.uid }).populate('notifiedContacts');

    if (!signal) {
      return res.status(404).send('Signal not found or unauthorized.');
    }

    // Fetch the sender's (signal creator's) details from the Contact model using req.user.uid
    const senderContact = await Contact.findOne({ userId: req.user.uid });

    if (!senderContact) {
      return res.status(404).send('Signal creator contact details not found.');
    }

    const senderName = senderContact.name || 'Unknown Creator'; // Fallback in case the name is missing
    const senderPushToken = senderContact.expoPushToken;

    // Notify each contact that the signal has been deleted
    for (const contact of signal.notifiedContacts) {
      if (contact.expoPushToken) {
        await sendSignalNotification(contact.expoPushToken, senderName, signal.locationText, signal.message, null, 'deletion');
        console.log(`Notified ${contact.name} about signal deletion.`);
      } else {
        console.log(`No push token found for contact ${contact.name || 'unknown'}.`);
      }
    }

    // Notify the signal creator that the signal was successfully deleted
    if (senderPushToken) {
      await notifySignalCreator(senderPushToken, signal.locationText, null, 'deletion');
      console.log(`Notified the creator (${senderName}) about successful signal deletion.`);
    } else {
      console.log(`No Expo Push Token found for signal creator: ${senderName}`);
    }

    res.status(200).json({ message: 'Signal deleted successfully and contacts notified.' });
  } catch (error) {
    console.error('Error deleting signal:', error);
    res.status(500).send('Failed to delete signal.');
  }
};

exports.deleteExpiredSignals = async () => {
  try {
    const now = new Date();
    const expiredSignals = await Signal.find({ expirationDate: { $lt: now } }).populate('notifiedContacts'); // Populate contacts

    for (const signal of expiredSignals) {
      // Notify contacts that the signal has expired and is being deleted
      for (const contact of signal.notifiedContacts) {
        if (contact.expoPushToken) {
          const contactMessage = `The signal at ${signal.locationText}, created by ${signal.userId}, has expired and is no longer active.`;
          await sendSignalNotification(contact.expoPushToken, signal.userId, signal.locationText, null, null, 'expiration');
          console.log(`Notified ${contact.name} about signal expiration.`);
        }
      }

      // Notify the signal creator about the expiration
      const signalCreator = await User.findById(signal.userId); // Assuming User model exists and has the Firebase ID
      if (signalCreator && signalCreator.expoPushToken) {
        const creatorMessage = `Your signal at ${signal.locationText} has expired and was automatically deleted.`;
        await notifySignalCreator(signalCreator.expoPushToken, signal.locationText, null, 'expiration');
        console.log(`Notified the creator (${signalCreator.name}) about signal expiration.`);
      }

      // Delete the expired signal
      await Signal.deleteOne({ _id: signal._id });
      console.log(`Expired signal at ${signal.locationText} deleted.`);
    }

    console.log(`${expiredSignals.length} expired signals processed.`);
  } catch (error) {
    console.error('Error deleting expired signals:', error);
  }
};

// Run deleteExpiredSignals periodically
setInterval(exports.deleteExpiredSignals, 3600000); // Run every hour

*/