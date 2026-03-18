const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { verifyAdmin } = require('../middleware/auth');

const db = admin.firestore();

// Get all testimonials (Public - only approved ones)
router.get('/', async (req, res) => {
  try {
    const { all } = req.query;

    let query;

    // Admins can pass ?all=true to see all including pending
    if (all === 'true') {
      query = db.collection('testimonials').orderBy('createdAt', 'desc');
    } else {
      query = db.collection('testimonials')
        .where('approved', '==', true)
        .orderBy('createdAt', 'desc');
    }

    const snapshot = await query.get();
    const testimonials = [];

    snapshot.forEach(doc => {
      testimonials.push({ id: doc.id, ...doc.data() });
    });

    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single testimonial (Admin only)
router.get('/:id', verifyAdmin, async (req, res) => {
  try {
    const doc = await db.collection('testimonials').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit a testimonial (Public)
router.post('/', async (req, res) => {
  try {
    const { name, message, rating, userId } = req.body;

    if (!name || !message) {
      return res.status(400).json({ error: 'Name and message are required' });
    }

    const testimonialData = {
      name,
      message,
      rating: rating ? parseInt(rating) : null,
      userId: userId || null,
      approved: false, // Requires admin approval before showing publicly
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('testimonials').add(testimonialData);
    res.status(201).json({ id: docRef.id, ...testimonialData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve / update testimonial (Admin only)
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const { approved, name, message, rating } = req.body;

    const updateData = {
      ...(approved !== undefined && { approved }),
      ...(name && { name }),
      ...(message && { message }),
      ...(rating && { rating: parseInt(rating) }),
      updatedAt: new Date().toISOString()
    };

    await db.collection('testimonials').doc(req.params.id).update(updateData);
    res.json({ id: req.params.id, ...updateData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete testimonial (Admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    await db.collection('testimonials').doc(req.params.id).delete();
    res.json({ message: 'Testimonial deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;