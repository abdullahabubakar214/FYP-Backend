// models/userCardModel.js
const mongoose = require('mongoose');

const userCardSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: true,
        unique: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    age: {
        type: Number,
        required: true,
    },
    bloodGroup: {
        type: String,
        required: true,
    },
    medicines: {
        type: [String], // Array of strings for medicine names
        default: [],
    },
// customMedicine: {
//         type: String,
//         default: '',
//     },
    disease: {
        type: [String], // Array of strings for disease names
        default: [],
    },
    // customDisease: {
    //     type: String,
    //     default: '',
    // },
    // organDonation: {
    //     type: Boolean,
    //     default: false,
    // },
    emergencyNumbers: {
        type: [String], // Array for multiple emergency numbers
        required: true,
    },
    address: {
        type: String,
        default: '',
    },
    allergies: {
        type: [String], // Array of strings for allergy details
        default: [],
    },
    // insuranceDetails: {
    //     type: String,
    //     default: '',
    // },
    // preferredHospital: {
    //     type: String,
    //     default: '',
    // },
    emergencyInstructions: {
        type: String,
        default: '',
    },
    qrCodeDetails: {
        type: Object, // Store details related to the QR code
        default: {},
    },
    qrCodeImage: {
        type: String, // Store the QR code image as a Base64 string
        default: '',
    },
}, {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
});

// Create the User model
const UserCard = mongoose.model('UserCard', userCardSchema);

// Export the model
module.exports = UserCard;
