const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  uid: { type: String, required: true, unique: true },
  name: { type: String, required: false },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: false },
  profileImage: { type: String, required: false }, // New field for profile image
  location: { // New field for location (latitude, longitude)
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false }
  },
  batteryLevel: { type: Number, required: false }, // New field for battery level
  createdCircles: [{ type: Schema.Types.ObjectId, ref: 'Circle' }],
  joinedCircles: [{ type: Schema.Types.ObjectId, ref: 'Circle' }],
  sosHistory: [{
    sosId: { type: Schema.Types.ObjectId, ref: 'SOS' },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' }, // New field for user status
  expoPushToken: { type: String } // Added field for expoPushToken
});

module.exports = mongoose.model('User', userSchema);
