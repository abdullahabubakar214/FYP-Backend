const ScheduledSOS = require('../models/scheduledSOSModel');

exports.scheduleSOS = async (req, res) => {
  const { message, emergencyType, userLocation, selectedCircleIds, scheduledTime, batteryStatus } = req.body;

  if (!message || !userLocation || !emergencyType || !scheduledTime) {
    return res.status(400).send('Invalid request: missing message, user location, emergency type, or schedule time.');
  }

  try {
    const scheduledSos = new ScheduledSOS({
      userId: req.user.uid,  // Firebase UID
      message,
      emergencyType,
      userLocation,
      selectedCircleIds,
      scheduledTime,
      batteryStatus: batteryStatus || 100  // Default to 100 if not provided
    });

    await scheduledSos.save();

    res.status(200).json({
      message: 'Scheduled SOS alert created successfully!',
      scheduledTime: scheduledSos.scheduledTime
    });
  } catch (error) {
    console.error('Error creating scheduled SOS:', error);
    res.status(500).send('Failed to schedule SOS alert.');
  }
};
