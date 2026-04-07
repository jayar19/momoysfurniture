const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Get db from admin
const db = admin.firestore();

async function getUserRole(uid) {
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) return 'customer';
  return userDoc.data().role || 'customer';
}

async function getAccessibleOrder(orderId, uid) {
  const doc = await db.collection('orders').doc(orderId).get();

  if (!doc.exists) {
    return { error: 'Order not found', status: 404 };
  }

  const orderData = doc.data();
  const role = await getUserRole(uid);
  const isAdmin = role === 'admin';

  if (!isAdmin && orderData.userId !== uid) {
    return { error: 'Access denied', status: 403 };
  }

  return { doc, orderData, isAdmin };
}

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
      paymentStatus: 'pending_down_payment',
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
    const result = await getAccessibleOrder(req.params.id, req.user.uid);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    const { doc, orderData } = result;
    res.json({ id: doc.id, ...orderData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order chat messages
router.get('/:id/chat', verifyToken, async (req, res) => {
  try {
    const result = await getAccessibleOrder(req.params.id, req.user.uid);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    const snapshot = await db.collection('orders')
      .doc(req.params.id)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .get();

    const messages = [];
    snapshot.forEach(doc => {
      messages.push({ id: doc.id, ...doc.data() });
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send order chat message
router.post('/:id/chat', verifyToken, async (req, res) => {
  try {
    const result = await getAccessibleOrder(req.params.id, req.user.uid);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    const messageText = (req.body.message || '').trim();
    if (!messageText) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const role = result.isAdmin ? 'admin' : 'customer';
    const messageData = {
      orderId: req.params.id,
      senderId: req.user.uid,
      senderEmail: req.user.email || '',
      senderRole: role,
      message: messageText,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('orders')
      .doc(req.params.id)
      .collection('messages')
      .add(messageData);

    await db.collection('orders').doc(req.params.id).update({
      chatUpdatedAt: messageData.createdAt,
      lastChatMessage: messageText.slice(0, 160),
      lastChatSenderRole: role,
      updatedAt: new Date().toISOString()
    });

    res.status(201).json({ id: docRef.id, ...messageData });
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
