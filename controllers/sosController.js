const SOS = require('../models/sosModel');
const Circle = require('../models/circleModel');
const Contact = require('../models/contactModel');
const User = require('../models/userModel');  
const { sendPushNotification, sendAcknowledgePushNotification } = require('../services/sendPushNotification'); 

// Send SOS to selected circle(s) or all circles if selected
exports.sendSOS = async (req, res) => {
  const { message, emergencyType, userLocation, selectedCircleIds, batteryStatus, sendToAllCircles } = req.body;

  // Validate required fields
  if (!message || !userLocation || !emergencyType) {
    return res.status(400).send('Invalid request: missing message, user location, or emergency type.');
  }

  try {
    // Fetch the sender's details from the User model
    const sender = await User.findOne({ uid: req.user.uid });

    if (!sender) {
      return res.status(404).send('Sender not found.');
    }

    // Fetch all circles or selected circles based on sendToAllCircles flag
    let circles;
    if (sendToAllCircles) {
      circles = await Circle.find({ 'contacts.userId': req.user.uid }).populate('contacts');
    } else {
      circles = await Circle.find({ _id: { $in: selectedCircleIds } }).populate('contacts');
    }

    if (!circles || circles.length === 0) {
      return res.status(404).send('No circles found.');
    }

    let contactsToNotify = [];
    const notifiedContactIds = new Set();
    const circlesToSave = [];

    // Aggregate contacts from the selected/all circles, excluding the sender
    for (const circle of circles) {
      circlesToSave.push({
        circleId: circle._id,
        circleName: circle.name
      });

      for (const contact of circle.contacts) {
        // Exclude the sender from receiving the SOS message
        if (contact.userId !== sender.uid) {
          const user = await Contact.findOne({ userId: contact.userId });
          if (user && !notifiedContactIds.has(contact.userId)) {
            contactsToNotify.push({
              contactId: user.userId,
              name: user.name,
              expoPushToken: user.expoPushToken, // Get the push token
              notifiedVia: 'App',
              emergencyMessage: `${message} (initiated by ${sender.name})`, // Include sender name in message
            });
            notifiedContactIds.add(contact.userId);
          }
        }
      }
    }

    // Check if there are any contacts to notify
    if (contactsToNotify.length === 0) {
      return res.status(400).json({ message: 'No contacts found in the selected circles. Please select other circles or create new ones.' });
    }

    // Create an SOS request record with circles and contacts saved
    const sosRequest = new SOS({
      message,
      emergencyType,
      userLocation,
      batteryStatus: sender.batteryLevel || 100,
      circles: circlesToSave,
      contacts: contactsToNotify.map(contact => ({
        contactId: contact.contactId,
        name: contact.name,
        acknowledged: false,
        notifiedVia: 'App',
      })),
      userId: sender.uid,
      sender: {
        userId: sender.uid,
        name: sender.name,
        profileImage: sender.profileImage,
        batteryStatus: sender.batteryLevel || 100,
      },
    });

    await sosRequest.save();

    // Notify contacts via App using Expo push notifications
    for (const contact of contactsToNotify) {
      if (contact.expoPushToken) {
        await sendPushNotification(contact.expoPushToken, contact.emergencyMessage, sender.batteryLevel, userLocation.address, emergencyType);
      }
    }

    // Send a separate notification to the sender, confirming the SOS has been sent
    await sendPushNotification(sender.expoPushToken, `Your SOS has been sent to ${circlesToSave.map(circle => circle.circleName).join(', ')}`, sender.batteryLevel, userLocation.address, emergencyType, true);

    res.status(200).json({
      message: 'SOS message sent successfully!',
      notifiedContacts: contactsToNotify,
    });
  } catch (error) {
    console.error('Error sending SOS:', error);
    res.status(500).send('Failed to send SOS message.');
  }
};

