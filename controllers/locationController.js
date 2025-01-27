/*
const express = require('express');
const geolocationService = require('../services/geolocationService');
const router = express.Router();

router.post('/fetch-location', async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and Longitude are required' });
  }

  try {
    const address = await geolocationService.getAddressFromCoordinates(latitude, longitude);

    res.status(200).json({
      coordinates: { latitude, longitude },
      address,
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ error: 'Failed to fetch location details.' });
  }
});

module.exports = router;
*/