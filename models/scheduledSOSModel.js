const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const scheduledSosSchema = new Schema({
  userId: { type: String, required: true },  // Firebase UID of the user
  message: { type: String, required: true },
  emergencyType: { type: String, required: true },
  userLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  selectedCircleIds: [{ type: Schema.Types.ObjectId, ref: 'Circle', required: true }],
  scheduledTime: { type: Date, required: true },
  batteryStatus: { type: Number, default: 100 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ScheduledSOS', scheduledSosSchema);
