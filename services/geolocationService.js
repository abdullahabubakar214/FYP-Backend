/*

const axios = require('axios');
const geolib = require('geolib');

// Google Geocoding API URL and key (ensure you set your API key in the .env file)
const GEOCODING_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const API_KEY = process.env.GOOGLE_GEOCODING_API_KEY;

// Calculate distance in meters between two points
exports.calculateDistance = (from, to) => {
  if (!from || !to || !from.latitude || !from.longitude || !to.latitude || !to.longitude) {
    console.error('Invalid location data provided:', from, to);  // Log invalid data
    throw new Error('Invalid location data provided.');
  }

  return geolib.getDistance(
    { latitude: from.latitude, longitude: from.longitude },
    { latitude: to.latitude, longitude: to.longitude },
    1  // Optional: Set precision level (1 meter accuracy)
  );
};

// Convert distance from meters to kilometers
exports.convertMetersToKilometers = (meters) => {
  return (meters / 1000).toFixed(2);  // Limit the result to 2 decimal places
};

// Fetch address from coordinates using Google Geocoding API
exports.getAddressFromCoordinates = async (latitude, longitude) => {
  if (!latitude || !longitude) {
    throw new Error('Invalid latitude or longitude.');
  }

  try {
    const response = await axios.get(GEOCODING_API_URL, {
      params: {
        latlng: `${latitude},${longitude}`,
        key: API_KEY,
      },
    });

    if (response.data && response.data.results && response.data.results.length > 0) {
      // Return the first formatted address from the response
      return response.data.results[0].formatted_address;
    } else {
      throw new Error('No address found for the provided coordinates.');
    }
  } catch (error) {
    console.error('Error fetching address from coordinates:', error.message || error);
    throw new Error('Failed to fetch address.');
  }
};
*/