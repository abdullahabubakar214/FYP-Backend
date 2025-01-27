const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const circleSchema = new Schema({
    name: { type: String, required: true },
    profileImage: { type: String },
    contacts: [
        {
            userId: { type: String, ref: 'User' }, // Ensure userId is a string
            role: { type: String, enum: ['admin', 'member'], default: 'member' }
        }
    ],
    adminId: { type: String, ref: 'User', required: true }, // Ensure adminId is a string
    createdAt: { type: Date, default: Date.now },
    circleCode: { type: String, unique: true }
});

module.exports = mongoose.model('Circle', circleSchema);
