const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { verifyToken } = require('../middleware/auth');

// Get db from admin
const db = admin.firestore();

// Process down payment
router.post('/down-payment', verifyToken, async (req, res) => {
  try {
    const { orderId, amount, paymentMethod } = req.body;
    
    // Get order
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const paymentData = {
      orderId,
      userId: req.user.uid,
      amount: parseFloat(amount),
      paymentMethod,
      paymentType: 'down_payment',
      status: 'completed',
      createdAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('payments').add(paymentData);
    
    // Update order payment status
    await db.collection('orders').doc(orderId).update({
      paymentStatus: 'down_payment_paid',
      status: 'confirmed'
    });
    
    res.status(201).json({ id: docRef.id, ...paymentData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process remaining balance payment
router.post('/remaining-balance', verifyToken, async (req, res) => {
  try {
    const { orderId, amount, paymentMethod } = req.body;
    
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const paymentData = {
      orderId,
      userId: req.user.uid,
      amount: parseFloat(amount),
      paymentMethod,
      paymentType: 'remaining_balance',
      status: 'completed',
      createdAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('payments').add(paymentData);
    
    // Update order payment status
    await db.collection('orders').doc(orderId).update({
      paymentStatus: 'fully_paid',
      remainingBalance: 0,
      status: 'paid'
    });
    
    res.status(201).json({ id: docRef.id, ...paymentData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user payments
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    if (req.user.uid !== req.params.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const snapshot = await db.collection('payments')
      .where('userId', '==', req.params.userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const payments = [];
    snapshot.forEach(doc => {
      payments.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;