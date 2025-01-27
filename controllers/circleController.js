const Circle = require('../models/circleModel');
const Contact = require('../models/contactModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');

const { syncUserProfile } = require('./userController');


// Generate a unique circle code
const generateCircleCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let circleCode = '';
  for (let i = 0; i < 6; i++) {
    circleCode += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return circleCode;
};

// Create a new circle and assign the creator as admin
const createCircle = async (req, res) => {
  const { name, profileImage, memberUserIds } = req.body; // Accept member user IDs from request
  const userId = req.user.uid; // Extract userId from the authorization token

  if (!name) {
    return res.status(400).json({ message: 'Circle name is required.' });
  }

  try {
    // Fetch user profile from MongoDB
    const userProfile = await User.findOne({ uid: userId });
    if (!userProfile) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    // Fetch additional members' profiles
    const memberProfiles = await User.find({ uid: { $in: memberUserIds } });

    // Create the circle with the admin and member contacts
    const newCircle = new Circle({
      name,
      profileImage,
      adminId: userId,
      contacts: [
        {
          userId: userProfile.uid,
          role: 'admin', // Set role as admin
          name: userProfile.name,
          phoneNumber: userProfile.phoneNumber,
          email: userProfile.email,
        },
        ...memberProfiles.map(member => ({
          userId: member.uid,
          role: 'member', // Set default role as member
          name: member.name,
          phoneNumber: member.phoneNumber,
          email: member.email,
        })),
      ],
      circleCode: generateCircleCode(),
    });

    // Save the new circle
    await newCircle.save();

    // Upsert the admin's contact information with circle ID and role
    await Contact.findOneAndUpdate(
      { userId: userProfile.uid },
      {
        $addToSet: {
          roles: { circleId: newCircle._id, role: 'admin' }
        }
      },
      { upsert: true, new: true }
    );

    // Upsert each member's contact information with circle ID and role
    for (const member of memberProfiles) {
      await Contact.findOneAndUpdate(
        { userId: member.uid },
        {
          $addToSet: {
            roles: { circleId: newCircle._id, role: 'member' }
          }
        },
        { upsert: true, new: true }
      );
    }

    res.status(201).json({ message: 'Circle created successfully', circle: newCircle });
  } catch (error) {
    console.error('Error creating circle:', error);
    res.status(500).json({ message: 'Failed to create circle' });
  }
};

const joinCircle = async (req, res) => {
  const { circleCode } = req.body;
  const userId = req.user.uid; // Get user ID from the authenticated request

  try {
    // Find the circle by its code
    const circle = await Circle.findOne({ circleCode });
    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    // Sync user profile from Firestore and update MongoDB
    let userProfile = await syncUserProfile(userId);

    if (!userProfile) {
      return res.status(404).json({ message: "User profile not found" });
    }

    // Check if the user is already in the circle contacts
    const contactExists = circle.contacts.some(contact => contact.userId === userProfile.uid);
    if (contactExists) {
      return res.status(400).json({ message: "User has already joined this circle" });
    }

    // Prepare the contact data to be added/updated in the contact schema
    const contactData = {
      userId: userProfile.uid,
      name: userProfile.name,
      email: userProfile.email,
      phoneNumber: userProfile.phoneNumber,
      location: {
        latitude: userProfile.location?.latitude || null,
        longitude: userProfile.location?.longitude || null
      },
      batteryPercentage: userProfile.batteryLevel || null,
      profileImage: userProfile.profileImage || null,
    };

    // Upsert the contact into the Contact model
    const updatedContact = await Contact.findOneAndUpdate(
      { userId: userProfile.uid },
      contactData,
      { upsert: true, new: true }
    );

    // Add the contact to the circle's contacts array
    circle.contacts.push({
      userId: updatedContact.userId,
      role: 'member' // Set role as member
    });

    await circle.save(); // Save the updated circle

    // Upsert the user's role in the Contact model with circle ID
    await Contact.findOneAndUpdate(
      { userId: userProfile.uid },
      {
        $addToSet: {
          roles: { circleId: circle._id, role: 'member' } // Save circle ID and role
        }
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ message: "User successfully joined the circle", circle });
  } catch (error) {
    console.error('Error joining circle:', error);
    return res.status(500).json({ message: 'Error joining circle' });
  }
};

