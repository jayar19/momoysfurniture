const admin = require('firebase-admin');

// Middleware to verify Firebase ID token
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.split('Bearer ')[1];

  if (!idToken) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // attach user info to request
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Middleware to allow only admins
async function verifyAdmin(req, res, next) {
  const user = req.user; // already verified by verifyToken

  if (!user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const userDoc = await admin.firestore().collection('users').doc(user.uid).get();

    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    next(); // user is admin
  } catch (error) {
    console.error('Admin check failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { verifyToken, verifyAdmin };
