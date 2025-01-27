const QRCode = require('qrcode'); // Ensure you've installed the qrcode package
const User = require('../models/cardModel'); // Assuming you have a User model
const mongoose = require('mongoose');

// Middleware to check if user is authenticated
const authenticateUser = (req, res, next) => {
    if (!req.user) {
        console.warn('Unauthorized access attempt'); // Log unauthorized access
        return res.status(401).json({ message: 'Unauthorized' });
    }
    console.log('User authenticated:', req.user.uid); // Log authenticated user
    next();
};

const generateQRCodeData = (userId) => {
    const serverUrl = 'http://192.168.231.121:8080'; // Replace with your actual local IP address and port
    return `${serverUrl}/api/getUserCardData/${userId}`;
};

const createOrUpdateQRCode = async (req, res) => {
    // Use userId from the request body (ensure it is sent in the request)
    const userId = req.body.userId; // Change this line to get userId from body
    const {
        fullName,
        age,
        bloodGroup,
        medicines = [],
        disease = [],
        emergencyNumber1,
        emergencyNumber2 = '',
        address = '',
        allergies = [],
        insuranceDetails = '',
        preferredHospital = '',
        emergencyInstructions = '',
    } = req.body;

    try {
        // Prepare QR code details
        const qrCodeDetails = {
            fullName,
            age,
            bloodGroup,
            medicines,
            disease,
            emergencyNumbers: [emergencyNumber1, emergencyNumber2],
            address,
            allergies,
            insuranceDetails,
            preferredHospital,
            emergencyInstructions,
        };

        console.log('Preparing QR code details for user:', userId); // Log user QR code details

        // Check if user already has a QR code
        let userCard = await User.findOne({ uid: userId });

        // Only generate a new QR code if it doesn't exist
        let qrCodeImage;
        if (!userCard) {
            const qrCodeData = generateQRCodeData(userId);
            qrCodeImage = await QRCode.toDataURL(qrCodeData);
            console.log('Generated new QR code image for user:', userId); // Log new QR code generation
        } else {
            qrCodeImage = userCard.qrCodeImage; // Keep existing QR code image
            console.log('Using existing QR code image for user:', userId); // Log usage of existing QR code
        }

        // Update or create user card with details
        userCard = await User.findOneAndUpdate(
            { uid: userId },
            {
                ...qrCodeDetails,
                qrCodeDetails,
                qrCodeImage,
            },
            { upsert: true, new: true }
        );

        console.log('User card updated for user:', userId); // Log successful update

        return res.status(userCard ? 200 : 201).json({
            message: userCard ? 'QR code details updated successfully' : 'QR code created successfully',
            qrCodeImage,
        });
    } catch (error) {
        console.error('Error creating/updating QR code:', error);
        return res.status(500).json({ message: 'Failed to create/update QR code' });
    }
};

