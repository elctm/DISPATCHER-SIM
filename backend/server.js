// backend/server.js

const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const cors = require('cors');

// --- THIS IS THE ADDED ERROR CHECK ---
// If the API key is missing, the server will stop and give a clear error message.
if (!process.env.GEMINI_API_KEY) {
  console.error("\nFATAL ERROR: GEMINI_API_KEY is not defined.");
  console.error("Please create a file named '.env' in the 'backend' folder and add your key:\n");
  console.error("GEMINI_API_KEY=YOUR_API_KEY_HERE\n");
  process.exit(1); // Stop the server
}
// --- END OF ADDED ERROR CHECK ---

const app = express();
const port = 3001;
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

const emergencyTypes = ["a structural fire", "a vehicle fire", "a multi-car pileup with trapped occupants", "a medical rescue for an elderly person", "a hazardous materials spill"];

app.post('/api/generate-description', async (req, res) => {
  const { lat, lng } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Latitude and longitude are required." });
  }

  try {
    const geoResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const geoData = await geoResponse.json();
    const streetName = geoData.address?.road || geoData.address?.pedestrian || "una ubicación conocida";
    
    const randomEmergency = emergencyTypes[Math.floor(Math.random() * emergencyTypes.length)];
    const prompt = `
      You are simulating a 133 emergency call from a resident in Ñuñoa, Santiago, Chile.
      Write a brief call transcript for ${randomEmergency}.
      The incident is located at or very near the street "${streetName}".
      You MUST incorporate the street name "${streetName}" into the caller's description.
      Use authentic Chilean Spanish slang and mannerisms.
      Output ONLY the caller's description text.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const description = response.text().trim().replace(/"/g, '');
    
    console.log(`Generated description for ${streetName}:`, description);
    res.json({ description: description });

  } catch (error) {
    console.error("Error in AI generation process:", error);
    res.status(500).json({ error: "Failed to generate description" });
  }
});

app.listen(port, () => {
  console.log(`AI Dispatch Server listening on http://localhost:${port}`);
});