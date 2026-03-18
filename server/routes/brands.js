const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { verifyAdmin } = require('../middleware/auth');

const db = admin.firestore();

// Get all brands (Public)
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('brands').orderBy('name', 'asc').get();
    const brands = [];

    snapshot.forEach(doc => {
      brands.push({ id: doc.id, ...doc.data() });
    });

    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single brand (Public)
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('brands').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add brand (Admin only)
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { name, description, logoUrl } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Brand name is required' });
    }

    const brandData = {
      name,
      description: description || '',
      logoUrl: logoUrl || '',
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('brands').add(brandData);
    res.status(201).json({ id: docRef.id, ...brandData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update brand (Admin only)
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const { name, description, logoUrl } = req.body;

    const updateData = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(logoUrl !== undefined && { logoUrl }),
      updatedAt: new Date().toISOString()
    };

    await db.collection('brands').doc(req.params.id).update(updateData);
    res.json({ id: req.params.id, ...updateData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete brand (Admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    await db.collection('brands').doc(req.params.id).delete();
    res.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;