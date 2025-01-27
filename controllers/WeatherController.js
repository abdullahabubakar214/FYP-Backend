const { Expo } = require('expo-server-sdk');
const axios = require('axios');
const expo = new Expo();

const WEATHER_API_KEY = '4f54523d220740f8a21174232243110';

// Your existing sendPushNotification function
async function sendPushNotification(expoPushToken, message, batteryStatus, location, emergencyType, acknowledge = false) {
  const formattedMessage = `${message}\nBattery: ${batteryStatus}%\nLocation: ${location}\nEmergency Type: ${emergencyType}`;
  const messages = [{
    to: expoPushToken,
    sound: 'default',
    body: formattedMessage,
    data: { 
      message: message,
      batteryStatus: batteryStatus,
      location: location,
      emergencyType: emergencyType,
      acknowledge: acknowledge
    },
  }];
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          console.error(`Error sending notification: ${ticket.message}`);
          if (ticket.details && ticket.details.error) {
            console.error(`Error code: ${ticket.details.error}`);
          }
        }
      }
    } catch (error) {
      console.error('Error sending notification chunk:', error);
    }
  }
}

// Function to fetch weather data
async function fetchWeatherData(lat, lon) {
  try {
    const query = `${lat},${lon}`;
    const weatherResponse = await axios.get(
      `http://api.weatherapi.com/v1/forecast.json`,
      {
        params: {
          key: WEATHER_API_KEY,
          q: query,
          days: 5,
          aqi: 'yes',
          alerts: 'yes'
        }
      }
    );
    console.log("Weather API Response:", weatherResponse.data);
    return weatherResponse.data;
  } catch (error) {
    console.error("Error fetching weather data:", error.response?.data || error.message);
    throw new Error("Unable to retrieve weather data.");
  }
}

// Weather update function with notification logic
async function getWeatherUpdates(req, res) {
  const { lat, lon, expoPushToken } = req.query;

  if (!lat || !lon || !expoPushToken) {
    return res.status(400).json({ error: "Latitude, longitude, and Expo push token are required." });
  }

  try {
    const weatherData = await fetchWeatherData(lat, lon);
    const condition = weatherData.current?.condition?.text || 'Clear';
    const isSevere = ["Thunderstorm", "Tornado", "Extreme"].includes(condition);

    if (isSevere) {
      // Trigger push notification for severe weather
      const message = `Severe weather alert: ${condition}. Please take precautions.`;
      await sendPushNotification(
        expoPushToken,
        message,
        batteryStatus = 100, // Example battery status
        `${lat}, ${lon}`, // Or pass a human-readable location
        emergencyType = condition,
        acknowledge = true
      );
    }

    res.json({
      success: true,
      weather: weatherData,
      severeWeatherAlert: isSevere,
      trafficAlert: isSevere ? "Adverse weather conditions may impact traffic in your area." : null
    });
  } catch (error) {
    console.error("Error in getWeatherUpdates:", error.message);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getWeatherUpdates };
