// Load dashboard statistics
let activeAdminOrderChatId = null;

async function loadDashboardStats() {
  console.log('Loading dashboard data...');

  try {
    const [productsRes, ordersRes, usersRes, queriesRes, testimonialsRes, brandsRes] = await Promise.all([
      authenticatedFetch(`${API_BASE_URL}/products`),
      authenticatedFetch(`${API_BASE_URL}/orders`),
      authenticatedFetch(`${API_BASE_URL}/users`),
      authenticatedFetch(`${API_BASE_URL}/queries`),
      authenticatedFetch(`${API_BASE_URL}/testimonials`),
      authenticatedFetch(`${API_BASE_URL}/brands`)
    ]);

    // Parse responses (gracefully handle missing endpoints)
    const products      = productsRes.ok      ? await productsRes.json()      : [];
    const orders        = ordersRes.ok         ? await ordersRes.json()        : [];
    const users         = usersRes.ok          ? await usersRes.json()         : [];
    const queries       = queriesRes.ok        ? await queriesRes.json()       : [];
    const testimonials  = testimonialsRes.ok   ? await testimonialsRes.json()  : [];
    const brands        = brandsRes.ok         ? await brandsRes.json()        : [];

    console.log('Products:', products.length);
    console.log('Orders:', orders.length);
    console.log('Users:', users.length);
    console.log('Queries:', queries.length);
    console.log('Testimonials:', testimonials.length);
    console.log('Brands:', brands.length);

    // --- Finance Stats ---
    // Total earned = sum of totalAmount for fully paid / completed orders
    const completedOrders = orders.filter(o =>
      o.deliveryStatus === 'delivered' || o.status === 'completed'
    );
    const totalEarned = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Completed purchases = orders with payment fully settled
    const completedPurchase = orders.filter(o =>
      o.paymentStatus === 'paid' || o.paymentStatus === 'fully_paid'
    ).length;

    // Receivable = sum of remainingBalance for active (non-cancelled) orders
    const receivableAmount = orders
      .filter(o => o.status !== 'cancelled' && o.deliveryStatus !== 'cancelled')
      .reduce((sum, o) => sum + (o.remainingBalance || 0), 0);

    // --- Order Stats ---
    const approvedOrders = orders.filter(o =>
      o.status === 'confirmed' || o.deliveryStatus === 'confirmed'
    ).length;

    const completedOrdersCount = orders.filter(o =>
      o.deliveryStatus === 'delivered' || o.status === 'completed'
    ).length;

    const pendingOrders = orders.filter(o =>
      o.status === 'pending' || o.deliveryStatus === 'processing'
    ).length;

    // --- Inventory Stats ---
    const listedProducts = products.length;
    const listedBrands   = brands.length;

    // --- User & Comms Stats ---
    const registeredUsers   = users.length;
    const totalQueries      = queries.length;
    const totalTestimonials = testimonials.length;

    // --- Update DOM ---
    setEl('total-earned',        `₱${totalEarned.toLocaleString()}`);
    setEl('completed-purchase',  completedPurchase);
    setEl('receivable-amount',   `₱${receivableAmount.toLocaleString()}`);
    setEl('approved-orders',     approvedOrders);
    setEl('completed-orders',    completedOrdersCount);
    setEl('pending-orders',      pendingOrders);
    setEl('listed-products',     listedProducts);
    setEl('listed-brands',       listedBrands);
    setEl('registered-users',    registeredUsers);
    setEl('total-queries',       totalQueries);
    setEl('total-testimonials',  totalTestimonials);

    console.log('✅ Dashboard stats updated successfully');

  } catch (error) {
    console.error('Error loading stats:', error);

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

// Helper: safely set element text content
function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escapeAdminHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getVerificationStatusText(user) {
  if (!user?.verificationIdUrl) return 'ID Required';
  return user.verificationStatus === 'approved' ? 'Approved' : 'Pending Approval';
}

function getVerificationStatusStyle(user) {
  if (!user?.verificationIdUrl) {
    return 'background: #fff1f2; color: #9f1239;';
  }

  if (user.verificationStatus === 'approved') {
    return 'background: #e8f5e9; color: #1f7a3e;';
  }

  return 'background: #fff7e6; color: #9a6700;';
}

async function loadAdminUsers() {
  const tbody = document.querySelector('#users-table tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading users...</td></tr>';

  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/users`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to load users' }));
      throw new Error(error.error || 'Failed to load users');
    }

    const users = await response.json();
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No users found.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map((user) => {
      const imageUrl = user.verificationThumbUrl || user.verificationDisplayUrl || user.verificationIdUrl || '';
      const statusText = getVerificationStatusText(user);
      const canApprove = user.verificationIdUrl && user.verificationStatus !== 'approved';
      const canDeleteVerification = Boolean(user.verificationIdUrl);

      return `
        <tr>
          <td>
            <strong>${escapeAdminHtml(user.fullName || 'No name')}</strong><br>
            <small style="color: #64748b;">${escapeAdminHtml(user.role || 'user')}</small>
          </td>
          <td>${escapeAdminHtml(user.email || '')}</td>
          <td>
            <span style="display: inline-flex; align-items: center; padding: 0.35rem 0.8rem; border-radius: 999px; font-weight: 700; font-size: 0.85rem; ${getVerificationStatusStyle(user)}">${escapeAdminHtml(statusText)}</span>
            <div style="margin-top: 0.5rem; color: #64748b; font-size: 0.85rem;">
              Uploaded: ${user.verificationUploadedAt ? escapeAdminHtml(new Date(user.verificationUploadedAt).toLocaleDateString()) : 'Not yet'}
            </div>
            <div style="margin-top: 0.35rem; color: #64748b; font-size: 0.85rem;">
              Pending-order use: ${user.verificationOrderUsed ? 'Used' : 'Available'}
            </div>
          </td>
          <td>
            ${imageUrl ? `
              <a href="${imageUrl}" target="_blank" rel="noopener">
                <img src="${imageUrl}" alt="User verification ID" style="width: 96px; height: 96px; object-fit: cover; border-radius: 10px; border: 1px solid #dbe4ee;">
              </a>
            ` : '<span style="color: #94a3b8;">No ID uploaded</span>'}
          </td>
          <td>
            ${canApprove ? `<button class="btn btn-primary" onclick="approveUserVerification('${user.id}')" style="margin-bottom: 0.5rem;">Approve ID</button><br>` : ''}
            ${canDeleteVerification ? `<button class="btn btn-danger" onclick="deleteUserVerification('${user.id}')">Delete ID</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading users:', error);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #e74c3c;">${escapeAdminHtml(error.message)}</td></tr>`;
  }
}

async function approveUserVerification(userId) {
  if (!confirm('Approve this user ID so the customer can order normally?')) return;

  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/users/${userId}/verification/approve`, {
      method: 'PUT'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to approve ID' }));
      throw new Error(error.error || 'Failed to approve ID');
    }

    alert('User ID approved successfully.');
    loadAdminUsers();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteUserVerification(userId) {
  if (!confirm('Delete this uploaded ID? The customer will need to upload a new one before ordering again.')) return;

  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/users/${userId}/verification`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete ID' }));
      throw new Error(error.error || 'Failed to delete ID');
    }

    alert('Uploaded ID deleted. The customer must upload a new ID before ordering again.');
    loadAdminUsers();
  } catch (error) {
    alert(error.message);
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
      name:        document.getElementById('name').value,
      description: document.getElementById('description').value,
      price:       parseFloat(document.getElementById('price').value),
      category:    document.getElementById('category').value,
      imageUrl:    document.getElementById('imageUrl').value,
      modelUrl:    document.getElementById('modelUrl')?.value?.trim() || 'models/sofa.glb',
      stock:       parseInt(document.getElementById('stock').value)
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
            <button class="btn btn-secondary" onclick="openAdminOrderChat('${order.id}')" style="margin-bottom: 0.5rem; font-size: 0.85rem;">Open Chat</button>
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
    'processing':  '#f39c12',
    'confirmed':   '#3498db',
    'in_transit':  '#9b59b6',
    'delivered':   '#27ae60',
    'cancelled':   '#e74c3c'
  };
  return colors[status] || '#95a5a6';
}

// View order details
async function viewOrderDetails(orderId) {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/orders/${orderId}`);

    if (!response.ok) throw new Error('Failed to load order');

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
      <strong>Shipping Address:</strong><br>${order.shippingAddress}<br><br>
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
        <option value="processing"  ${currentStatus === 'processing'  ? 'selected' : ''}>Processing</option>
        <option value="confirmed"   ${currentStatus === 'confirmed'   ? 'selected' : ''}>Confirmed</option>
        <option value="in_transit"  ${currentStatus === 'in_transit'  ? 'selected' : ''}>In Transit</option>
        <option value="delivered"   ${currentStatus === 'delivered'   ? 'selected' : ''}>Delivered</option>
        <option value="cancelled"   ${currentStatus === 'cancelled'   ? 'selected' : ''}>Cancelled</option>
      </select>
    </div>
    <button class="btn btn-primary" onclick="updateOrderStatus('${orderId}')" style="width: 100%; margin-top: 1rem;">Update Status</button>
  `;
  showModal('Update Order Status', content);
}

// Update order status
async function updateOrderStatus(orderId) {
  const newStatus = document.getElementById('new-status').value;
  if (!newStatus) { alert('Please select a status'); return; }

  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus, deliveryStatus: newStatus })
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
  const today    = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const content = `
    <div style="margin-bottom:1.25rem;">
      <label style="font-weight:700;display:block;margin-bottom:0.5rem;">Location Input Method</label>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button type="button" onclick="switchLocationTab('coords')"   id="tab-coords"   class="btn btn-primary"     style="flex:1;font-size:0.85rem;">📍 Lat / Lng</button>
        <button type="button" onclick="switchLocationTab('address')"  id="tab-address"  class="btn btn-secondary"  style="flex:1;font-size:0.85rem;">🏠 From Order Address</button>
        <button type="button" onclick="switchLocationTab('custom')"   id="tab-custom"   class="btn btn-secondary"  style="flex:1;font-size:0.85rem;">✏️ Custom Address</button>
      </div>
    </div>

    <!-- Tab: Lat/Lng -->
    <div id="loc-tab-coords">
      <div class="form-group">
        <label for="latitude">Latitude</label>
        <input type="number" id="latitude" step="0.000001" placeholder="e.g. 10.6765" class="form-control">
        <small style="color:#7f8c8d">Right-click any spot on Google Maps → copy the first number</small>
      </div>
      <div class="form-group">
        <label for="longitude">Longitude</label>
        <input type="number" id="longitude" step="0.000001" placeholder="e.g. 122.9509" class="form-control">
        <small style="color:#7f8c8d">The second number from Google Maps</small>
      </div>
    </div>

    <!-- Tab: From order address -->
    <div id="loc-tab-address" style="display:none;">
      <div class="form-group">
        <p style="margin:0 0 0.75rem;color:#444;">This will geocode the customer's delivery address from the order automatically.</p>
        <div id="order-address-preview" style="padding:0.75rem;background:#f8f9fa;border-radius:6px;border:1px solid #dee2e6;color:#495057;font-size:0.9rem;">
          Loading order address...
        </div>
      </div>
      <button type="button" class="btn btn-secondary" style="width:100%;margin-top:0.5rem;" onclick="previewGeocodeAddress('${orderId}')">
        🔍 Preview on Map
      </button>
      <div id="geocode-result" style="margin-top:0.75rem;font-size:0.85rem;color:#2ecc71;display:none;"></div>
    </div>

    <!-- Tab: Custom address -->
    <div id="loc-tab-custom" style="display:none;">
      <div class="form-group">
        <label for="custom-address">Type any address or landmark</label>
        <input type="text" id="custom-address" placeholder="e.g. SM City Bacolod, Bacolod City" class="form-control">
        <small style="color:#7f8c8d">Be as specific as possible for accurate results</small>
      </div>
      <button type="button" class="btn btn-secondary" style="width:100%;margin-top:0.5rem;" onclick="previewGeocodeCustomAddress()">
        🔍 Preview on Map
      </button>
      <div id="custom-geocode-result" style="margin-top:0.75rem;font-size:0.85rem;color:#2ecc71;display:none;"></div>
    </div>

    <!-- Shared: Estimated delivery -->
    <div class="form-group" style="margin-top:1.25rem;">
      <label for="estimated-delivery">Estimated Delivery Date</label>
      <input type="date" id="estimated-delivery" value="${nextWeek}" min="${today}" class="form-control">
    </div>

    <div id="location-modal-error" style="display:none;color:#e74c3c;font-size:0.9rem;margin-top:0.5rem;"></div>

    <button class="btn btn-primary" onclick="setDeliveryLocation('${orderId}')" style="width:100%;margin-top:1rem;">
      📌 Set Delivery Location
    </button>
  `;

  showModal('Set Delivery Location', content);

  // Load the order's shipping address for the "From Order Address" tab
  loadOrderAddressForModal(orderId);
}

