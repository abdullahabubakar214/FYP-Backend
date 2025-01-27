const { admin } = require('./firebaseAdmin');  // Ensure you're destructuring the admin object

// Middleware to authenticate the user
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Unauthorized');
  }

  const token = authHeader.split(' ')[1]; // Extract the token from "Bearer <token>"

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Attach the decoded token to the request object
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).send('Unauthorized');
  }
};

module.exports = authenticateUser;
