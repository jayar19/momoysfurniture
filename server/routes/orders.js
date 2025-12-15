const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Get db from admin
const db = admin.firestore();

// Create order
router.post('/', verifyToken, async (req, res) => {
  try {
    const { items, totalAmount, downPayment, shippingAddress } = req.body;
    
    const orderData = {
      userId: req.user.uid,
      items,
      totalAmount: parseFloat(totalAmount),
      downPayment: parseFloat(downPayment),
      remainingBalance: parseFloat(totalAmount) - parseFloat(downPayment),
      shippingAddress,
      status: 'pending',
      paymentStatus: 'down_payment_paid',
      deliveryStatus: 'processing',
      currentLocation: null,
      estimatedDelivery: null,
      createdAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('orders').add(orderData);
    res.status(201).json({ id: docRef.id, ...orderData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user orders
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    if (req.user.uid !== req.params.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const snapshot = await db.collection('orders')
      .where('userId', '==', req.params.userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single order
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const doc = await db.collection('orders').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const orderData = doc.data();
    if (orderData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ id: doc.id, ...orderData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all orders (Admin only)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('orders')
      .orderBy('createdAt', 'desc')
      .get();
    
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order (Admin only)
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    await db.collection('orders').doc(req.params.id).update(updateData);
    res.json({ id: req.params.id, ...updateData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update delivery location (Admin only)
router.put('/:id/location', verifyAdmin, async (req, res) => {
  try {
    const { lat, lng, estimatedDelivery } = req.body;
    
    const updateData = {
      currentLocation: { lat: parseFloat(lat), lng: parseFloat(lng) },
      estimatedDelivery,
      deliveryStatus: 'in_transit',
      updatedAt: new Date().toISOString()
    };
    
    await db.collection('orders').doc(req.params.id).update(updateData);
    res.json({ id: req.params.id, ...updateData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;