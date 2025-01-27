const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roleSchema = new Schema({
    circleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Circle', required: true },
    role: { type: String, enum: ['admin', 'member'], required: true },
}, { _id: false }); // Disable automatic ID generation for this sub-document

const contactSchema = new Schema({
    userId: { type: String, required: true },
    name: { type: String },
    email: { type: String },
    phoneNumber: { type: String },
    location: {
        latitude: { type: Number },
        longitude: { type: Number },
    },
    batteryPercentage: { type: Number },
    roles: [roleSchema], // Array of roles for different circles
    profileImage: { type: String },
    emergencyNumber: { type: String },
    status: { type: String, enum: ['online', 'offline'], default: 'offline' }, // New field for contact status
    expoPushToken: { type: String } // Added field for expoPushToken
});

module.exports = mongoose.model('Contact', contactSchema);
