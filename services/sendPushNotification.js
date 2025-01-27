const { Expo } = require('expo-server-sdk');
const expo = new Expo();

async function sendPushNotification(expoPushToken, message, batteryStatus, location, emergencyType, acknowledge = false) {
  const formattedMessage = `${message}\nBattery: ${batteryStatus}%\nLocation: ${location}\nEmergency Type: ${emergencyType}`;
  
  const messages = [{
    to: expoPushToken,
    sound: 'default',
    body: formattedMessage,
    data: { 
      message: message,
      batteryStatus: batteryStatus,
      location: location,
      emergencyType: emergencyType,
      acknowledge: acknowledge
    },
  }];

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          console.error(`Error sending notification: ${ticket.message}`);
          if (ticket.details && ticket.details.error) {
            console.error(`Error code: ${ticket.details.error}`);
          }
        }
      }
    } catch (error) {
      console.error('Error sending notification chunk:', error);
    }
  }
}

async function sendAcknowledgePushNotification(expoPushToken, message) {
  const messages = [{
    to: expoPushToken,
    sound: 'default',
    body: message,
    data: { 
      message: message,
      acknowledge: true
    },
  }];

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          console.error(`Error sending acknowledgment notification: ${ticket.message}`);
          if (ticket.details && ticket.details.error) {
            console.error(`Error code: ${ticket.details.error}`);
          }
        }
      }
    } catch (error) {
      console.error('Error sending acknowledgment notification chunk:', error);
    }
  }
}


module.exports = {
  sendPushNotification,
  sendAcknowledgePushNotification,
};

/*
// Function to send notifications for signals (creation, deletion, expiration)
async function sendSignalNotification(expoPushToken, senderName, location, message, expirationDate, notificationType) {
  let formattedMessage;

  // Determine the notification type (creation, deletion, or expiration)
  if (notificationType === 'creation') {
    formattedMessage = `${senderName} has created a signal at ${location}.\nMessage: ${message}\nAvailable until: ${expirationDate.toLocaleString()}`;
  } else if (notificationType === 'deletion') {
    formattedMessage = `${senderName} has deleted the signal at ${location}.\nMessage: ${message}`;
  } else if (notificationType === 'expiration') {
    formattedMessage = `The signal at ${location}, created by ${senderName}, has expired and is no longer active.`;
  } else {
    throw new Error('Invalid notification type');
  }

  // Create the push notification message
  const messages = [{
    to: expoPushToken,
    sound: 'default',
    body: formattedMessage,
    data: {
      senderName: senderName,
      message: message,
      location: location,
      expirationDate: expirationDate,
      notificationType: notificationType
    },
  }];

  // Send the notification
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          console.error(`Error sending notification: ${ticket.message}`);
          if (ticket.details && ticket.details.error) {
            console.error(`Error code: ${ticket.details.error}`);
          }
        }
      }
    } catch (error) {
      console.error('Error sending notification chunk:', error);
    }
  }
}


// Function to notify the signal creator about signal creation, deletion, or expiration
async function notifySignalCreator(expoPushToken, location, expirationDate, notificationType) {
  let message;

  // Determine the notification type (creation or deletion)
  if (notificationType === 'creation') {
    message = `Your signal was created at ${location} and contacts were notified.\nExpires at: ${expirationDate.toLocaleString()}`;
  } else if (notificationType === 'deletion') {
    message = `Your signal at ${location} was successfully deleted and your circle contacts were notified.`;
  } else if (notificationType === 'expiration') {
    message = `Your signal at ${location} has expired and was automatically deleted.`;
  } else {
    throw new Error('Invalid notification type');
  }

  // Create the message for the creator's push notification
  const messages = [{
    to: expoPushToken,
    sound: 'default',
    body: message,
    data: {
      location: location,
      expirationDate: expirationDate,
      notificationType: notificationType
    },
  }];

  // Send the notification
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          console.error(`Error sending creator notification: ${ticket.message}`);
          if (ticket.details && ticket.details.error) {
            console.error(`Error code: ${ticket.details.error}`);
          }
        }
      }
    } catch (error) {
      console.error('Error sending creator notification chunk:', error);
    }
  }
}
*/
