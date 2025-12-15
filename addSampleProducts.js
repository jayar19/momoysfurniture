const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Sample products with variants
const sampleProducts = [
  {
    name: "Modern L-Shape Sofa",
    description: "Comfortable and stylish L-shaped sofa perfect for your living room. Features soft fabric upholstery and sturdy wooden frame.",
    price: 35000,
    category: "Living Room",
    imageUrl: "https://via.placeholder.com/400x300/3498db/ffffff?text=Modern+Sofa",
    stock: 5,
    variants: [
      {
        id: "v1",
        name: "Gray Fabric",
        price: 35000,
        stock: 5,
        imageUrl: "https://via.placeholder.com/400x300/95a5a6/ffffff?text=Gray+Sofa"
      },
      {
        id: "v2",
        name: "Navy Blue Fabric",
        price: 37000,
        stock: 3,
        imageUrl: "https://via.placeholder.com/400x300/34495e/ffffff?text=Navy+Sofa"
      },
      {
        id: "v3",
        name: "Beige Leather",
        price: 45000,
        stock: 2,
        imageUrl: "https://via.placeholder.com/400x300/d4c5a9/ffffff?text=Beige+Sofa"
      }
    ],
    createdAt: new Date().toISOString()
  },
  {
    name: "Queen Size Bed Frame",
    description: "Elegant queen size bed frame with headboard. Made from solid wood with a beautiful finish.",
    price: 25000,
    category: "Bedroom",
    imageUrl: "https://via.placeholder.com/400x300/e74c3c/ffffff?text=Queen+Bed",
    stock: 8,
    variants: [
      {
        id: "v1",
        name: "Walnut Wood",
        price: 25000,
        stock: 4,
        imageUrl: "https://via.placeholder.com/400x300/8b4513/ffffff?text=Walnut+Bed"
      },
      {
        id: "v2",
        name: "White Oak",
        price: 28000,
        stock: 3,
        imageUrl: "https://via.placeholder.com/400x300/f5deb3/ffffff?text=Oak+Bed"
      },
      {
        id: "v3",
        name: "Espresso Finish",
        price: 27000,
        stock: 2,
        imageUrl: "https://via.placeholder.com/400x300/3e2723/ffffff?text=Espresso+Bed"
      }
    ],
    createdAt: new Date().toISOString()
  },
  {
    name: "6-Seater Dining Table Set",
    description: "Complete dining set with table and 6 chairs. Perfect for family meals and gatherings.",
    price: 28000,
    category: "Dining Room",
    imageUrl: "https://via.placeholder.com/400x300/27ae60/ffffff?text=Dining+Set",
    stock: 3,
    variants: [
      {
        id: "v1",
        name: "Classic Oak with Cushioned Chairs",
        price: 28000,
        stock: 2,
        imageUrl: "https://via.placeholder.com/400x300/daa520/ffffff?text=Oak+Dining"
      },
      {
        id: "v2",
        name: "Modern Glass Top",
        price: 32000,
        stock: 1,
        imageUrl: "https://via.placeholder.com/400x300/87ceeb/ffffff?text=Glass+Dining"
      }
    ],
    createdAt: new Date().toISOString()
  },
  {
    name: "Executive Office Desk",
    description: "Spacious office desk with multiple drawers. Perfect for home office or corporate use.",
    price: 18000,
    category: "Office",
    imageUrl: "https://via.placeholder.com/400x300/f39c12/ffffff?text=Office+Desk",
    stock: 10,
    variants: [
      {
        id: "v1",
        name: "Standard Size (120cm)",
        price: 18000,
        stock: 5,
        imageUrl: "https://via.placeholder.com/400x300/f39c12/ffffff?text=120cm+Desk"
      },
      {
        id: "v2",
        name: "Large Size (150cm)",
        price: 22000,
        stock: 3,
        imageUrl: "https://via.placeholder.com/400x300/e67e22/ffffff?text=150cm+Desk"
      },
      {
        id: "v3",
        name: "XL Size (180cm) with Hutch",
        price: 28000,
        stock: 2,
        imageUrl: "https://via.placeholder.com/400x300/d35400/ffffff?text=180cm+Desk"
      }
    ],
    createdAt: new Date().toISOString()
  },
  {
    name: "Ergonomic Office Chair",
    description: "Comfortable office chair with lumbar support and adjustable height. Mesh back for breathability.",
    price: 8500,
    category: "Office",
    imageUrl: "https://via.placeholder.com/400x300/9b59b6/ffffff?text=Office+Chair",
    stock: 15,
    variants: [
      {
        id: "v1",
        name: "Black Mesh",
        price: 8500,
        stock: 8,
        imageUrl: "https://via.placeholder.com/400x300/2c3e50/ffffff?text=Black+Chair"
      },
      {
        id: "v2",
        name: "Gray Fabric",
        price: 9000,
        stock: 5,
        imageUrl: "https://via.placeholder.com/400x300/7f8c8d/ffffff?text=Gray+Chair"
      },
      {
        id: "v3",
        name: "Premium Leather",
        price: 12500,
        stock: 2,
        imageUrl: "https://via.placeholder.com/400x300/8b4513/ffffff?text=Leather+Chair"
      }
    ],
    createdAt: new Date().toISOString()
  }
];

async function addProducts() {
  console.log('Adding sample products with variants to Firestore...');
  
  try {
    for (const product of sampleProducts) {
      const docRef = await db.collection('products').add(product);
      console.log(`✓ Added: ${product.name} (ID: ${docRef.id}) with ${product.variants.length} variants`);
    }
    
    console.log('\n✅ Successfully added all sample products with variants!');
    console.log('You can now view them at http://localhost:3000/products.html');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding products:', error);
    process.exit(1);
  }
}

addProducts();