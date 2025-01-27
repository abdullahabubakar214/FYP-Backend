const Contact = require('../models/contactModel');

// Create a new contact
exports.createContact = async (req, res) => {
  const { name, emergencyNumber, role, location } = req.body;

  try {
    const newContact = new Contact({ name, emergencyNumber, role, location });
    await newContact.save();
    res.status(201).json(newContact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).send('Failed to create contact.');
  }
};
