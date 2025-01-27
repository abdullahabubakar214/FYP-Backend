const mongoose = require('mongoose');

// Import the models
const Circle = require('../models/circleModel');
const SOS = require('../models/sosModel');
const UserCard = require('../models/cardModel');
const User = require('../models/userModel');

// Define the emergency types array
const emergencyTypes = [
    "Fire", "Medical", "Police", "Natural Disaster", "Accident", "Theft",
    "Flood", "Earthquake", "Tsunami", "Hurricane", "Tornado", "Lightning Strike",
    "Animal Attack", "Drowning", "Child Abduction", "Domestic Violence", 
    "Armed Robbery", "Poisoning", "Gas Leak", "Power Outage", "Lost Person",
    "Explosive Threat", "Chemical Spill", "Biological Hazard", "Radiation Exposure",
    "Mental Health Crisis", "Suicide Attempt", "Firearm Incident", "Building Collapse", 
    "Hostage Situation", "Vehicular Breakdown", "Heat Stroke", "Cold Exposure", 
    "General", "Custom"
];


const getAllCircles = async (req, res) => {
    try {
        const circles = await Circle.find();
        res.status(200).json({ success: true, data: circles });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getAllSOS = async (req, res) => {
    const { page = 1 } = req.query;  // Remove the limit from the query
    try {
        const sosRecords = await SOS.find()
            .skip((page - 1) * 10);  // Keep pagination but remove limit
        const totalRecords = await SOS.countDocuments();
        res.status(200).json({
            success: true,
            data: sosRecords,
            pagination: {
                totalRecords,
                currentPage: page,
                totalPages: Math.ceil(totalRecords / 10)  // You can change 10 to any other page size
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



const getAllUserCards = async (req, res) => {
    try {
        const userCards = await UserCard.find();
        res.status(200).json({ success: true, data: userCards });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteUser = async (req, res) => {
    const { userId } = req.params;
    try {
        await User.findByIdAndDelete(userId);
        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateUser = async (req, res) => {
    const { userId } = req.params;
    const updates = req.body; // Ensure you validate and sanitize these inputs
    try {
        const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true });
        res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteSOS = async (req, res) => {
    const { sosId } = req.params;
    try {
        await SOS.findByIdAndDelete(sosId);
        res.status(200).json({ success: true, message: 'SOS deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteCircle = async (req, res) => {
    const { circleId } = req.params;
    try {
        await Circle.findByIdAndDelete(circleId);
        res.status(200).json({ success: true, message: 'Circle deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Function to get active SOS from the last 24 hours
const getActiveSOS = async (req, res) => {
    try {
        // Calculate the date 24 hours ago
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

        // Fetch SOS records from the last 24 hours
        const activeSOSRecords = await SOS.find({ createdAt: { $gte: twentyFourHoursAgo } }).exec();


        // Check if there are active SOS records
        if (activeSOSRecords.length === 0) {
            return res.status(404).json({ success: false, message: 'No active SOS in the last 24 hours.' });
        }

        res.status(200).json({ success: true, data: activeSOSRecords });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getEmergencyTrends = async (req, res) => {
    try {
        // Fetch all SOS records
        const sosRecords = await SOS.find();

        // Check if there are any SOS records
        if (sosRecords.length === 0) {
            return res.status(404).json({ success: false, message: 'No SOS records found.' });
        }

        // Initialize a map to hold counts for each emergency type
        const trends = emergencyTypes.reduce((acc, type) => {
            acc[type] = 0; // Initialize count for each type
            return acc;
        }, {});

        // Count occurrences of each emergency type
        sosRecords.forEach(sos => {
            if (sos.emergencyType in trends) {
                trends[sos.emergencyType]++;
            } else {
                trends["Custom"]++; // Count custom types as "Custom"
            }
        });

        // Convert trends object to array and filter out zero counts
        const trendsArray = Object.keys(trends)
            .map(type => ({
                emergencyType: type,
                count: trends[type]
            }))
            .filter(trend => trend.count > 0); // Filter out zero counts

        // Sort trends by count in descending order
        trendsArray.sort((a, b) => b.count - a.count);

        // Return the trend data
        res.status(200).json({
            success: true,
            data: trendsArray,
            message: 'Emergency trends calculated successfully.'
        });
    } catch (error) {
        console.error('Error calculating emergency trends:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Export the controller methods
module.exports = {
    getAllCircles,
    getAllSOS,
    getAllUserCards,
    getAllUsers,
    deleteUser,
    updateUser,
    deleteSOS,
    deleteCircle,
    getActiveSOS,
    getEmergencyTrends,
};
