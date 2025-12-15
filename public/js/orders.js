// Load user orders
async function loadUserOrders() {
  const user = auth.currentUser;

  if (!user) {
    console.log('No user logged in');
    window.location.href = '/login.html';
    return;
  }

  const container = document.getElementById('orders-container');
  container.innerHTML = '<div class="spinner"></div>';

  const url = `/api/orders/user/${user.uid}`;

  console.log('=== Loading Orders Debug ===');
  console.log('User ID:', user.uid);
  console.log('User Email:', user.email);
  console.log('API URL:', url);

  
  try {
    // Get token
    const token = await user.getIdToken();
    console.log('Token obtained:', token ? 'Yes' : 'No');
    
    console.log('API URL:', `/api/orders/user/${user.uid}`);
    console.log('Fetching from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    if (!response.ok) {
      let errorMsg = 'Failed to load orders';
      try {
        const errorData = JSON.parse(responseText);
        errorMsg = errorData.error || errorMsg;
      } catch (e) {
        errorMsg = responseText || errorMsg;
      }
      throw new Error(errorMsg);
    }
    
    const orders = JSON.parse(responseText);
    console.log('Orders received:', orders.length);
    console.log('Orders data:', orders);
    
    displayOrders(orders);
  } catch (error) {
    console.error('=== Error Loading Orders ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <div style="background: #fee; border: 1px solid #fcc; border-radius: 10px; padding: 2rem; max-width: 500px; margin: 0 auto;">
          <p style="font-size: 3rem; margin-bottom: 1rem;">⚠️</p>
          <h3 style="color: #e74c3c; margin-bottom: 1rem;">Failed to Load Orders</h3>
          <p style="color: #7f8c8d; margin-bottom: 1rem;">${error.message}</p>
          <p style="color: #95a5a6; font-size: 0.9rem; margin-bottom: 1rem;">Check browser console (F12) for details</p>
          <button class="btn btn-primary" onclick="loadUserOrders()">🔄 Try Again</button>
          <a href="/products.html" class="btn btn-secondary" style="margin-left: 0.5rem;">Browse Products</a>
        </div>
        <div style="margin-top: 2rem; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto; background: #f8f9fa; padding: 1.5rem; border-radius: 10px;">
          <h4 style="margin-bottom: 1rem;">Debug Info:</h4>
          <ul style="line-height: 2; font-family: monospace; font-size: 0.9rem;">
            <li>User ID: ${user.uid}</li>
            <li>API URL: /api/orders/user/${user.uid}</li>
            <li>Error: ${error.message}</li>
          </ul>
        </div>
      </div>
    `;
  }
}

// Display orders
function displayOrders(orders) {
  const container = document.getElementById('orders-container');
  
  if (!container) return;
  
  if (orders.length === 0) {
    container.innerHTML = `
      <div class="order-empty">
        <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="opacity: 0.3;">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
        <h2 style="color: #7f8c8d; margin: 1rem 0;">No orders yet</h2>
        <p style="color: #95a5a6; margin-bottom: 2rem;">Start shopping to see your orders here!</p>
        <a href="/products.html" class="btn btn-primary">Browse Products</a>
      </div>
    `;
    return;
  }
  
  container.innerHTML = orders.map(order => {
    const statusInfo = getStatusInfo(order.deliveryStatus);
    const itemsList = order.items.map(item => 
      `<div class="order-item">
        <div>
          <span>${item.productName} <small>(x${item.quantity})</small></span>
          ${item.variantName && item.variantName !== 'Standard' ? 
            `<br><small style="color: #3498db;">📦 ${item.variantName}</small>` : 
            ''}
          ${item.remarks ? 
            `<br><small style="color: #7f8c8d;">💬 ${item.remarks}</small>` : 
            ''}
        </div>
        <strong>₱${(item.price * item.quantity).toLocaleString()}</strong>
      </div>`
    ).join('');
    
    const paymentBadgeClass = order.paymentStatus === 'fully_paid' ? 'payment-full' : 'payment-partial';
    const paymentText = order.paymentStatus === 'fully_paid' ? 'Fully Paid' : 'Partial Payment';
    
    return `
      <div class="order-card">
        <div class="order-header">
          <div>
            <h3>Order #${order.id.substring(0, 8)}</h3>
            <p style="color: #7f8c8d; font-size: 0.9rem;">
              ${new Date(order.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <span class="order-status ${statusInfo.class}">${statusInfo.label}</span>
        </div>
        
        ${createTimeline(order.deliveryStatus)}
        
        <div class="order-items-list">
          <strong style="display: block; margin-bottom: 0.5rem;">Items Ordered:</strong>
          ${itemsList}
        </div>
        
        <div style="background: white; padding: 1rem; border-radius: 5px; margin: 1rem 0;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div>
              <p style="color: #7f8c8d; font-size: 0.85rem;">Total Amount</p>
              <p style="font-size: 1.3rem; font-weight: bold; color: #2c3e50;">₱${order.totalAmount.toLocaleString()}</p>
            </div>
            <div>
              <p style="color: #7f8c8d; font-size: 0.85rem;">Down Payment</p>
              <p style="font-size: 1.3rem; font-weight: bold; color: #27ae60;">₱${order.downPayment.toLocaleString()}</p>
            </div>
            <div>
              <p style="color: #7f8c8d; font-size: 0.85rem;">Remaining Balance</p>
              <p style="font-size: 1.3rem; font-weight: bold; color: ${order.remainingBalance > 0 ? '#e67e22' : '#27ae60'};">₱${order.remainingBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #ecf0f1;">
          <div>
            <span class="payment-badge ${paymentBadgeClass}">${paymentText}</span>
            ${order.estimatedDelivery ? `
              <p style="color: #7f8c8d; font-size: 0.85rem; margin-top: 0.5rem;">
                📅 Est. Delivery: ${new Date(order.estimatedDelivery).toLocaleDateString()}
              </p>
            ` : ''}
          </div>
          <div class="order-actions">
            ${order.currentLocation ? `
              <a href="/track-delivery.html?orderId=${order.id}" class="btn btn-primary">📍 Track Delivery</a>
            ` : `
              <button class="btn btn-secondary" disabled style="opacity: 0.6;">Tracking Not Available</button>
            `}
            ${order.remainingBalance > 0 && order.deliveryStatus === 'delivered' ? `
              <button class="btn btn-secondary" onclick="payRemainingBalance('${order.id}', ${order.remainingBalance})">💳 Pay Balance</button>
            ` : ''}
          </div>
        </div>
        
        <details style="margin-top: 1rem;">
          <summary style="cursor: pointer; color: #3498db; font-weight: 600; padding: 0.5rem 0;">View Full Details</summary>
          <div style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 5px;">
            <p><strong>Shipping Address:</strong></p>
            <p style="white-space: pre-line; color: #7f8c8d; margin: 0.5rem 0;">${order.shippingAddress}</p>
            <p style="margin-top: 1rem;"><strong>Order Status:</strong> ${order.status}</p>
            <p><strong>Payment Status:</strong> ${order.paymentStatus.replace('_', ' ')}</p>
          </div>
        </details>
      </div>
    `;
  }).join('');
}

// Get status info
function getStatusInfo(status) {
  const statusMap = {
    'processing': { label: '⏳ Processing', class: 'status-pending' },
    'confirmed': { label: '✓ Confirmed', class: 'status-confirmed' },
    'in_transit': { label: '🚚 In Transit', class: 'status-in-transit' },
    'delivered': { label: '✓ Delivered', class: 'status-delivered' },
    'cancelled': { label: '✗ Cancelled', class: 'status-pending' }
  };
  
  return statusMap[status] || { label: status, class: 'status-pending' };
}

// Create timeline
function createTimeline(currentStatus) {
  const statuses = ['processing', 'confirmed', 'in_transit', 'delivered'];
  const statusLabels = ['Processing', 'Confirmed', 'In Transit', 'Delivered'];
  const currentIndex = statuses.indexOf(currentStatus);
  
  return `
    <div class="order-timeline">
      ${statuses.map((status, index) => {
        let dotClass = '';
        if (index < currentIndex) {
          dotClass = 'active';
        } else if (index === currentIndex) {
          dotClass = 'current';
        }
        
        return `
          <div class="timeline-step">
            <div class="timeline-dot ${dotClass}">${index < currentIndex ? '✓' : index + 1}</div>
            <span class="timeline-label">${statusLabels[index]}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Pay remaining balance
async function payRemainingBalance(orderId, amount) {
  const confirmation = confirm(
    `Confirm Payment\n\n` +
    `Remaining Balance: ₱${amount.toLocaleString()}\n\n` +
    `Are you ready to pay the remaining balance?`
  );
  
  if (!confirmation) return;
  
  try {
    const response = await authenticatedFetch(`/api/payments/remaining-balance`, {
      method: 'POST',
      body: JSON.stringify({
        orderId,
        amount,
        paymentMethod: 'cash'
      })
    });
    
    if (response.ok) {
      alert('✅ Payment successful!\n\nYour order is now fully paid. Thank you for your purchase!');
      loadUserOrders();
      showMessage('Payment completed successfully', 'success');
    } else {
      const error = await response.json();
      alert('❌ Payment failed: ' + error.error);
    }
  } catch (error) {
    console.error('Payment error:', error);
    alert('❌ Payment failed. Please try again or contact support.');
  }
}

// Show message
function showMessage(message, type) {
  const messageDiv = document.getElementById('message');
  if (!messageDiv) return;
  
  messageDiv.className = `alert alert-${type === 'success' ? 'success' : 'error'}`;
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 3000);
}

// Initialize - wait for backend and auth
if (document.getElementById('orders-container')) {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      // Wait for backend to be ready
      if (typeof waitForBackend === 'function') {
        console.log('Waiting for backend before loading orders...');
        await waitForBackend();
      }
      console.log('Loading orders...');
      loadUserOrders();
    } else {
      window.location.href = '/login.html';
    }
  });
}