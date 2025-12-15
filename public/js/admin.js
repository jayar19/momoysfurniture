// ===================== CONFIG & UTILS =====================

// admin.js or a separate utils.js
async function authenticatedFetch(url, options = {}) {
  // Wait for user to be available
  const user = await new Promise((resolve, reject) => {
    const currentUser = auth.currentUser;
    if (currentUser) return resolve(currentUser);

    const unsubscribe = auth.onAuthStateChanged(u => {
      unsubscribe();
      if (u) resolve(u);
      else reject(new Error('User not authenticated'));
    });
  });

  const token = await user.getIdToken(); // Firebase ID token

  const fetchOptions = {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // send token
    }
  };

  return fetch(url, fetchOptions);
}


// ===================== MODAL FUNCTIONS =====================
function showModal(title, contentHtml) {
  closeModal(); // Remove existing modal

  const modal = document.createElement('div');
  modal.id = 'admin-modal';
  modal.style.cssText = `
    position: fixed;
    top:0; left:0;
    width:100%; height:100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index:1000;
  `;

  modal.innerHTML = `
    <div style="background: #fff; padding:2rem; border-radius:10px; max-width:600px; width:90%; max-height:80vh; overflow-y:auto; position: relative;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
        <h2 style="margin:0;">${title}</h2>
        <button id="close-modal-btn" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
      </div>
      <div id="modal-content">${contentHtml}</div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
  document.getElementById('close-modal-btn')?.addEventListener('click', closeModal);
}

function closeModal() {
  document.getElementById('admin-modal')?.remove();
}

// ===================== DASHBOARD STATS =====================
async function loadDashboardStats() {
  try {
    const [productsRes, ordersRes] = await Promise.all([
      authenticatedFetch('/products'),
      authenticatedFetch('/orders')
    ]);

    if (!productsRes.ok || !ordersRes.ok) {
      throw new Error(`Failed to fetch data: Products ${productsRes.status}, Orders ${ordersRes.status}`);
    }

    const products = await productsRes.json();
    const orders = await ordersRes.json();

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;

    document.getElementById('total-products') && (document.getElementById('total-products').textContent = products.length);
    document.getElementById('total-orders') && (document.getElementById('total-orders').textContent = orders.length);
    document.getElementById('total-revenue') && (document.getElementById('total-revenue').textContent = `₱${totalRevenue.toLocaleString()}`);
    document.getElementById('pending-orders') && (document.getElementById('pending-orders').textContent = pendingOrders);

  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    const statsContainer = document.querySelector('.admin-stats');
    if (statsContainer) {
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'grid-column:1/-1; background:#fee; padding:1rem; border-radius:5px; color:#e74c3c;';
      errorDiv.innerHTML = `
        <p><strong>⚠️ Failed to load statistics</strong></p>
        <p style="font-size:0.9rem;">${error.message}</p>
        <button class="btn btn-primary" onclick="loadDashboardStats()" style="margin-top:0.5rem; font-size:0.9rem;">🔄 Retry</button>
      `;
      statsContainer.insertBefore(errorDiv, statsContainer.firstChild);
    }
  }
}

// ===================== PRODUCT MANAGEMENT =====================
async function loadAdminProducts() {
  const tbody = document.querySelector('#products-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading products...</td></tr>';

  try {
    const res = await authenticatedFetch('/products');
    const products = await res.json();
    if (products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No products found. <a href="/admin/add-product.html">Add a product</a></td></tr>';
      return;
    }

    tbody.innerHTML = products.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>₱${p.price.toLocaleString()}</td>
        <td>${p.stock}</td>
        <td>
          <button class="btn btn-secondary" onclick="openEditProductModal('${p.id}')" style="margin-right:0.5rem;">Edit</button>
          <button class="btn btn-danger" onclick="deleteProduct('${p.id}', '${p.name}')">Delete</button>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Error loading products:', error);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#e74c3c;">Failed to load products</td></tr>';
  }
}

async function deleteProduct(productId, productName) {
  if (!confirm(`Are you sure you want to delete "${productName}"?`)) return;

  try {
    const res = await authenticatedFetch(`/products/${productId}`, { method: 'DELETE' });
    if (res.ok) {
      alert('Product deleted successfully!');
      loadAdminProducts();
    } else {
      const error = await res.json();
      alert('Failed to delete product: ' + error.error);
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    alert('Failed to delete product');
  }
}

// ===================== PRODUCT EDIT MODAL =====================
async function openEditProductModal(productId) {
  try {
    const response = await authenticatedFetch(`/products/${productId}`);
    if (!response.ok) throw new Error('Failed to load product data');

    const product = await response.json();
    const contentHtml = `
      <form id="edit-product-modal-form">
        <label>Name:</label><input type="text" id="edit-name" value="${product.name}" class="form-control" required>
        <label>Description:</label><textarea id="edit-description" class="form-control" required>${product.description}</textarea>
        <label>Price:</label><input type="number" id="edit-price" value="${product.price}" class="form-control" required>
        <label>Category:</label><input type="text" id="edit-category" value="${product.category}" class="form-control" required>
        <label>Image URL:</label><input type="text" id="edit-imageUrl" value="${product.imageUrl}" class="form-control">
        <label>Stock:</label><input type="number" id="edit-stock" value="${product.stock}" class="form-control" required>
        <button type="submit" class="btn btn-primary" style="margin-top:1rem;">Update Product</button>
      </form>
    `;

    showModal('Edit Product', contentHtml);

    document.getElementById('edit-product-modal-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      await updateProductFromModal(productId);
    });

  } catch (error) {
    console.error('Error opening edit modal:', error);
    alert('Failed to open product edit modal');
  }
}

async function updateProductFromModal(productId) {
  const form = document.getElementById('edit-product-modal-form');
  if (!form) return;

  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  btn.textContent = 'Updating...';
  btn.disabled = true;

  const formData = {
    name: document.getElementById('edit-name').value,
    description: document.getElementById('edit-description').value,
    price: parseFloat(document.getElementById('edit-price').value),
    category: document.getElementById('edit-category').value,
    imageUrl: document.getElementById('edit-imageUrl').value,
    stock: parseInt(document.getElementById('edit-stock').value)
  };

  try {
    const res = await authenticatedFetch(`/products/${productId}`, { method: 'PUT', body: JSON.stringify(formData) });
    if (res.ok) {
      alert('Product updated successfully!');
      closeModal();
      loadAdminProducts();
    } else {
      const error = await res.json();
      alert('Failed to update product: ' + error.error);
      btn.textContent = originalText; btn.disabled = false;
    }
  } catch (error) {
    console.error('Error updating product:', error);
    alert('Failed to update product');
    btn.textContent = originalText; btn.disabled = false;
  }
}

// ===================== ORDER MANAGEMENT =====================
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

async function loadAdminOrders() {
  const tbody = document.querySelector('#orders-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading orders...</td></tr>';

  try {
    const res = await authenticatedFetch('/orders');
    if (!res.ok) throw new Error('Failed to load orders');
    const orders = await res.json();
    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No orders found.</td></tr>';
      return;
    }

    tbody.innerHTML = orders.map(order => {
      const itemsList = order.items.map(i => `${i.productName} (x${i.quantity})`).join(', ');
      const statusColor = getStatusColor(order.deliveryStatus);
      const createdDate = new Date(order.createdAt).toLocaleDateString();
      return `
        <tr>
          <td>#${order.id.substring(0, 8)}</td>
          <td>${createdDate}</td>
          <td style="font-size:0.9rem;">${itemsList}</td>
          <td>₱${order.totalAmount.toLocaleString()}</td>
          <td><span style="background:${statusColor}; padding:0.25rem 0.75rem; border-radius:12px; font-size:0.85rem;">${order.deliveryStatus}</span></td>
          <td>${order.paymentStatus.replace('_',' ')}</td>
          <td>
            <button class="btn btn-secondary" onclick="viewOrderDetails('${order.id}')" style="margin-bottom:0.5rem;font-size:0.85rem;">View</button>
            <button class="btn btn-primary" onclick="openUpdateStatusModal('${order.id}','${order.deliveryStatus}')" style="margin-bottom:0.5rem;font-size:0.85rem;">Update Status</button>
            <button class="btn btn-primary" onclick="openSetLocationModal('${order.id}')" style="font-size:0.85rem;">Set Location</button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading orders:', error);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#e74c3c;">⚠️ Failed to load orders<br>${error.message}</td></tr>`;
  }
}

