// Load dashboard statistics
async function loadDashboardStats() {
  console.log('Loading dashboard data...');
  
  try {
    const [productsRes, ordersRes] = await Promise.all([
      authenticatedFetch(`${API_BASE_URL}/products`),
      authenticatedFetch(`${API_BASE_URL}/orders`)
    ]);
    
    console.log('Orders response:', ordersRes.status);
    console.log('Products response:', productsRes.status);
    
    if (!productsRes.ok || !ordersRes.ok) {
      throw new Error(`Failed to fetch data: Products ${productsRes.status}, Orders ${ordersRes.status}`);
    }
    
    const products = await productsRes.json();
    const orders = await ordersRes.json();
    
    console.log('Products loaded:', products.length);
    console.log('Orders loaded:', orders.length);
    
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
    
    // Safely update DOM elements with null checks
    const totalProductsEl = document.getElementById('total-products');
    const totalOrdersEl = document.getElementById('total-orders');
    const totalRevenueEl = document.getElementById('total-revenue');
    const pendingOrdersEl = document.getElementById('pending-orders');
    
    if (totalProductsEl) totalProductsEl.textContent = products.length;
    if (totalOrdersEl) totalOrdersEl.textContent = orders.length;
    if (totalRevenueEl) totalRevenueEl.textContent = `₱${totalRevenue.toLocaleString()}`;
    if (pendingOrdersEl) pendingOrdersEl.textContent = pendingOrders;
    
    console.log('✅ Dashboard stats updated successfully');
  } catch (error) {
    console.error('Error loading stats:', error);
    
    // Show error message in dashboard
    const statsContainer = document.querySelector('.admin-stats');
    if (statsContainer) {
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'grid-column: 1/-1; background: #fee; padding: 1rem; border-radius: 5px; color: #e74c3c;';
      errorDiv.innerHTML = `
        <p><strong>⚠️ Failed to load statistics</strong></p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">${error.message}</p>
        <button class="btn btn-primary" onclick="loadDashboardStats()" style="margin-top: 0.5rem; font-size: 0.9rem;">🔄 Retry</button>
      `;
      statsContainer.insertBefore(errorDiv, statsContainer.firstChild);
    }
  }
}

// Add product form
if (document.getElementById('add-product-form')) {
  document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Adding Product...';
    submitBtn.disabled = true;
    
    const formData = {
      name: document.getElementById('name').value,
      description: document.getElementById('description').value,
      price: parseFloat(document.getElementById('price').value),
      category: document.getElementById('category').value,
      imageUrl: document.getElementById('imageUrl').value,
      stock: parseInt(document.getElementById('stock').value)
    };
    
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        alert('Product added successfully!');
        window.location.href = '/admin/dashboard.html';
      } else {
        const error = await response.json();
        alert('Failed to add product: ' + error.error);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product. Please try again.');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

// Load products for admin
async function loadAdminProducts() {
  const tbody = document.querySelector('#products-table tbody');
  
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading products...</td></tr>';
  
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/products`);
    const products = await response.json();
    
    if (products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No products found. <a href="/admin/add-product.html">Add a product</a></td></tr>';
      return;
    }
    
    tbody.innerHTML = products.map(product => `
      <tr>
        <td>${product.name}</td>
        <td>${product.category}</td>
        <td>₱${product.price.toLocaleString()}</td>
        <td>${product.stock}</td>
        <td>
          <button class="btn btn-secondary" onclick="editProduct('${product.id}')" style="margin-right: 0.5rem;">Edit</button>
          <button class="btn btn-danger" onclick="deleteProduct('${product.id}', '${product.name}')">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading products:', error);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #e74c3c;">Failed to load products</td></tr>';
  }
}

// Edit product
function editProduct(productId) {
  window.location.href = `/admin/edit-product.html?id=${productId}`;
}

// Delete product
async function deleteProduct(productId, productName) {
  if (!confirm(`Are you sure you want to delete "${productName}"?`)) return;
  
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/products/${productId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      alert('Product deleted successfully!');
      loadAdminProducts();
    } else {
      const error = await response.json();
      alert('Failed to delete product: ' + error.error);
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    alert('Failed to delete product');
  }
}

