const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { verifyAdmin } = require('../middleware/auth');

// Get db from admin
const db = admin.firestore();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = db.collection('products');
    
    if (category) {
      query = query.where('category', '==', category);
    }
    
    const snapshot = await query.get();
    const products = [];
    
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('products').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add product (Admin only)
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { name, description, price, category, imageUrl, stock } = req.body;
    
    const productData = {
      name,
      description,
      price: parseFloat(price),
      category,
      imageUrl,
      stock: parseInt(stock),
      createdAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('products').add(productData);
    res.status(201).json({ id: docRef.id, ...productData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product (Admin only)
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const { name, description, price, category, imageUrl, stock } = req.body;
    
    const updateData = {
      name,
      description,
      price: parseFloat(price),
      category,
      imageUrl,
      stock: parseInt(stock),
      updatedAt: new Date().toISOString()
    };
    
    await db.collection('products').doc(req.params.id).update(updateData);
    res.json({ id: req.params.id, ...updateData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product (Admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    await db.collection('products').doc(req.params.id).delete();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;