exports.sendSOSToAllCircles = async (req, res) => {
  const { message, emergencyType, userLocation, batteryStatus } = req.body;

  if (!message || !userLocation || !emergencyType) {
    return res.status(400).send('Invalid request: missing message, user location, or emergency type.');
  }

  try {
    // Get all circles that the user is part of
    const circles = await Circle.find({ 'contacts.userId': req.user.uid }).populate('contacts');

    if (!circles || circles.length === 0) {
      return res.status(404).send('No circles found for the user.');
    }

    let contactsToNotify = [];
    const notifiedContactIds = new Set();
    const circlesToSave = [];

    // Aggregate contacts from all circles
    for (const circle of circles) {
      circlesToSave.push({
        circleId: circle._id,
        circleName: circle.name
      });

      for (const contact of circle.contacts) {
        const user = await Contact.findById(contact.userId);

        if (user && !notifiedContactIds.has(contact.userId.toString())) {
          contactsToNotify.push({
            contactId: user._id,
            name: user.name,
            emergencyNumber: user.emergencyNumber || 'N/A',  // Add fallback if undefined
            notifiedVia: 'App',
            batteryStatus: batteryStatus || 100,
            emergencyMessage: `${message} (initiated by ${req.user.name})`, // Include sender name in message
          });
          notifiedContactIds.add(contact.userId.toString());
        }
      }
    }

    // Check if there are any contacts to notify
    if (contactsToNotify.length === 0) {
      return res.status(400).json({ message: 'No contacts found in the circles. Please ensure circles have contacts.' });
    }

    // Create an SOS request record
    const sosRequest = new SOS({
      message,
      emergencyType,
      userLocation,
      batteryStatus: batteryStatus || 100,
      circles: circlesToSave,
      contacts: contactsToNotify.map(contact => ({
        contactId: contact.contactId,
        name: contact.name,
        acknowledged: false,
        notifiedVia: 'App',
        batteryStatus: contact.batteryStatus,
      })),
      userId: req.user.uid,
    });
    await sosRequest.save();

    // Notify contacts via App
    for (const contact of contactsToNotify) {
      await notifyViaApp(contact, contact.emergencyMessage); // Pass the updated message
    }

    res.status(200).json({
      message: 'SOS message sent to all circles successfully!',
      notifiedContacts: contactsToNotify,
    });
  } catch (error) {
    console.error('Error sending SOS to all circles:', error);
    res.status(500).send('Failed to send SOS message.');
  }
};

exports.acknowledgeSOS = async (req, res) => {
  const { sosId, contactId } = req.body;

  try {
    // Find the SOS by ID
    const sos = await SOS.findById(sosId);

    if (!sos) {
      return res.status(404).json({ message: 'SOS not found' });
    }

    // Find the contact within the SOS contacts
    const contact = sos.contacts.find(c => c.contactId.toString() === contactId);
    if (!contact) {
      return res.status(403).json({ message: 'Contact not authorized to acknowledge this SOS' });
    }

    // Check if already acknowledged
    if (contact.acknowledged) {
      return res.status(409).json({ message: 'SOS already acknowledged by this contact' }); // Changed to 409 Conflict
    }

    // Mark the SOS as acknowledged
    contact.acknowledged = true;
    await sos.save();

    // Fetch the sender's information
    const sender = await User.findOne({ uid: sos.sender.userId });
    if (!sender) {
      return res.status(404).json({ message: 'Sender not found.' });
    }

    // Fetch the acknowledger's user information (for the phone number)
    const acknowledger = await Contact.findOne({ userId: contact.contactId });
    if (!acknowledger) {
      return res.status(404).json({ message: 'Acknowledging contact not found.' });
    }

    // Prepare the acknowledgment notification message including the contact's name and phone number
    const notificationMessage = `${acknowledger.name} (${acknowledger.phoneNumber}) has acknowledged your SOS. Try to contact them!`;

    // Send the acknowledgment notification to the sender
    if (sender.expoPushToken) {
      await sendAcknowledgePushNotification(sender.expoPushToken, notificationMessage);
    }

    return res.status(200).json({ message: 'SOS acknowledged successfully and notification sent to the sender.' });
  } catch (error) {
    console.error('Error acknowledging SOS:', error);
    return res.status(500).json({ message: 'Server error while acknowledging SOS' });
  }
};