// Load orders for admin
async function loadAdminOrders() {
  const tbody = document.querySelector('#orders-table tbody');
  
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Loading orders...</td></tr>';
  
  try {
    // Wait a bit for auth to be ready
    const user = auth.currentUser;
    if (!user) {
      console.log('No user logged in, waiting...');
      await new Promise(resolve => {
        const unsubscribe = auth.onAuthStateChanged(authUser => {
          if (authUser) {
            unsubscribe();
            resolve();
          }
        });
      });
    }
    
    console.log('Loading admin orders...');
    const response = await authenticatedFetch(`${API_BASE_URL}/orders`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load orders');
    }
    
    const orders = await response.json();
    console.log('Loaded orders:', orders.length);
    
    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No orders found yet.</td></tr>';
      return;
    }
    
    tbody.innerHTML = orders.map(order => {
      const itemsList = order.items.map(item => `${item.productName} (x${item.quantity})`).join(', ');
      const statusColor = getStatusColor(order.deliveryStatus);
      const createdDate = new Date(order.createdAt).toLocaleDateString();
      
      return `
        <tr>
          <td>#${order.id.substring(0, 8)}</td>
          <td>${createdDate}</td>
          <td style="font-size: 0.9rem;">${itemsList}</td>
          <td>₱${order.totalAmount.toLocaleString()}</td>
          <td><span style="background: ${statusColor}; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem;">${order.deliveryStatus}</span></td>
          <td>${order.paymentStatus.replace('_', ' ')}</td>
          <td>
            <button class="btn btn-secondary" onclick="viewOrderDetails('${order.id}')" style="margin-bottom: 0.5rem; font-size: 0.85rem;">View</button>
            <button class="btn btn-primary" onclick="openUpdateStatusModal('${order.id}', '${order.deliveryStatus}')" style="margin-bottom: 0.5rem; font-size: 0.85rem;">Update Status</button>
            <button class="btn btn-primary" onclick="openSetLocationModal('${order.id}')" style="font-size: 0.85rem;">Set Location</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading orders:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem;">
          <p style="color: #e74c3c; margin-bottom: 1rem;">⚠️ Failed to load orders</p>
          <p style="color: #7f8c8d; margin-bottom: 1rem;">${error.message}</p>
          <button class="btn btn-primary" onclick="loadAdminOrders()">🔄 Try Again</button>
        </td>
      </tr>
    `;
  }
}

// Get status color
function getStatusColor(status) {
  const colors = {
    'processing': '#f39c12',
    'confirmed': '#3498db',
    'in_transit': '#9b59b6',
    'delivered': '#27ae60',
    'cancelled': '#e74c3c'
  };
  return colors[status] || '#95a5a6';
}

// View order details
async function viewOrderDetails(orderId) {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/orders/${orderId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load order');
    }
    
    const order = await response.json();
    
    const itemsList = order.items.map(item => 
      `<li>${item.productName} - Qty: ${item.quantity} - ₱${(item.price * item.quantity).toLocaleString()}</li>`
    ).join('');
    
    const details = `
      <strong>Order ID:</strong> ${order.id}<br>
      <strong>Created:</strong> ${new Date(order.createdAt).toLocaleString()}<br>
      <strong>Customer ID:</strong> ${order.userId}<br><br>
      
      <strong>Items:</strong>
      <ul style="margin: 0.5rem 0;">${itemsList}</ul><br>
      
      <strong>Total Amount:</strong> ₱${order.totalAmount.toLocaleString()}<br>
      <strong>Down Payment:</strong> ₱${order.downPayment.toLocaleString()}<br>
      <strong>Remaining Balance:</strong> ₱${order.remainingBalance.toLocaleString()}<br><br>
      
      <strong>Shipping Address:</strong><br>
      ${order.shippingAddress}<br><br>
      
      <strong>Status:</strong> ${order.status}<br>
      <strong>Payment Status:</strong> ${order.paymentStatus}<br>
      <strong>Delivery Status:</strong> ${order.deliveryStatus}<br>
      ${order.estimatedDelivery ? `<strong>Estimated Delivery:</strong> ${new Date(order.estimatedDelivery).toLocaleDateString()}<br>` : ''}
      ${order.currentLocation ? `<strong>Current Location:</strong> ${order.currentLocation.lat}, ${order.currentLocation.lng}` : ''}
    `;
    
    showModal('Order Details', details);
  } catch (error) {
    console.error('Error loading order details:', error);
    alert('Failed to load order details');
  }
}

