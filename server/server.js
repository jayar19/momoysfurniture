const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin with environment variables or service account file
let firebaseConfig;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production: Use environment variable (JSON string)
  console.log('Using Firebase credentials from environment variable');
  try {
    firebaseConfig = {
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    };
  } catch (error) {
    console.error('Error parsing FIREBASE_SERVICE_ACCOUNT:', error);
    process.exit(1);
  }
} else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  // Production: Use individual environment variables
  console.log('Using Firebase credentials from individual environment variables');
  firebaseConfig = {
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  };
} else {
  // Development: Use service account file
  console.log('Using Firebase credentials from serviceAccountKey.json');
  try {
    const serviceAccount = require('../serviceAccountKey.json');
    firebaseConfig = {
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    };
  } catch (error) {
    console.error('Error loading serviceAccountKey.json:', error);
    console.error('Make sure to set environment variables for production or provide serviceAccountKey.json for development');
    process.exit(1);
  }
}

admin.initializeApp(firebaseConfig);

const db = admin.firestore();
const app = express();

// Generate unique session ID when server starts
const SERVER_SESSION_ID = Date.now().toString();
console.log('Server Session ID:', SERVER_SESSION_ID);

// Middleware - CORS configuration (allow same origin)
app.use(cors({
  origin: true, // Allow requests from same origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(bodyParser.json());

// API Routes (must come before static files)
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');

app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// API Health check with session ID
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    sessionId: SERVER_SESSION_ID,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Test endpoint to check database connection
app.get('/api/test', async (req, res) => {
  try {
    const snapshot = await db.collection('products').limit(1).get();
    res.json({ 
      status: 'Database connected', 
      productsCount: snapshot.size,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Database error', 
      error: error.message 
    });
  }
});

// Serve static files from public directory (AFTER API routes)
// This serves your HTML, CSS, JS files from GitHub
app.use(express.static('public'));

// Serve admin files
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

// Fallback for SPA routing - serve index.html for any non-API routes
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.url.startsWith('/api')) {
    return next();
  }
  
  // Serve index.html for all other routes
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📦 API available at /api`);
  console.log(`🏠 Static files served from /public`);
  console.log(`🔐 Session ID: ${SERVER_SESSION_ID}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Don't export db - routes will get it from admin.firestore()
module.exports = { app };