/* adminServer.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const adminRoutes = require('./routes/adminroutes'); // Adjust path if necessary

const corsOptions = {
    origin: 'http://localhost:3001', // Allow requests from React app
    optionsSuccessStatus: 200,
};

const app = express();
const port = process.env.ADMIN_PORT || 4000; // Set admin port here

app.use(cors());
app.use(cors(corsOptions));
app.use(express.json());

// Connect to MongoDB if needed
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://roman10132526:sos123456@cluster0.a1aub.mongodb.net/';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully for admin'))
  .catch(err => console.error('MongoDB connection error for admin:', err));

// Use the admin routes
app.use('/api/admin', adminRoutes);

app.listen(port, () => {
  console.log(`Admin server is running on port ${port}`);
});

*/