// ===================== VIEW ORDER DETAILS =====================
async function viewOrderDetails(orderId) {
  try {
    const res = await authenticatedFetch(`/orders/${orderId}`);
    if (!res.ok) throw new Error('Failed to load order');
    const order = await res.json();

    const itemsList = order.items.map(i => `<li>${i.productName} - Qty: ${i.quantity} - ₱${(i.price*i.quantity).toLocaleString()}</li>`).join('');
    const contentHtml = `
      <strong>Order ID:</strong> ${order.id}<br>
      <strong>Created:</strong> ${new Date(order.createdAt).toLocaleString()}<br>
      <strong>Customer ID:</strong> ${order.userId}<br><br>
      <strong>Items:</strong><ul style="margin:0.5rem 0;">${itemsList}</ul>
      <strong>Total Amount:</strong> ₱${order.totalAmount.toLocaleString()}<br>
      <strong>Down Payment:</strong> ₱${order.downPayment.toLocaleString()}<br>
      <strong>Remaining Balance:</strong> ₱${order.remainingBalance.toLocaleString()}<br>
      <strong>Shipping Address:</strong><br>${order.shippingAddress}<br>
      <strong>Status:</strong> ${order.status}<br>
      <strong>Payment Status:</strong> ${order.paymentStatus}<br>
      <strong>Delivery Status:</strong> ${order.deliveryStatus}<br>
      ${order.estimatedDelivery ? `<strong>Estimated Delivery:</strong> ${new Date(order.estimatedDelivery).toLocaleDateString()}<br>` : ''}
      ${order.currentLocation ? `<strong>Current Location:</strong> ${order.currentLocation.lat}, ${order.currentLocation.lng}` : ''}
    `;
    showModal('Order Details', contentHtml);

  } catch (error) {
    console.error('Error viewing order details:', error);
    alert('Failed to load order details');
  }
}

