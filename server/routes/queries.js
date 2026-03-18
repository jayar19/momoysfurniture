const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { verifyAdmin } = require('../middleware/auth');

const db = admin.firestore();

// Get all queries (Admin only)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let query = db.collection('queries').orderBy('createdAt', 'desc');

    if (status) {
      query = db.collection('queries').where('status', '==', status).orderBy('createdAt', 'desc');
    }

    const snapshot = await query.get();
    const queries = [];

    snapshot.forEach(doc => {
      queries.push({ id: doc.id, ...doc.data() });
    });

    res.json(queries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single query (Admin only)
router.get('/:id', verifyAdmin, async (req, res) => {
  try {
    const doc = await db.collection('queries').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Query not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit a query (Public)
router.post('/', async (req, res) => {
  try {
    const { name, email, message, subject } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    const queryData = {
      name,
      email,
      subject: subject || '',
      message,
      status: 'unread',
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('queries').add(queryData);
    res.status(201).json({ id: docRef.id, ...queryData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update query status (Admin only) - e.g. mark as read/resolved
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    const updateData = {
      status,
      updatedAt: new Date().toISOString()
    };

    await db.collection('queries').doc(req.params.id).update(updateData);
    res.json({ id: req.params.id, ...updateData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete query (Admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    await db.collection('queries').doc(req.params.id).delete();
    res.json({ message: 'Query deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;