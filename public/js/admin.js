// Load dashboard statistics
async function loadDashboardStats() {
  try {
    const [productsRes, ordersRes] = await Promise.all([
      authenticatedFetch(`${API_BASE_URL}/products`),
      authenticatedFetch(`${API_BASE_URL}/orders`)
    ]);

    const products = await productsRes.json();
    const orders = await ordersRes.json();

    // Check if response is valid
    if (!Array.isArray(products)) {
      console.error('Products response is not an array:', products);
      return;
    }
    if (!Array.isArray(orders)) {
      console.error('Orders response is not an array:', orders);
      return;
    }

    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;

    document.getElementById('total-products').textContent = products.length;
    document.getElementById('total-orders').textContent = orders.length;
    document.getElementById('total-revenue').textContent = `₱${totalRevenue.toLocaleString()}`;
    document.getElementById('pending-orders').textContent = pendingOrders;

  } catch (error) {
    console.error('Error loading stats:', error);
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

// Load product for editing
async function loadProductForEdit() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  
  if (!productId) {
    alert('No product ID provided');
    window.location.href = '/admin/dashboard.html';
    return;
  }
  
  const form = document.getElementById('edit-product-form');
  const container = form.parentElement;
  
  // Show loading
  const loadingDiv = document.createElement('div');
  loadingDiv.innerHTML = '<div class="spinner"></div>';
  loadingDiv.style.textAlign = 'center';
  loadingDiv.style.padding = '2rem';
  container.insertBefore(loadingDiv, form);
  form.style.display = 'none';
  
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/products/${productId}`);
    
    if (!response.ok) {
      throw new Error('Product not found');
    }
    
    const product = await response.json();
    
    // Fill form
    document.getElementById('name').value = product.name;
    document.getElementById('description').value = product.description;
    document.getElementById('price').value = product.price;
    document.getElementById('category').value = product.category;
    document.getElementById('imageUrl').value = product.imageUrl;
    document.getElementById('stock').value = product.stock;
    
    // Store product ID in form
    form.dataset.productId = productId;
    
    // Show form
    loadingDiv.remove();
    form.style.display = 'block';
    
    // Show preview image if exists
    const imagePreview = document.getElementById('image-preview');
    if (imagePreview && product.imageUrl) {
      imagePreview.src = product.imageUrl;
      imagePreview.style.display = 'block';
    }
    
  } catch (error) {
    console.error('Error loading product:', error);
    alert('Failed to load product: ' + error.message);
    window.location.href = '/admin/dashboard.html';
  }
}

// Edit product form submit
if (document.getElementById('edit-product-form')) {
  // Load product data
  loadProductForEdit();
  
  // Handle form submission
  document.getElementById('edit-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const productId = e.target.dataset.productId;
    if (!productId) {
      alert('Product ID not found');
      return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Updating...';
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
      const response = await authenticatedFetch(`${API_BASE_URL}/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        alert('Product updated successfully!');
        window.location.href = '/admin/dashboard.html';
      } else {
        const error = await response.json();
        alert('Failed to update product: ' + error.error);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product. Please try again.');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
  
  // Image URL preview
  const imageUrlInput = document.getElementById('imageUrl');
  if (imageUrlInput) {
    imageUrlInput.addEventListener('change', (e) => {
      const imagePreview = document.getElementById('image-preview');
      if (imagePreview) {
        imagePreview.src = e.target.value;
        imagePreview.onerror = () => {
          imagePreview.style.display = 'none';
        };
        imagePreview.onload = () => {
          imagePreview.style.display = 'block';
        };
      }
    });
  }
}

// Load orders for admin
const ordersTableBody = document.querySelector('#orders-table tbody');

// Load all orders
async function loadAdminOrders() {
  ordersTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Loading...</td></tr>`;
  
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/orders`);
    if (!response.ok) throw new Error('Failed to fetch orders');

    const orders = await response.json();

    if (orders.length === 0) {
      ordersTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No orders found.</td></tr>`;
      return;
    }

    ordersTableBody.innerHTML = ''; // clear table
    orders.forEach(order => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${order.id}</td>
        <td>${new Date(order.createdAt).toLocaleString()}</td>
        <td>${order.items.map(i => i.name).join(', ')}</td>
        <td>₱${order.total.toFixed(2)}</td>
        <td>${order.status}</td>
        <td>${order.paymentStatus}</td>
        <td>
          <button class="btn btn-primary" onclick="viewOrderDetails('${order.id}')">View</button>
        </td>
      `;
      ordersTableBody.appendChild(tr);
    });

  } catch (error) {
    console.error('Error loading orders:', error);
    ordersTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Error loading orders</td></tr>`;
  }
}

// View single order details
async function viewOrderDetails(orderId) {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/orders/${orderId}`);
    if (!response.ok) throw new Error('Failed to load order');

    const order = await response.json();

    // Example: show order details in a modal
    let details = `
      Order ID: ${order.id}\n
      Date: ${new Date(order.createdAt).toLocaleString()}\n
      Status: ${order.status}\n
      Payment: ${order.paymentStatus}\n
      Items:\n
    `;
    order.items.forEach(item => {
      details += ` - ${item.name} x${item.quantity} (₱${item.price.toFixed(2)})\n`;
    });

    alert(details); // Replace with your modal implementation

  } catch (error) {
    console.error('Error loading order details:', error);
    alert('Error: Could not load order details.');
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
      
      <strong>Status:</strong> ${order.deliveryStatus}<br>
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
      <small style="color: #7f8c8d;">Example: Bacolod City = 10.6763</small>
    </div>
    <div class="form-group">
      <label for="longitude">Longitude:</label>
      <input type="number" id="longitude" step="0.000001" placeholder="e.g., 122.9500" class="form-control" style="width: 100%; padding: 0.75rem; border: 1px solid #bdc3c7; border-radius: 5px;">
      <small style="color: #7f8c8d;">Example: Bacolod City = 122.9500</small>
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