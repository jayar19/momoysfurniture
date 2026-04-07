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
  const today   = new Date().toISOString().split('T')[0];
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
  const lat  = parseFloat(document.getElementById('latitude').value);
  const lng  = parseFloat(document.getElementById('longitude').value);
  const estimatedDelivery = document.getElementById('estimated-delivery').value;

  if (!lat || !lng) { alert('Please enter both latitude and longitude'); return; }
  if (!estimatedDelivery) { alert('Please select an estimated delivery date'); return; }

  try {
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
      alert('Failed to update location: ' + error.error);
    }
  } catch (error) {
    console.error('Error updating location:', error);
    alert('Failed to update delivery location');
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
  if (document.getElementById('orders-table')) loadAdminOrders();
});
