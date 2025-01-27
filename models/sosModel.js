const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sosSchema = new Schema({
  userId: { type: String, required: true },  // Firebase UID of the user initiating the SOS
  message: { type: String, required: true },
  emergencyType: { type: String, required: true }, // Medical, Fire, Police, etc.
  userLocation: { // Changed to accept both lat/lng and formatted address
    address: { type: String, required: true }  // New field for human-readable address
  },
  circles: [
    {
      circleId: { type: Schema.Types.ObjectId, ref: 'Circle', required: true }, // MongoDB ObjectId for circles
      circleName: { type: String, required: true }, // Store the circle name as well
    }
  ],
  contacts: [
    {
      contactId: { type: String },  // Firebase UID as String
      name: { type: String, required: true },  // Name of the contact
      notifiedVia: { type: String, default: 'App' },  // Method of notification
      acknowledged: { type: Boolean, default: false },
    }
  ],
  sender: {  // New field to store sender details
    name: { type: String, required: true },  // Sender's name
    userId: { type: String, required: true }, // Sender's Firebase UID
    batteryStatus: { type: Number, default: 100 } // Sender's battery status
  },
  createdAt: { type: Date, default: Date.now }
});

// Export the SOS model
module.exports = mongoose.model('SOS', sosSchema);
