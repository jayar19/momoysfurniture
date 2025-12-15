const admin = require('firebase-admin');

// Verify Firebase ID token middleware
async function verifyToken(req, res, next) {
  let idToken;
  if (req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      idToken = authHeader.split(' ')[1];
    }
  }

  if (!idToken) {
    console.warn('🚫 No Firebase ID token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Verify admin role middleware
async function verifyAdmin(req, res, next) {
  let idToken;
  if (req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      idToken = authHeader.split(' ')[1];
    }
  }

  if (!idToken) return res.status(401).json({ error: 'No token provided' });

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      console.warn('⛔ Access denied. User is not admin:', decodedToken.email);
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('❌ Admin verification failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { verifyToken, verifyAdmin };
