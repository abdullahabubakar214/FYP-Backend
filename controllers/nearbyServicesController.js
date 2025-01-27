/*
const axios = require('axios');
const geolib = require('geolib');

// Hardcoded Google Maps API Key (for testing only)
const GOOGLE_MAPS_API_KEY = 'AIzaSyDFJEvaACmemBBmfa8RprG8Ojf8YlbEdAs';  // Replace with env variable in production

exports.getNearbyServices = async (req, res) => {
  const { latitude, longitude, emergencyType, rating = 0 } = req.query;

  if (!latitude || !longitude || !emergencyType) {
    return res.status(400).json({ error: 'Missing required parameters: latitude, longitude, emergencyType' });
  }

  try {
    const placeTypes = {
      Medical: ["hospital", "pharmacy", "doctor", "clinic"],
      Fire: ["fire_station", "rescue_1122", "water_supplier"],
      Accident: ["car_repair", "police"],
      Rescue: ["rescue_1122", "fire_station", "emergency_rescue"],
      Violence: ["police", "hospital", "emergency_service"],
      Disaster: ["shelter", "fire_station", "police"],
      Utilities: [
        "electrician",
        "plumber",
        "hardware_store",
        "carpenter",
        "locksmith",
        "roofing_contractor",
        "gas_station",
        "hvac_contractor", // Heating, Ventilation, and Air Conditioning
        "water_purification",
        "solar_energy_service",
      ],
      Food: [
        "restaurant",
        "supermarket",
        "grocery_or_supermarket",
        "bakery",
        "cafe",
        "meal_delivery",
        "meal_takeaway",
        "food_truck",
        "butcher",
        "farmers_market",
      ],
      Shelter: ["hotel", "lodging"],
      Veterinary: ["veterinary_care", "pet_store"],
    };
    
    
    const relevantTypes = placeTypes[emergencyType] || [];
    const nearbyServices = [];

    for (const type of relevantTypes) {
      const googleResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&type=${type}&rankby=distance&key=${GOOGLE_MAPS_API_KEY}`
      );

      const places = googleResponse.data.results;

      for (const place of places) {
        if (place.rating >= rating) {
          const placeDetails = await axios.get(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,opening_hours,rating,review,user_ratings_total,photos,website,types&key=${GOOGLE_MAPS_API_KEY}`
          );

          const details = placeDetails.data.result;

          const distanceInMeters = geolib.getDistance(
            { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
            { latitude: place.geometry.location.lat, longitude: place.geometry.location.lng }
          );

          nearbyServices.push({
            name: place.name,
            address: place.vicinity,
            location: {
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
            },
            type,
            distance: (distanceInMeters / 1000).toFixed(2),
            openNow: details.opening_hours?.open_now || 'N/A',
            contactNumber: details.formatted_phone_number || 'Not Available',
            rating: place.rating || 'N/A',
            reviews: details.reviews || [],
            totalUserRatings: details.user_ratings_total || 'N/A',
            website: details.website || 'N/A',
            photos: details.photos || [],
          });
        }
      }
    }

    return res.json({ nearbyServices });
  } catch (error) {
    console.error('Error fetching nearby services:', error);
    return res.status(500).json({ error: 'Failed to fetch nearby services.' });
  }
};

*/