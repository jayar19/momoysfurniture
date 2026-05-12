// ─── Config ───────────────────────────────────────────────────────────────────
// Set your shop's coordinates here
const SHOP_LOCATION = { lat: 9.349986590670413, lng: 123.28569645572355, label: "Momoy's Furniture" };

// ─── State ────────────────────────────────────────────────────────────────────
let map = null;
let routeLine = null;
let driverMarker = null;
let shopMarker = null;
let destMarker = null;
let unsubscribeFirestore = null; // real-time listener cleanup

// ─── Icons ────────────────────────────────────────────────────────────────────
function makeIcon(emoji, size = 36) {
  return L.divIcon({
    className: '',
    html: `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">${emoji}</div>`,
    iconAnchor: [size / 2, size / 2]
  });
}

// ─── Map Init ─────────────────────────────────────────────────────────────────
function initMap() {
  map = L.map('map').setView([SHOP_LOCATION.lat, SHOP_LOCATION.lng], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Always show shop marker
  shopMarker = L.marker([SHOP_LOCATION.lat, SHOP_LOCATION.lng], { icon: makeIcon('🏪') })
    .addTo(map)
    .bindPopup(SHOP_LOCATION.label);
}

// ─── Geocode address → {lat, lng} using Nominatim (free, no key) ──────────────
async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await res.json();
  if (!data.length) throw new Error('Could not find delivery address on map.');
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

// ─── Draw route shop → destination using OSRM (free, no key) ─────────────────
async function drawRoute(from, to) {
  if (routeLine) { map.removeLayer(routeLine); routeLine = null; }

  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.code !== 'Ok' || !data.routes.length) {
    // Fallback: straight line
    routeLine = L.polyline([[from.lat, from.lng], [to.lat, to.lng]], {
      color: '#2563eb', weight: 3, dashArray: '6 6'
    }).addTo(map);
    return;
  }

  routeLine = L.geoJSON(data.routes[0].geometry, {
    style: { color: '#2563eb', weight: 4, opacity: 0.8 }
  }).addTo(map);

  // Fit map to show full route
  map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
}

// ─── Update driver marker position ───────────────────────────────────────────
function updateDriverMarker(loc) {
  if (!loc?.lat || !loc?.lng) return;
  if (driverMarker) {
    driverMarker.setLatLng([loc.lat, loc.lng]);
  } else {
    driverMarker = L.marker([loc.lat, loc.lng], { icon: makeIcon('🚚') })
      .addTo(map)
      .bindPopup('Driver current location');
  }
}

