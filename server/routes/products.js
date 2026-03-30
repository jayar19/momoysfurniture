const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Get db from admin (initialized in server.js)
const db = admin.firestore();

// GET /api/products - Get all or filtered products
router.get('/', async (req, res) => {
  try {
    const category = req.query.category;
    const productsRef = db.collection('products');

    let query = productsRef;
    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      return res.json([]);
    }

    const products = [];
    snapshot.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('products').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({
      id: doc.id,
      ...doc.data()
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products - Create product (admin only)
router.post('/', async (req, res) => {
  try {
    const { name, category, price, description, imageUrl, modelUrl, stock, variants } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newProduct = {
      name,
      category,
      price,
      description: description || '',
      imageUrl: imageUrl || '',
      modelUrl: modelUrl || '',
      stock: stock || 0,
      variants: variants || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('products').add(newProduct);
    
    res.status(201).json({
      id: docRef.id,
      ...newProduct
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id - Update product (admin only)
router.put('/:id', async (req, res) => {
  try {
    const { name, category, price, description, imageUrl, modelUrl, stock, variants } = req.body;

    const updateData = {
      updatedAt: new Date()
    };

    if (name) updateData.name = name;
    if (category) updateData.category = category;
    if (price !== undefined) updateData.price = price;
    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (modelUrl !== undefined) updateData.modelUrl = modelUrl;
    if (stock !== undefined) updateData.stock = stock;
    if (variants) updateData.variants = variants;

    await db.collection('products').doc(req.params.id).update(updateData);

    const updatedDoc = await db.collection('products').doc(req.params.id).get();
    
    res.json({
      id: updatedDoc.id,
      ...updatedDoc.data()
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id - Delete product (admin only)
router.delete('/:id', async (req, res) => {
  try {
    await db.collection('products').doc(req.params.id).delete();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;