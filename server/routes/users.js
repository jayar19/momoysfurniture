const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { verifyAdmin } = require('../middleware/auth');

const db = admin.firestore();

// Get all users (Admin only)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      // Exclude sensitive fields
      const { password, ...safeData } = data;
      users.push({ id: doc.id, ...safeData });
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single user (Admin only)
router.get('/:id', verifyAdmin, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...safeData } = doc.data();
    res.json({ id: doc.id, ...safeData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (Admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    await db.collection('users').doc(req.params.id).delete();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;