// ─── Render order info panel ──────────────────────────────────────────────────
function renderOrderInfo(order) {
  const itemsList = (order.items || [])
    .map(i => `${i.productName} <span style="color:#666">(×${i.quantity})</span>`)
    .join(', ');

  const statusColors = {
    pending: '#f59e0b',
    confirmed: '#3b82f6',
    out_for_delivery: '#10b981',
    delivered: '#6366f1',
    cancelled: '#ef4444'
  };

  const statusLabel = (order.deliveryStatus || order.status || 'pending')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  const statusColor = statusColors[order.deliveryStatus || order.status] || '#6b7280';

  document.getElementById('order-info').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem">
      <div>
        <h2 style="margin:0 0 0.5rem;font-size:1.1rem">Order #${(order.id || '').substring(0, 8).toUpperCase()}</h2>
        <p style="margin:0 0 0.25rem;color:#444"><strong>Items:</strong> ${itemsList}</p>
        <p style="margin:0 0 0.25rem;color:#444"><strong>Delivery to:</strong> ${order.shippingAddress || 'N/A'}</p>
        ${order.estimatedDelivery
          ? `<p style="margin:0;color:#444"><strong>Est. Delivery:</strong> ${new Date(order.estimatedDelivery).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>`
          : ''}
      </div>
      <span style="
        display:inline-block;
        padding:0.35rem 0.85rem;
        border-radius:999px;
        background:${statusColor}22;
        color:${statusColor};
        font-weight:700;
        font-size:0.85rem;
        border:1px solid ${statusColor}44;
        white-space:nowrap;
      ">${statusLabel}</span>
    </div>
  `;
}

// ─── Render tracking status banner ────────────────────────────────────────────
function renderTrackingStatus(order) {
  const statusEl = document.getElementById('tracking-status');
  const status = order.deliveryStatus || order.status || '';

  if (status === 'out_for_delivery') {
    const updatedAt = order.currentLocation?.updatedAt
      ? new Date(order.currentLocation.updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : null;

    statusEl.innerHTML = `
      <div class="alert alert-success">
        🚚 <strong>Your order is on the way!</strong>
        ${updatedAt ? `<span style="margin-left:0.5rem;opacity:0.8;font-size:0.9rem">Location updated at ${updatedAt}</span>` : ''}
      </div>
    `;
  } else if (status === 'delivered') {
    statusEl.innerHTML = `<div class="alert alert-success">✅ <strong>Your order has been delivered!</strong></div>`;
  } else {
    statusEl.innerHTML = `
      <div class="alert alert-error">
        📦 Order is not yet out for delivery. Current status: <strong>${(status || 'pending').replace(/_/g, ' ')}</strong>
      </div>
    `;
  }
}

// ─── Main: render map for a given order snapshot ──────────────────────────────
// Cache geocoded destination so we don't re-geocode on every Firestore update
let cachedDestCoords = null;
let cachedAddress = null;

async function renderOrderOnMap(order) {
  renderOrderInfo(order);
  renderTrackingStatus(order);

  const status = order.deliveryStatus || order.status || '';
  if (status !== 'out_for_delivery' && status !== 'delivered') return;

  // Geocode destination only if address changed
  const address = order.shippingAddress;
  if (!address) return;

  try {
    if (address !== cachedAddress || !cachedDestCoords) {
      cachedDestCoords = await geocodeAddress(address);
      cachedAddress = address;

      // Place destination marker once
      if (destMarker) map.removeLayer(destMarker);
      destMarker = L.marker([cachedDestCoords.lat, cachedDestCoords.lng], { icon: makeIcon('🏠') })
        .addTo(map)
        .bindPopup('Delivery Address');

      // Draw shop → destination route
      await drawRoute(SHOP_LOCATION, cachedDestCoords);
    }

    // Update driver marker if admin set a currentLocation
    if (order.currentLocation?.lat && order.currentLocation?.lng) {
      updateDriverMarker(order.currentLocation);
    }

  } catch (err) {
    console.error('Map error:', err);
    document.getElementById('tracking-status').innerHTML = `
      <div class="alert alert-error">⚠️ ${err.message}</div>
    `;
  }
}

// ─── Load order + start real-time listener ────────────────────────────────────
async function loadOrderTracking() {
  const orderId = new URLSearchParams(window.location.search).get('orderId');

  if (!orderId) {
    alert('No order ID provided.');
    window.location.href = '/orders.html';
    return;
  }

  // Clean up any previous listener
  if (unsubscribeFirestore) unsubscribeFirestore();

  // Real-time Firestore listener — updates map automatically when admin changes order
  unsubscribeFirestore = db.collection('orders').doc(orderId)
    .onSnapshot(async (snap) => {
      if (!snap.exists) {
        document.getElementById('tracking-status').innerHTML = `
          <div class="alert alert-error">Order not found.</div>
        `;
        return;
      }
      const order = { id: snap.id, ...snap.data() };
      await renderOrderOnMap(order);
    }, (err) => {
      console.error('Firestore listener error:', err);
      document.getElementById('tracking-status').innerHTML = `
        <div class="alert alert-error">Failed to load tracking: ${err.message}</div>
      `;
    });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
if (document.getElementById('map')) {
  initMap();

  auth.onAuthStateChanged((user) => {
    if (user) {
      loadOrderTracking();
    } else {
      window.location.href = '/login.html';
    }
  });

  // Cleanup listener when user leaves the page
  window.addEventListener('beforeunload', () => {
    if (unsubscribeFirestore) unsubscribeFirestore();
  });
}