function switchLocationTab(tab) {
  ['coords','address','custom'].forEach(t => {
    document.getElementById(`loc-tab-${t}`).style.display  = t === tab ? 'block' : 'none';
    const btn = document.getElementById(`tab-${t}`);
    if (btn) {
      btn.className = t === tab ? 'btn btn-primary' : 'btn btn-secondary';
    }
  });
}

async function loadOrderAddressForModal(orderId) {
  const preview = document.getElementById('order-address-preview');
  if (!preview) return;
  try {
    const res = await authenticatedFetch(`${API_BASE_URL}/orders/${orderId}`);
    const order = await res.json();
    const addr = (order.shippingAddress || '').split('\n')[0].trim();
    preview.textContent = addr || 'No address found on this order.';
    preview.dataset.address = addr;
  } catch {
    preview.textContent = 'Could not load order address.';
  }
}

async function geocodeText(text) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=1`,
    { headers: { 'Accept-Language': 'en' } }
  );
  const data = await res.json();
  if (!data.length) throw new Error(`Could not find coordinates for: "${text}"`);
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
}

async function previewGeocodeAddress(orderId) {
  const preview = document.getElementById('order-address-preview');
  const resultEl = document.getElementById('geocode-result');
  const address = preview?.dataset?.address;

  if (!address) {
    resultEl.style.display = 'block';
    resultEl.style.color = '#e74c3c';
    resultEl.textContent = 'No address available on this order.';
    return;
  }

  resultEl.style.display = 'block';
  resultEl.style.color = '#666';
  resultEl.textContent = 'Searching...';

  try {
    const coords = await geocodeText(address);
    resultEl.style.color = '#27ae60';
    resultEl.textContent = `✓ Found: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
    resultEl.dataset.lat = coords.lat;
    resultEl.dataset.lng = coords.lng;
  } catch (err) {
    resultEl.style.color = '#e74c3c';
    resultEl.textContent = `✗ ${err.message}`;
  }
}