exports.getSOS = async (req, res) => {
  try {
    // Get the current time and subtract 24 hours to set the time range
    const twentyFourHoursAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

    // Fetch only SOS entries created in the last 24 hours
    const sosRequests = await SOS.find({
      createdAt: { $gte: twentyFourHoursAgo },
    }).populate('sender', 'name batteryStatus userId'); // Populating 'sender' to include 'userId' along with 'name' and 'batteryStatus'

    if (!sosRequests || sosRequests.length === 0) {
      return res.status(404).json({ message: 'No active SOS found within the last 24 hours.' });
    }

    // Format the SOS response to include required fields, including the SOS ID and userId
    const formattedSOS = sosRequests.map((sos) => {
      return {
        id: sos._id, // Include the SOS ID
        sender: {
          name: sos.sender.name,
          batteryStatus: sos.sender.batteryStatus,
          userId: sos.sender.userId, // Include the userId
        },
        sosDetails: {
          emergencyType: sos.emergencyType,
          message: sos.message,
          userLocation: sos.userLocation?.address || 'Unknown location',
          createdAt: new Date(sos.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }), // Format to show only the time
        },
        contacts: sos.contacts.map((contact) => ({
          contactId: contact.contactId,
          name: contact.name,
          acknowledged: contact.acknowledged,
        })),
        // Extract circle names from sos.circles array
        circles: sos.circles.map((circle) => ({
          name: circle.circleName,
        })),
      };
    });

    res.status(200).json(formattedSOS);
  } catch (error) {
    console.error('Error retrieving SOS:', error);
    res.status(500).json({ message: 'Failed to retrieve SOS.' });
  }
};

exports.getSOSByUserId = async (req, res) => {
  try {
    const { userId } = req.params; // Get userId from the request parameters

    // Fetch SOS requests associated with the given userId and populate related fields
    const sosRequests = await SOS.find({ 'sender.userId': userId })
      .populate('contacts.contactId')  // Populate contacts with full contact details
      .populate('circles.circleId');    // Populate circles with full circle details

    if (!sosRequests || sosRequests.length === 0) {
      return res.status(404).json({ message: `No SOS requests found for user ${userId}.` });
    }

    // Optionally format the data before sending the response
    const formattedSOS = sosRequests.map(sos => ({
      id: sos._id, // Ensure this is included in your frontend
      sender: sos.sender,
      emergencyType: sos.emergencyType,
      message: sos.message,
      userLocation: sos.userLocation, // This should be an object, ensure it's structured as needed
      batteryStatus: sos.sender.batteryStatus, // Ensure batteryStatus comes from the sender
      circles: sos.circles, // Ensure this has all required details if needed
      contacts: sos.contacts.map(contact => ({
        id: contact._id, // You might want to include the contact ID for further operations
        name: contact.name,
        acknowledged: contact.acknowledged,
        notifiedVia: contact.notifiedVia,
      })),
      createdAt: sos.createdAt,
    }));

    res.status(200).json(formattedSOS); // Send the formatted SOS requests
  } catch (error) {
    console.error('Error retrieving SOS by userId:', error);
    res.status(500).json({ message: 'Failed to retrieve SOS for the specified user.' });
  }
};

exports.deleteSOSByUserId = async (req, res) => {
  const { userId, sosId } = req.params; // Get userId and sosId from the request parameters

  try {
    // Delete the SOS request associated with the given userId and sosId
    const result = await SOS.deleteOne({ _id: sosId, 'sender.userId': userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: `No SOS request found for user ${userId} with ID ${sosId} to delete.` });
    }

    res.status(200).json({ message: `SOS request with ID ${sosId} deleted for user ${userId}.` });
  } catch (error) {
    console.error('Error deleting SOS by userId:', error);
    res.status(500).json({ message: 'Failed to delete SOS request.' });
  }
};


// Mock function to simulate sendiyng notifications via the app
async function notifyViaApp(contact, message) {
  console.log(`Notifying ${contact.name} via app with message: ${message}`);
  // Simulate an asynchronous notification operation
}