// ===================== UPDATE STATUS =====================
function openUpdateStatusModal(orderId, currentStatus) {
  const contentHtml = `
    <div>
      <label for="new-status">Select New Status:</label>
      <select id="new-status" class="form-control" style="width:100%;padding:0.75rem;border:1px solid #bdc3c7;border-radius:5px;">
        <option value="processing" ${currentStatus==='processing'?'selected':''}>Processing</option>
        <option value="confirmed" ${currentStatus==='confirmed'?'selected':''}>Confirmed</option>
        <option value="in_transit" ${currentStatus==='in_transit'?'selected':''}>In Transit</option>
        <option value="delivered" ${currentStatus==='delivered'?'selected':''}>Delivered</option>
        <option value="cancelled" ${currentStatus==='cancelled'?'selected':''}>Cancelled</option>
      </select>
      <button class="btn btn-primary" style="width:100%;margin-top:1rem;" onclick="updateOrderStatus('${orderId}')">Update Status</button>
    </div>
  `;
  showModal('Update Order Status', contentHtml);
}

async function updateOrderStatus(orderId) {
  const newStatus = document.getElementById('new-status')?.value;
  if (!newStatus) return alert('Please select a status');

  try {
    const res = await authenticatedFetch(`/orders/${orderId}`, { method:'PUT', body:JSON.stringify({ status:newStatus, deliveryStatus:newStatus }) });
    if (res.ok) {
      alert('Order status updated successfully!');
      closeModal(); loadAdminOrders();
    } else {
      const error = await res.json();
      alert('Failed to update status: ' + error.error);
    }
  } catch (error) {
    console.error('Error updating status:', error);
    alert('Failed to update order status');
  }
}

// ===================== SET DELIVERY LOCATION =====================
function openSetLocationModal(orderId) {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now()+7*24*60*60*1000).toISOString().split('T')[0];

  const contentHtml = `
    <label>Latitude:</label><input type="number" id="modal-lat" step="0.000001" class="form-control" placeholder="10.3157" required>
    <label>Longitude:</label><input type="number" id="modal-lng" step="0.000001" class="form-control" placeholder="123.8854" required>
    <label>Estimated Delivery Date:</label><input type="date" id="modal-estimated-delivery" value="${nextWeek}" min="${today}" class="form-control" required>
    <button class="btn btn-primary" style="margin-top:1rem;" id="set-location-btn">Set Location</button>
  `;
  showModal('Set Delivery Location', contentHtml);
  document.getElementById('set-location-btn')?.addEventListener('click', () => setDeliveryLocation(orderId));
}

async function setDeliveryLocation(orderId) {
  const lat = parseFloat(document.getElementById('modal-lat')?.value);
  const lng = parseFloat(document.getElementById('modal-lng')?.value);
  const est = document.getElementById('modal-estimated-delivery')?.value;
  if (!lat || !lng || !est) return alert('Please fill in all fields');

  try {
    const res = await authenticatedFetch(`/orders/${orderId}/location`, { method:'PUT', body:JSON.stringify({ lat,lng,estimatedDelivery:new Date(est).toISOString() }) });
    if (res.ok) { alert('Delivery location updated!'); closeModal(); loadAdminOrders(); }
    else { const error = await res.json(); alert('Failed to update location: ' + error.error); }
  } catch (error) {
    console.error('Error setting location:', error); alert('Failed to update delivery location');
  }
}

// ===================== INITIAL LOAD =====================
if (document.getElementById('total-products')) loadDashboardStats();
if (document.getElementById('products-table')) loadAdminProducts();
if (document.getElementById('orders-table')) loadAdminOrders();