const getContactsInCircle = async (req, res) => {
  const { circleId } = req.params; // Extract circleId from request parameters

  try {
    const circle = await Circle.findById(circleId);
    if (!circle) {
      console.error(`Circle not found for ID: ${circleId}`);
      return res.status(404).json({ message: "Circle not found" });
    }

    // Fetch contacts who have this circleId in their roles
    const contacts = await Contact.aggregate([
      { $match: { 'roles.circleId': new mongoose.Types.ObjectId(circleId) } },
      {
        $project: {
          userId: 1,
          name: 1,
          email: 1,
          phoneNumber: 1,
          location: 1,
          batteryPercentage: 1,
          profileImage: 1,
          status: 1,
          roles: {
            $filter: {
              input: "$roles",
              as: "role",
              cond: { $eq: ["$$role.circleId", new mongoose.Types.ObjectId(circleId)] }
            }
          }
        }
      }
    ]);

    // Prepare response contacts with only the role that matches the circleId
    const updatedContacts = contacts.map(contact => {
      const roleInfo = contact.roles[0]; // Should only have one role after filtering by circleId

      return {
        _id: contact._id,
        userId: contact.userId,
        name: contact.name,
        email: contact.email,
        phoneNumber: contact.phoneNumber,
        location: contact.location,
        batteryPercentage: contact.batteryPercentage,
        profileImage: contact.profileImage,
        status: contact.status,
        role: roleInfo ? roleInfo.role : 'member', // Default to 'member' if no role found
      };
    });

    return res.status(200).json({ contacts: updatedContacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return res.status(500).json({ message: 'Error fetching contacts', error: error.message });
  }
};

// Admin-only: Delete circle and update contacts' roles (but do not delete contacts themselves)
const deleteCircle = async (req, res) => {
  const { circleId } = req.params;
  const userId = req.user.uid;

  try {
    // Step 1: Find the circle by its ID
    const circle = await Circle.findById(circleId);

    if (!circle) {
      return res.status(404).json({ message: 'Circle not found' });
    }

    // Step 2: Check if the user is an admin of the circle
    const isAdmin = circle.contacts.some(contact => contact.userId === userId && contact.role === 'admin');
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only the admin can delete this circle.' });
    }

    // Step 3: Get the list of contacts (userIds) from the circle
    const contactIds = circle.contacts.map(contact => contact.userId);

    // Step 4: Remove the circle from the 'roles' array in the Contact model (but do not delete the contacts)
    await Contact.updateMany(
      { userId: { $in: contactIds } },
      { $pull: { roles: { circleId: circleId } } } // Remove only the role related to the deleted circle
    );

    // Step 5: Delete the circle from the Circle collection
    await Circle.findByIdAndDelete(circleId);

    // Success response
    res.status(200).json({ message: 'Circle deleted and roles updated successfully' });
  } catch (error) {
    console.error('Error deleting circle:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


const deleteContactFromCircle = async (req, res) => {
  const { circleId, contactId } = req.params;
  const userId = req.user.uid;

  try {
    // Step 1: Find the circle by its ID
    const circle = await Circle.findById(circleId);

    if (!circle) {
      return res.status(404).json({ message: 'Circle not found' });
    }

    // Step 2: Check if the contact to be deleted exists in the circle
    const contactExists = circle.contacts.some(contact => contact.userId === contactId);
    if (!contactExists) {
      return res.status(404).json({ message: 'Contact not found in this circle.' });
    }

    // Step 3: Remove the contact from the circle's contacts array
    circle.contacts = circle.contacts.filter(contact => contact.userId !== contactId);
    await circle.save(); // Save the updated circle

    // Step 4: Remove the circle role from the Contact model's 'roles' array
    const updatedContact = await Contact.findOneAndUpdate(
      { userId: contactId },
      { $pull: { roles: { circleId: circleId } } }, // Remove the role with the specific circleId
      { new: true } // Return the updated contact document
    );

    // Step 5: Check if the contact was successfully updated and handle if the contact itself no longer exists
    if (!updatedContact) {
      return res.status(404).json({ message: 'Contact not found in the system.' });
    }

    // Success response
    res.status(200).json({ message: 'Contact removed from circle successfully' });
  } catch (error) {
    console.error('Error deleting contact from circle:', error);
    res.status(500).json({ message: 'Failed to delete contact from circle' });
  }
};

// Update contact location and battery
const updateContactLocationAndBattery = async (req, res) => {
  const { contactId } = req.params;
  const { latitude, longitude, batteryPercentage } = req.body;

  try {
    const contact = await Contact.findById(contactId);
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found.' });
    }

    // Update contact location and battery status
    contact.location = { latitude, longitude };
    contact.batteryPercentage = batteryPercentage;
    await contact.save();

    // Broadcast the update (if using WebSockets or Firebase)
    // socket.emit('contactUpdate', contact);

    res.status(200).json(contact);
  } catch (error) {
    console.error('Error updating contact location and battery:', error);
    res.status(500).json({ message: 'Failed to update contact.' });
  }
};

// Get member profile
const getMemberProfile = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      uid: user.uid,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profileImage: user.profileImage,
    });
  } catch (error) {
    console.error('Error fetching member profile:', error);
    res.status(500).json({ message: 'Failed to fetch member profile' });
  }
};

const getCreatedCircles = async (req, res) => {
  const userId = req.user.uid;

  try {
    // Find circles where the current user is the admin
    const createdCircles = await Circle.find({ adminId: userId });

    // Return the created circles if found
    return res.status(200).json(createdCircles);
  } catch (error) {
    console.error('Error fetching created circles:', error);
    return res.status(500).json({ message: 'Failed to fetch created circles' });
  }
};

const getJoinedCircles = async (req, res) => {
  const userId = req.user.uid;

  try {
    // Find circles where the user is listed in the contacts array
    const joinedCircles = await Circle.find({ 'contacts.userId': userId });

    // Instead of returning a 404, return an empty array if no circles are found
    return res.status(200).json(joinedCircles);
  } catch (error) {
    console.error('Error fetching joined circles:', error);
    return res.status(500).json({ message: 'Failed to fetch joined circles' });
  }
};

// Export all the functions
module.exports = {
  createCircle,
  joinCircle,
  deleteCircle,
  deleteContactFromCircle,
  getCreatedCircles, // updated to get created circles
  getJoinedCircles,  // updated to get joined circles
  updateContactLocationAndBattery,
  getMemberProfile,
  getContactsInCircle,
  generateCircleCode
};

