const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admincontroller'); // Adjust path if necessary

// Admin routes
router.get('/users', adminController.getAllUsers); // Get all users
router.delete('/users/:userId', adminController.deleteUser); // Delete a user
router.put('/users/:userId', adminController.updateUser); // Update user details

router.get('/sos', adminController.getAllSOS); // Get all SOS records
router.delete('/sos/:sosId', adminController.deleteSOS); // Delete SOS by ID

router.get('/circles', adminController.getAllCircles); // Get all circles
router.delete('/circles/:circleId', adminController.deleteCircle); // Delete circle by ID

router.get('/user-cards', adminController.getAllUserCards); // Get all user cards
router.get('/sos/active', adminController.getActiveSOS); // Get active SOS from the last 24 hours

// New route for emergency trends
router.get('/sos/trends', adminController.getEmergencyTrends); // Get trends of emergency types

// Export the router
module.exports = router;
