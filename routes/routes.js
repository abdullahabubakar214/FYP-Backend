const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sosController');
const circleController = require('../controllers/circleController');
//const zoneController = require('../controllers/zoneController');
const scheduledSOSController = require('../controllers/scheduledSOSController');
const authenticateUser = require('../middlewares/firebaseAuth');
const userController = require('../controllers/userController');
const qrCodeController = require('../controllers/qrCodeController');
const weatherController = require('../controllers/WeatherController');
const chatcontroller = require('../controllers/chatbotController');
//const nearbyServicesController = require('../controllers/nearbyServicesController'); // Import nearby services controller

// SOS routes
router.post('/sos', authenticateUser, (req, res, next) => {
    console.log('SOS request received:', req.body); // Log SOS request details
    sosController.sendSOS(req, res, next);
});
router.post('/sos/schedule', authenticateUser, (req, res, next) => {
    console.log('Scheduled SOS request received:', req.body); // Log scheduled SOS request
    scheduledSOSController.scheduleSOS(req, res, next);
});
router.post('/sos/sendToAll', authenticateUser, sosController.sendSOSToAllCircles);
router.post('/sos/acknowledge', authenticateUser, sosController.acknowledgeSOS);
// Update the route to fetch SOS by circleId
router.get('/sos-details', authenticateUser, sosController.getSOS);
// Update the route to fetch SOS by userId
router.get('/sos-details/user/:userId', authenticateUser, sosController.getSOSByUserId);
router.delete('/sos-details/user/:userId/sos/:sosId',  authenticateUser, sosController.deleteSOSByUserId);

// Circle routes
router.post('/circles', authenticateUser, (req, res, next) => {
    console.log('Circle creation request received:', req.body); // Log circle creation
    circleController.createCircle(req, res, next);
});
router.post('/circles/join', authenticateUser, circleController.joinCircle);

router.get('/circles/:circleId/contacts', authenticateUser, circleController.getContactsInCircle);
router.delete('/circles/:circleId', authenticateUser, circleController.deleteCircle);
router.delete('/circles/:circleId/contacts/:contactId', authenticateUser, circleController.deleteContactFromCircle);
router.get('/circles/created', authenticateUser, circleController.getCreatedCircles);
router.get('/circles/joined', authenticateUser, circleController.getJoinedCircles);
router.put('/contacts/:contactId/location', authenticateUser, circleController.updateContactLocationAndBattery);
router.get('/circles/member/:userId/profile', authenticateUser, circleController.getMemberProfile);
// User route for fetching profile
router.get('/users/:uid', userController.syncUserProfile);
// QR Code routes
router.post('/qr-codes', (req, res, next) => {
    console.log('QR Code creation/update request received:', req.body); // Log QR code request
    authenticateUser, qrCodeController.createOrUpdateQRCode(req, res, next);
}); // Create or update QR code
router.delete('/qr-codes', authenticateUser, qrCodeController.deleteQRCode); // Delete QR code
router.get('/qr-codes', authenticateUser, qrCodeController.getQRCodeDetails); // Get QR code details

// Make the getUserCardData route publicly accessible
router.get('/getUserCardData/:uid', (req, res, next) => {
    console.log('Request to get user card data for UID:', req.params.uid); // Log request to get user card data
    qrCodeController.getUserCardData(req, res, next);
}); // No authentication needed here

router.get('/weather-updates', weatherController.getWeatherUpdates);
router.post("/get-help", chatcontroller.getEmergencyResponse);


// Nearby services route
//router.get('/nearby-services', nearbyServicesController.getNearbyServices); // Fetch nearby services based on location and emergency type


// Route to create a new Beacon
//router.post('/Signal', authenticateUser, zoneController.createSignal);
// Route to fetch all Signals by userId and circleId
//router.get('/Signal/user/:userId/circle/:circleId', authenticateUser, zoneController.getSignalsByUserIdAndCircleId);
// Route to delete a Beacon manually by its ID
//router.delete('/Signal/:id', authenticateUser, zoneController.deleteSignal);
// Route to fetch all Signals by Circle ID
//router.get('/Signal/circle/:circleId', authenticateUser, zoneController.getSignalsByCircleId);


// Export the router
module.exports = router;
