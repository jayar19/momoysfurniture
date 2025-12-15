// =========================
// Admin.js - MOMOY'S Furniture
// =========================

// Load dashboard statistics
async function loadDashboardStats() {
  try {
    const [productsRes, ordersRes] = await Promise.all([
      authenticatedFetch(`/products`),
      authenticatedFetch(`/orders`)
    ]);

    if (!productsRes.ok || !ordersRes.ok) {
      throw new Error(`Failed to fetch data: Products ${productsRes.status}, Orders ${ordersRes.status}`);
    }

    const products = await productsRes.json();
    const orders = await ordersRes.json();

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const pendingOrders = orders.filter(o => ['pending','confirmed'].includes(o.status)).length;

    document.getElementById('total-products')?.textContent = products.length;
    document.getElementById('total-orders')?.textContent = orders.length;
    document.getElementById('total-revenue')?.textContent = `₱${totalRevenue.toLocaleString()}`;
    document.getElementById('pending-orders')?.textContent = pendingOrders;

  } catch (error) {
    console.error('Error loading stats:', error);
    const statsContainer = document.querySelector('.admin-stats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div style="grid-column:1/-1;background:#fee;padding:1rem;border-radius:5px;color:#e74c3c;">
          <p><strong>⚠️ Failed to load statistics</strong></p>
          <p style="font-size:0.9rem;margin-top:0.5rem;">${error.message}</p>
          <button class="btn btn-primary" onclick="loadDashboardStats()" style="margin-top:0.5rem;font-size:0.9rem;">🔄 Retry</button>
        </div>
      `;
    }
  }
}

// =========================
// Load admin orders
// =========================
async function loadAdminOrders() {
  const tbody = document.querySelector('#orders-table tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Loading orders...</td></tr>`;

  try {
    const response = await authenticatedFetch(`/orders`);
    if (!response.ok) throw new Error('Failed to load orders');
    const orders = await response.json();

    if (!orders.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No orders found.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(order => {
      const itemsList = order.items.map(i => `${i.productName} (x${i.quantity})`).join(', ');
      const statusColor = getStatusColor(order.deliveryStatus);
      const createdDate = new Date(order.createdAt).toLocaleDateString();

      return `
        <tr>
          <td>#${order.id.substring(0,8)}</td>
          <td>${createdDate}</td>
          <td style="font-size:0.9rem;">${itemsList}</td>
          <td>₱${order.totalAmount.toLocaleString()}</td>
          <td><span style="background:${statusColor};padding:0.25rem 0.75rem;border-radius:12px;font-size:0.85rem;">${order.deliveryStatus}</span></td>
          <td>${order.paymentStatus.replace('_',' ')}</td>
          <td>
            <button class="btn btn-secondary" onclick="viewOrderDetails('${order.id}')" style="margin-bottom:0.5rem;font-size:0.85rem;">View</button>
            <button class="btn btn-primary" onclick="openUpdateStatusModal('${order.id}','${order.deliveryStatus}')" style="margin-bottom:0.5rem;font-size:0.85rem;">Update Status</button>
            <button class="btn btn-primary" onclick="openSetLocationMap('${order.id}','${order.shippingAddress}')" style="font-size:0.85rem;">Set Location</button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading orders:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:2rem;color:#e74c3c;">
          ⚠️ Failed to load orders<br>
          <button class="btn btn-primary" onclick="loadAdminOrders()">🔄 Try Again</button>
        </td>
      </tr>
    `;
  }
}

// =========================
// Get status color
// =========================
function getStatusColor(status) {
  const colors = {
    'processing':'#f39c12',
    'confirmed':'#3498db',
    'in_transit':'#9b59b6',
    'delivered':'#27ae60',
    'cancelled':'#e74c3c'
  };
  return colors[status] || '#95a5a6';
}

// =========================
// View order details
// =========================
async function viewOrderDetails(orderId) {
  try {
    const response = await authenticatedFetch(`/orders/${orderId}`);
    if (!response.ok) throw new Error('Failed to load order');
    const order = await response.json();

    const itemsList = order.items.map(i => `<li>${i.productName} - Qty:${i.quantity} - ₱${(i.price*i.quantity).toLocaleString()}</li>`).join('');

    showModal('Order Details', `
      <strong>Order ID:</strong> ${order.id}<br>
      <strong>Created:</strong> ${new Date(order.createdAt).toLocaleString()}<br>
      <strong>Shipping:</strong> ${order.shippingAddress}<br>
      <strong>Status:</strong> ${order.status}<br>
      <strong>Delivery Status:</strong> ${order.deliveryStatus}<br>
      <ul>${itemsList}</ul>
      <strong>Total:</strong> ₱${order.totalAmount.toLocaleString()}
      ${order.currentLocation ? `<br><strong>Current Location:</strong> ${order.currentLocation.lat}, ${order.currentLocation.lng}` : ''}
    `);
  } catch (error) {
    console.error(error);
    alert('Failed to load order details');
  }
}

// =========================
// Update order status modal
// =========================
function openUpdateStatusModal(orderId,currentStatus){
  const content = `
    <div class="form-group">
      <label for="new-status">Select New Status:</label>
      <select id="new-status" class="form-control">
        <option value="processing" ${currentStatus==='processing'?'selected':''}>Processing</option>
        <option value="confirmed" ${currentStatus==='confirmed'?'selected':''}>Confirmed</option>
        <option value="in_transit" ${currentStatus==='in_transit'?'selected':''}>In Transit</option>
        <option value="delivered" ${currentStatus==='delivered'?'selected':''}>Delivered</option>
        <option value="cancelled" ${currentStatus==='cancelled'?'selected':''}>Cancelled</option>
      </select>
    </div>
    <button class="btn btn-primary" onclick="updateOrderStatus('${orderId}')" style="width:100%;margin-top:1rem;">Update Status</button>
  `;
  showModal('Update Order Status',content);
}

async function updateOrderStatus(orderId){
  const newStatus = document.getElementById('new-status').value;
  if(!newStatus) return alert('Please select a status');

  try {
    const res = await authenticatedFetch(`/orders/${orderId}`,{
      method:'PUT',
      body: JSON.stringify({status:newStatus,deliveryStatus:newStatus})
    });
    if(res.ok){
      alert('Order status updated!');
      closeModal();
      loadAdminOrders();
    }else{
      const err = await res.json();
      alert('Failed to update status: '+err.error);
    }
  } catch(e){
    console.error(e);
    alert('Failed to update status');
  }
}

// =========================
// Set delivery location using Leaflet
// =========================
function openSetLocationMap(orderId,shippingAddress){
  const content = `<div id="set-location-map" class="leaflet-container"></div>
    <button class="btn btn-primary" onclick="saveMapLocation('${orderId}')" style="margin-top:1rem;width:100%;">Save Location</button>
  `;
  showModal('Set Delivery Location',content);

  // Initialize Leaflet map
  setTimeout(async () => {
    const mapDiv = document.getElementById('set-location-map');
    if(!mapDiv) return;

    // Geocode shipping address via ORS or external geocoder
    let destLatLng = [10.3157,123.8854]; // default Cebu
    try {
      const geoRes = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=YOUR_ORS_API_KEY&text=${encodeURIComponent(shippingAddress)}`);
      const geoData = await geoRes.json();
      if(geoData.features?.length){
        destLatLng = [geoData.features[0].geometry.coordinates[1],geoData.features[0].geometry.coordinates[0]];
      }
    } catch(e){
      console.warn('Geocode failed',e);
    }

    const map = L.map(mapDiv).setView(destLatLng,12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors'}).addTo(map);

    // Marker for current location
    let currentMarker = L.marker(destLatLng,{draggable:true}).addTo(map);

    // Click map to move marker
    map.on('click',e=>{
      currentMarker.setLatLng(e.latlng);
    });

    // Store map in div for later access
    mapDiv._leafletMap = map;
    mapDiv._marker = currentMarker;
  },300);
}

async function saveMapLocation(orderId){
  const mapDiv = document.getElementById('set-location-map');
  if(!mapDiv) return alert('Map not ready');

  const latlng = mapDiv._marker.getLatLng();
  if(!latlng) return alert('Please select a location');

  try {
    const response = await authenticatedFetch(`/orders/${orderId}/location`,{
      method:'PUT',
      body: JSON.stringify({lat:latlng.lat,lng:latlng.lng})
    });
    if(response.ok){
      alert('Delivery location saved!');
      closeModal();
      loadAdminOrders();
    }else{
      const err = await response.json();
      alert('Failed to save location: '+err.error);
    }
  } catch(e){
    console.error(e);
    alert('Failed to save location');
  }
}

// =========================
// Generic modal functions
// =========================
function showModal(title,content){
  closeModal();
  const modal=document.createElement('div');
  modal.id='admin-modal';
  modal.style=`position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;`;
  modal.innerHTML=`
    <div style="background:white;padding:2rem;border-radius:10px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
        <h2 style="margin:0;">${title}</h2>
        <button onclick="closeModal()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;">&times;</button>
      </div>
      <div>${content}</div>
    </div>
  `;
  modal.addEventListener('click',e=>{if(e.target===modal) closeModal();});
  document.body.appendChild(modal);
}

function closeModal(){document.getElementById('admin-modal')?.remove();}

// =========================
// Initialize on page
// =========================
document.getElementById('total-products') && loadDashboardStats();
document.getElementById('products-table') && loadAdminProducts?.();
document.getElementById('orders-table') && loadAdminOrders?.();