async function previewGeocodeCustomAddress() {
  const input   = document.getElementById('custom-address');
  const resultEl = document.getElementById('custom-geocode-result');
  const address = input?.value?.trim();

  if (!address) {
    resultEl.style.display = 'block';
    resultEl.style.color = '#e74c3c';
    resultEl.textContent = 'Please type an address first.';
    return;
  }

  resultEl.style.display = 'block';
  resultEl.style.color = '#666';
  resultEl.textContent = 'Searching...';

  try {
    const coords = await geocodeText(address);
    resultEl.style.color = '#27ae60';
    resultEl.textContent = `✓ Found: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
    resultEl.dataset.lat = coords.lat;
    resultEl.dataset.lng = coords.lng;
  } catch (err) {
    resultEl.style.color = '#e74c3c';
    resultEl.textContent = `✗ ${err.message}`;
  }
}

// Set delivery location
async function setDeliveryLocation(orderId) {
  const estimatedDelivery = document.getElementById('estimated-delivery')?.value;
  const errorEl = document.getElementById('location-modal-error');
  if (errorEl) errorEl.style.display = 'none';

  if (!estimatedDelivery) {
    if (errorEl) { errorEl.textContent = 'Please select an estimated delivery date.'; errorEl.style.display = 'block'; }
    return;
  }

  // Determine which tab is active
  const coordsVisible  = document.getElementById('loc-tab-coords')?.style.display  !== 'none';
  const addressVisible = document.getElementById('loc-tab-address')?.style.display !== 'none';
  const customVisible  = document.getElementById('loc-tab-custom')?.style.display  !== 'none';

  let lat, lng;

  try {
    if (coordsVisible) {
      lat = parseFloat(document.getElementById('latitude')?.value);
      lng = parseFloat(document.getElementById('longitude')?.value);
      if (isNaN(lat) || isNaN(lng)) throw new Error('Please enter valid latitude and longitude.');

    } else if (addressVisible) {
      const resultEl = document.getElementById('geocode-result');
      if (!resultEl?.dataset?.lat) {
        // Auto-geocode if admin didn't preview first
        const preview = document.getElementById('order-address-preview');
        const address = preview?.dataset?.address;
        if (!address) throw new Error('No order address available to geocode.');
        const coords = await geocodeText(address);
        lat = coords.lat; lng = coords.lng;
      } else {
        lat = parseFloat(resultEl.dataset.lat);
        lng = parseFloat(resultEl.dataset.lng);
      }

    } else if (customVisible) {
      const resultEl = document.getElementById('custom-geocode-result');
      if (!resultEl?.dataset?.lat) {
        // Auto-geocode if admin didn't preview first
        const address = document.getElementById('custom-address')?.value?.trim();
        if (!address) throw new Error('Please enter a custom address.');
        const coords = await geocodeText(address);
        lat = coords.lat; lng = coords.lng;
      } else {
        lat = parseFloat(resultEl.dataset.lat);
        lng = parseFloat(resultEl.dataset.lng);
      }
    }

    const response = await authenticatedFetch(`${API_BASE_URL}/orders/${orderId}/location`, {
      method: 'PUT',
      body: JSON.stringify({ lat, lng, estimatedDelivery: new Date(estimatedDelivery).toISOString() })
    });

    if (response.ok) {
      alert('Delivery location updated successfully!');
      closeModal();
      loadAdminOrders();
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update location.');
    }
  } catch (err) {
    if (errorEl) { errorEl.textContent = err.message; errorEl.style.display = 'block'; }
    else alert(err.message);
  }
}

// Modal functions
function showModal(title, content) {
  closeModal();

  const modal = document.createElement('div');
  modal.id = 'admin-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); display: flex;
    align-items: center; justify-content: center; z-index: 1000;
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
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
}

function closeModal() {
  const modal = document.getElementById('admin-modal');
  if (modal) modal.remove();
}

function escapeAdminChatHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAdminChatTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function renderAdminOrderChatMessages(messages) {
  const thread = document.getElementById('admin-order-chat-thread');
  const currentUser = auth.currentUser;
  if (!thread) return;

  if (!messages.length) {
    thread.innerHTML = '<div class="chat-empty">No messages yet. Send the first order update here.</div>';
    return;
  }

  thread.innerHTML = messages.map((message) => {
    const isOwn = currentUser && message.senderId === currentUser.uid;
    const senderLabel = isOwn ? 'You' : (message.senderRole === 'admin' ? 'Admin' : 'Customer');

    return `
      <div class="chat-message ${isOwn ? 'chat-own' : 'chat-other'}">
        <div class="chat-meta">
          <span>${escapeAdminChatHtml(senderLabel)}</span>
          <span>${escapeAdminChatHtml(formatAdminChatTimestamp(message.createdAt))}</span>
        </div>
        <div class="chat-body">${escapeAdminChatHtml(message.message || '')}</div>
      </div>
    `;
  }).join('');

  thread.scrollTop = thread.scrollHeight;
}

async function loadAdminOrderChat(orderId) {
  const thread = document.getElementById('admin-order-chat-thread');
  if (!thread) return;

  thread.innerHTML = '<div class="chat-empty">Loading messages...</div>';

  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/orders/${orderId}/chat`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to load chat' }));
      throw new Error(error.error || 'Failed to load chat');
    }

    const messages = await response.json();
    renderAdminOrderChatMessages(messages);
  } catch (error) {
    thread.innerHTML = `<div class="chat-empty">${escapeAdminChatHtml(error.message)}</div>`;
  }
}

