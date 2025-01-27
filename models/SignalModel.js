const mongoose = require('mongoose');

const signalSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Firebase UID of the user

  circleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Circle', required: true },
  
  // Location fields
  locationText: { type: String, required: true }, // Human-readable location text
  lat: { type: Number, required: true }, // Latitude of the signal location
  lng: { type: Number, required: true }, // Longitude of the signal location
  
  radius: { type: Number, required: true }, // Radius in meters
  
  // Duration fields
  duration: { type: Number, required: true }, // Duration value
  durationUnit: { type: String, required: true }, // Duration unit ('minutes', 'hours', 'days', 'weeks', 'months')
  expirationDate: { type: Date, required: true }, // Calculated expiration date based on duration
  
  // Optional message
  message: { type: String }, // Optional message that the user can provide
  
  // Contacts that were notified
  notifiedContacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
  
  // Creator's name
  createdBy: { type: String, required: true }, // Add createdBy field

  // Timestamps for created and updated times
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware to update 'updatedAt' field on document modification
signalSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Signal = mongoose.model('Signal', signalSchema);
module.exports = Signal;