const getUserCardData = async (req, res) => {
    const userId = req.params.uid;
    console.log('Received UID for fetching user card data:', userId);

    try {
        const userCard = await User.findOne({ uid: userId });

        if (!userCard) {
            console.warn('No user card found for UID:', userId);
            return res.status(404).json({ message: 'No data found for this user' });
        }

        // Check the `Accept` header to decide the response format
        const acceptHeader = req.headers['accept'];
        if (acceptHeader && acceptHeader.includes('application/json')) {
            // Respond with JSON format if request came from the frontend
            return res.status(200).json({
                qrCodeDetails: userCard.qrCodeDetails,
                qrCodeImage: userCard.qrCodeImage,
            });
        } else {
            // Respond with HTML format for QR code scanning
            return res.send(`
                <html>
                <head>
                    <title>User Information</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; padding: 0; }
                        h1 { color: #333; }
                        .container { max-width: 600px; margin: auto; }
                        .info { margin: 10px 0; }
                    </style>
                </head>
               <body>
    <div class="container" style="max-width: 600px; margin: auto; font-family: Arial, sans-serif;">
        <!-- User Information -->
        <h1 style="text-align: center; color: #333;">User Information</h1>
        <div class="info"><strong>Full Name:</strong> ${userCard.qrCodeDetails.fullName}</div>
        <div class="info"><strong>Age:</strong> ${userCard.qrCodeDetails.age}</div>
        <div class="info"><strong>Blood Group:</strong> ${userCard.qrCodeDetails.bloodGroup}</div>
        <div class="info"><strong>Medicines:</strong> ${userCard.qrCodeDetails.medicines.join(', ') || 'None'}</div>
        <div class="info"><strong>Diseases:</strong> ${userCard.qrCodeDetails.disease.join(', ') || 'None'}</div>
        <div class="info"><strong>Allergies:</strong> ${userCard.qrCodeDetails.allergies.join(', ') || 'None'}</div>
        <div class="info"><strong>Emergency Numbers:</strong> ${userCard.qrCodeDetails.emergencyNumbers.join(', ')}</div>
        <div class="info"><strong>Address:</strong> ${userCard.qrCodeDetails.address}</div>
        <div class="info"><strong>Preferred Hospital:</strong> ${userCard.qrCodeDetails.preferredHospital || 'None'}</div>
        <div class="info"><strong>Emergency Instructions:</strong> ${userCard.qrCodeDetails.emergencyInstructions || 'None'}</div>

        <!-- Public Note -->
        <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border: 1px solid #e1e1e1; border-radius: 8px;">
            <p style="font-size: 1.1em; color: #555;">
                <strong>Note:</strong> This information has been shared to help in case of an emergency. If you found this person's phone or they need assistance, please contact their emergency numbers listed above.
            </p>
            <p style="text-align: center; font-weight: bold; color: #333;">
                Thank you for your help and support! <br>
                — <i>EAS Help is HERE</i>
            </p>
        </div>
    </div>
</body>

                </html>
            `);
        }
    } catch (error) {
        console.error('Error fetching user card data:', error);

        // Check Accept header to respond with appropriate error format
        if (req.headers['accept'] && req.headers['accept'].includes('application/json')) {
            return res.status(500).json({ message: 'Failed to fetch user card data' });
        } else {
            return res.status(500).send('<h1>Error</h1><p>Failed to fetch user card data</p>');
        }
    }
};

// Delete QR code
const deleteQRCode = async (req, res) => {
    const userId = req.user.uid;

    console.log('Attempting to delete QR code for user:', userId); // Log delete attempt

    try {
        const result = await User.findOneAndDelete({ uid: userId }); // Use findOneAndDelete to remove the document

        if (!result) {
            console.warn('No QR code found for user:', userId); // Log warning if no QR code was found
            return res.status(404).json({ message: 'No QR code found for this user' });
        }

        console.log('QR code deleted successfully for user:', userId); // Log successful deletion
        return res.status(200).json({ message: 'QR code deleted successfully' });
    } catch (error) {
        console.error('Error deleting QR code:', error);
        return res.status(500).json({ message: 'Failed to delete QR code' });
    }
};

// Get QR code details
const getQRCodeDetails = async (req, res) => {
    const userId = req.user.uid;

    console.log('Fetching QR code details for user:', userId); // Log fetching attempt

    try {
        const userCard = await User.findOne({ uid: userId }).select('qrCodeDetails qrCodeImage');

        if (!userCard || !userCard.qrCodeDetails) {
            console.warn('No QR code found for user:', userId); // Log warning if no QR code found
            return res.status(404).json({ message: 'No QR code found for this user' });
        }

        return res.status(200).json(userCard);
    } catch (error) {
        console.error('Error fetching QR code details:', error);
        return res.status(500).json({ message: 'Failed to fetch QR code details' });
    }
};


// Export all the functions
module.exports = {
    authenticateUser,
    generateQRCodeData,
    createOrUpdateQRCode,
    deleteQRCode,
    getQRCodeDetails,
    getUserCardData,
};
