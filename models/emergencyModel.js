const mongoose = require('mongoose');
const EMERGENCY_TYPES = require('../utils/emergencyTypes');

const emergencySchema = new mongoose.Schema({
  userId: { type: String, required: true },  // Firebase UID of the user initiating the emergency
  emergencyType: {
    type: String,
    enum: Object.values(EMERGENCY_TYPES),
    required: true,
  },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  timestamp: { type: Date, default: Date.now },
  contactsNotified: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }]
});

module.exports = mongoose.model('Emergency', emergencySchema);
