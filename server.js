// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const socketIo = require('socket.io');
const routes = require('./routes/routes'); // Consolidated routes for /api
const adminRoutes = require('./routes/adminroutes'); // Routes for /api/admin
const User = require('./models/userModel'); // Reference the User model
const { syncUserProfile, syncAllUserProfiles } = require('./controllers/userController'); // Import sync functions

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 8080; // Ensure you use the PORT environment variable

const corsOptions = {
  origin: 'http://localhost:3001', // Allow requests from React app
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://roman10132526:sos123456@cluster0.a1aub.mongodb.net/';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if MongoDB connection fails
  });

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Routes
app.use('/api', routes);           // Main app routes under /api
app.use('/api/admin', adminRoutes); // Admin routes under /api/admin

// Health check route for Cloud Run
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// Start syncing Firestore data
const syncInterval = 60000; // 60 seconds

const startFirestoreSync = () => {
  setInterval(async () => {
    const users = await User.find({}); // Fetch users from MongoDB
    users.forEach(async (user) => {
      const updatedUser = await syncUserProfile(user.uid); // Sync each user
      if (updatedUser) {
        console.log(`Successfully synced user: ${user.uid}`);
      }
    });
  }, syncInterval);
};

// Start syncing all profiles on server start
syncAllUserProfiles();  // Sync Firestore profiles to MongoDB when the backend starts

// Start continuous sync every syncInterval
startFirestoreSync();

// Use server.listen instead of app.listen
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
