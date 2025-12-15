const admin = require('firebase-admin');
const readline = require('readline');
require('dotenv').config();

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function checkOrders() {
  console.log('\n=== Orders Database Check ===\n');
  
  try {
    // Get all orders
    const ordersSnapshot = await db.collection('orders').get();
    
    console.log(`Total orders in database: ${ordersSnapshot.size}\n`);
    
    if (ordersSnapshot.empty) {
      console.log('❌ No orders found in the database.');
      console.log('\nPossible reasons:');
      console.log('1. No orders have been placed yet');
      console.log('2. Orders are being created in a different collection');
      console.log('3. There was an error during checkout\n');
      process.exit(0);
    }
    
    // Group orders by user
    const ordersByUser = {};
    
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      if (!ordersByUser[order.userId]) {
        ordersByUser[order.userId] = [];
      }
      ordersByUser[order.userId].push({
        id: doc.id,
        ...order
      });
    });
    
    console.log('Orders by User:\n');
    
    for (const [userId, orders] of Object.entries(ordersByUser)) {
      // Get user info
      let userEmail = 'Unknown';
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          userEmail = userDoc.data().email;
        }
      } catch (e) {
        console.log('Could not fetch user email');
      }
      
      console.log(`User: ${userEmail} (${userId})`);
      console.log(`Orders: ${orders.length}\n`);
      
      orders.forEach((order, index) => {
        console.log(`  ${index + 1}. Order #${order.id.substring(0, 8)}`);
        console.log(`     Created: ${new Date(order.createdAt).toLocaleString()}`);
        console.log(`     Status: ${order.deliveryStatus}`);
        console.log(`     Items: ${order.items.length}`);
        console.log(`     Total: ₱${order.totalAmount.toLocaleString()}`);
        console.log(`     Down Payment: ₱${order.downPayment.toLocaleString()}`);
        console.log(`     Remaining: ₱${order.remainingBalance.toLocaleString()}\n`);
      });
    }
    
    console.log('\n✅ Database check complete!\n');
    
  } catch (error) {
    console.error('❌ Error checking orders:', error.message);
  }
  
  process.exit(0);
}

checkOrders();