// Open update status modal
function openUpdateStatusModal(orderId, currentStatus) {
  const content = `
    <div class="form-group">
      <label for="new-status">Select New Status:</label>
      <select id="new-status" class="form-control" style="width: 100%; padding: 0.75rem; border: 1px solid #bdc3c7; border-radius: 5px;">
        <option value="processing" ${currentStatus === 'processing' ? 'selected' : ''}>Processing</option>
        <option value="confirmed" ${currentStatus === 'confirmed' ? 'selected' : ''}>Confirmed</option>
        <option value="in_transit" ${currentStatus === 'in_transit' ? 'selected' : ''}>In Transit</option>
        <option value="delivered" ${currentStatus === 'delivered' ? 'selected' : ''}>Delivered</option>
        <option value="cancelled" ${currentStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
      </select>
    </div>
    <button class="btn btn-primary" onclick="updateOrderStatus('${orderId}')" style="width: 100%; margin-top: 1rem;">Update Status</button>
  `;
  
  showModal('Update Order Status', content);
}

// Update order status
async function updateOrderStatus(orderId) {
  const newStatus = document.getElementById('new-status').value;
  
  if (!newStatus) {
    alert('Please select a status');
    return;
  }
  
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ 
        status: newStatus,
        deliveryStatus: newStatus 
      })
    });
    
    if (response.ok) {
      alert('Order status updated successfully!');
      closeModal();
      loadAdminOrders();
    } else {
      const error = await response.json();
      alert('Failed to update status: ' + error.error);
    }
  } catch (error) {
    console.error('Error updating order:', error);
    alert('Failed to update order status');
  }
}

// Open set location modal
function openSetLocationModal(orderId) {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const content = `
    <div class="form-group">
      <label for="latitude">Latitude:</label>
      <input type="number" id="latitude" step="0.000001" placeholder="e.g., 10.3157" class="form-control" style="width: 100%; padding: 0.75rem; border: 1px solid #bdc3c7; border-radius: 5px;">
      <small style="color: #7f8c8d;">Example: Cebu City = 10.3157</small>
    </div>
    <div class="form-group">
      <label for="longitude">Longitude:</label>
      <input type="number" id="longitude" step="0.000001" placeholder="e.g., 123.8854" class="form-control" style="width: 100%; padding: 0.75rem; border: 1px solid #bdc3c7; border-radius: 5px;">
      <small style="color: #7f8c8d;">Example: Cebu City = 123.8854</small>
    </div>
    <div class="form-group">
      <label for="estimated-delivery">Estimated Delivery Date:</label>
      <input type="date" id="estimated-delivery" value="${nextWeek}" min="${today}" class="form-control" style="width: 100%; padding: 0.75rem; border: 1px solid #bdc3c7; border-radius: 5px;">
    </div>
    <button class="btn btn-primary" onclick="setDeliveryLocation('${orderId}')" style="width: 100%; margin-top: 1rem;">Set Location</button>
  `;
  
  showModal('Set Delivery Location', content);
}

// Set delivery location
async function setDeliveryLocation(orderId) {
  const lat = parseFloat(document.getElementById('latitude').value);
  const lng = parseFloat(document.getElementById('longitude').value);
  const estimatedDelivery = document.getElementById('estimated-delivery').value;
  
  if (!lat || !lng) {
    alert('Please enter both latitude and longitude');
    return;
  }
  
  if (!estimatedDelivery) {
    alert('Please select an estimated delivery date');
    return;
  }
  
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/orders/${orderId}/location`, {
      method: 'PUT',
      body: JSON.stringify({
        lat,
        lng,
        estimatedDelivery: new Date(estimatedDelivery).toISOString()
      })
    });
    
    if (response.ok) {
      alert('Delivery location updated successfully!');
      closeModal();
      loadAdminOrders();
    } else {
      const error = await response.json();
      alert('Failed to update location: ' + error.error);
    }
  } catch (error) {
    console.error('Error updating location:', error);
    alert('Failed to update delivery location');
  }
}

// Modal functions
function showModal(title, content) {
  // Remove existing modal if any
  closeModal();
  
  const modal = document.createElement('div');
  modal.id = 'admin-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
  
  modal.innerHTML = `
    <div style="background: white; padding: 2rem; border-radius: 10px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2 style="margin: 0;">${title}</h2>
        <button onclick="closeModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
      </div>
      <div>${content}</div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

function closeModal() {
  const modal = document.getElementById('admin-modal');
  if (modal) {
    modal.remove();
  }
}

// Initialize based on page
if (document.getElementById('total-products')) {
  loadDashboardStats();
}

if (document.getElementById('products-table')) {
  loadAdminProducts();
}

if (document.getElementById('orders-table')) {
  loadAdminOrders();
}