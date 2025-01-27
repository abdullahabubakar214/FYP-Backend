require('dotenv').config(); // Load environment variables
const { VertexAI } = require('@google-cloud/vertexai');
const { Client } = require('@googlemaps/google-maps-services-js');

// Google Cloud project and API details
const PROJECT_ID = "inspiring-lore-443906-b1"; // Replace with your project ID
const MAPS_API_KEY = "AIzaSyDFJEvaACmemBBmfa8RprG8Ojf8YlbEdAs"; // Replace with your Maps API Key

// Initialize Vertex AI and Google Maps clients
const vertexAI = new VertexAI({ project: PROJECT_ID, location: 'us-central1' });
const mapsClient = new Client();

/**
 * Formats the generated response for cleaner display.
 * @param {string} response - The raw response from Vertex AI.
 * @returns {string} - The formatted response.
 */
const formatVertexResponse = (response) => {
    return response
        .replace(/\*/g, '') // Remove italic markdown
        .replace(/^\s+|\s+$/g, '') // Trim leading/trailing whitespace
        .replace(/[\n\r]{2,}/g, '\n') // Normalize excessive line breaks
        .trim();
};

/**
 * Handles emergency responses by generating tips and actions using Vertex AI
 * and fetching nearby services using Google Maps API.
 *
 * @param {Object} req - The HTTP request object (Express.js).
 * @param {Object} res - The HTTP response object (Express.js).
 */
const getEmergencyResponse = async (req, res) => {
    const { emergencyType, latitude, longitude, message } = req.body;

    if (!emergencyType || !latitude || !longitude || !message) {
        return res.status(400).json({
            error: "All fields (emergencyType, latitude, longitude, message) are required.",
        });
    }

    try {
        console.log("Starting emergency response process...");

        // Step 1: Generate Tips and Actions using Vertex AI
        const model = vertexAI.getGenerativeModel({ model: 'gemini-1.5-flash-001' });
        const chat = model.startChat();

        const prompt = `
            Context:
            An emergency situation has been reported. Below are the details:

            - Emergency Type: ${emergencyType}
            - Location: Latitude ${latitude}, Longitude ${longitude}
            - User Message: "${message}"

            Instructions:
            1. Provide clear, actionable steps the user should take immediately in context of Pakistan services.
            2. Share 2-3 essential safety tips tailored to this emergency type.
            3. Respond concisely and in plain text format for quick understanding.

            Please avoid using bold, italics, or unnecessary symbols in your response.
        `;

        console.log("Sending prompt to Vertex AI...");
        const resultStream = await chat.sendMessageStream(prompt);
        let vertexResponse = "";

        for await (const item of resultStream.stream) {
            const content = item?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (content) {
                vertexResponse += content;
            }
        }

        if (!vertexResponse) {
            throw new Error("Vertex AI did not return any content.");
        }

        console.log("Vertex AI response received.");

        // Step 2: Format the Vertex AI response
        const formattedResponse = formatVertexResponse(vertexResponse);

        // Step 3: Fetch Nearby Emergency Services using Google Maps API
        console.log("Fetching nearby emergency services...");
        const nearbyServicesResponse = await mapsClient.placesNearby({
            params: {
                location: `${latitude},${longitude}`,
                radius: 5000, // 5 km radius
                keyword: emergencyType === "medical" ? "hospital" : "emergency services",
                key: MAPS_API_KEY,
            },
        });

        const nearbyServices = (nearbyServicesResponse.data.results || []).slice(0, 3).map((place) => ({
            name: place.name || "Unknown Service",
            address: place.vicinity || "Address unavailable",
            rating: place.rating || "N/A",
        }));

        console.log("Nearby services fetched successfully.");

        // Step 4: Format and Send Response
        const response = {
            emergencyType,
            location: { latitude, longitude },
            message,
            generatedResponse: formattedResponse,
            nearbyServices,
        };

        res.json({ success: true, data: response });
    } catch (error) {
        console.error("Error processing emergency response:", error.message);
        res.status(500).json({ error: "An internal server error occurred." });
    }
};

module.exports = { getEmergencyResponse };