async function openAdminOrderChat(orderId) {
  activeAdminOrderChatId = orderId;

  const modal = document.getElementById('admin-order-chat-modal');
  const title = document.getElementById('admin-order-chat-title');
  const subtitle = document.getElementById('admin-order-chat-subtitle');
  const input = document.getElementById('admin-order-chat-input');

  if (!modal || !title || !subtitle || !input) return;

  title.textContent = `Order Chat #${orderId.substring(0, 8)}`;
  subtitle.textContent = 'Reply directly to the customer about this specific order.';
  input.value = '';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  await loadAdminOrderChat(orderId);
  input.focus();
}

function closeAdminOrderChat() {
  const modal = document.getElementById('admin-order-chat-modal');
  if (!modal) return;

  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  activeAdminOrderChatId = null;
}

async function submitAdminOrderChatMessage(event) {
  event.preventDefault();
  if (!activeAdminOrderChatId) return;

  const input = document.getElementById('admin-order-chat-input');
  const button = event.target.querySelector('button[type="submit"]');
  const message = input.value.trim();

  if (!message) return;

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Sending...';

  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/orders/${activeAdminOrderChatId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to send message' }));
      throw new Error(error.error || 'Failed to send message');
    }

    input.value = '';
    await loadAdminOrderChat(activeAdminOrderChatId);
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

const adminOrderChatModal = document.getElementById('admin-order-chat-modal');
if (adminOrderChatModal) {
  adminOrderChatModal.addEventListener('click', (event) => {
    if (event.target === adminOrderChatModal) closeAdminOrderChat();
  });
}

const adminOrderChatForm = document.getElementById('admin-order-chat-form');
if (adminOrderChatForm) {
  adminOrderChatForm.addEventListener('submit', submitAdminOrderChatMessage);
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.getElementById('admin-order-chat-modal')?.classList.contains('open')) {
    closeAdminOrderChat();
  }
});

// Initialize based on page
auth.onAuthStateChanged(user => {
  if (!user) {
    console.warn('Admin page: no user logged in');
    return;
  }

  console.log('Admin page: auth ready →', user.email);

  if (document.getElementById('total-earned')) loadDashboardStats();
  if (document.getElementById('products-table')) loadAdminProducts();
  if (document.getElementById('users-table')) loadAdminUsers();
  if (document.getElementById('orders-table')) loadAdminOrders();
});
