let map;
let routeLine;
let marker;
let destinationMarker;

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImEwYjgxYzFiNzMyODQxNmE5YTg5MzYyMWVjYzE3YTNlIiwiaCI6Im11cm11cjY0In0='; // Replace with your ORS key

// Initialize Leaflet map
function initMap() {
  map = L.map('map').setView([10.3157, 123.8854], 12); // Cebu default

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

// Load order tracking
async function loadOrderTracking() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');
  
  if (!orderId) {
    alert('No order ID provided');
    window.location.href = '/orders.html';
    return;
  }

  try {
    const response = await authenticatedFetch(`/orders/${orderId}`);
    const order = await response.json();
    
    if (!response.ok) throw new Error(order.error || 'Failed to fetch order');

    displayOrderInfo(order);

    if (order.currentLocation) {
      updateMapLocation(order.currentLocation, order.shippingAddress, order.startLocation);
    } else {
      document.getElementById('tracking-status').innerHTML = `
        <div class="alert alert-error">
          <p>This order is not yet out for delivery. Status: ${order.deliveryStatus}</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('Error loading order:', err);
    alert('Failed to load order tracking: ' + err.message);
    window.location.href = '/orders.html';
  }
}

// Display order information
function displayOrderInfo(order) {
  const infoDiv = document.getElementById('order-info');
  const itemsList = order.items.map(item => `${item.productName} (x${item.quantity})`).join(', ');
  
  infoDiv.innerHTML = `
    <h2>Order #${order.id.substring(0, 8)}</h2>
    <p><strong>Items:</strong> ${itemsList}</p>
    <p><strong>Shipping Address:</strong> ${order.shippingAddress}</p>
    <p><strong>Status:</strong> ${order.deliveryStatus.replace('_', ' ').toUpperCase()}</p>
    ${order.estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${new Date(order.estimatedDelivery).toLocaleDateString()}</p>` : ''}
  `;
}

// Update map with current location and route
async function updateMapLocation(currentLocation, destinationAddress, startLocation) {
  // Remove existing route and markers
  if (routeLine) map.removeLayer(routeLine);
  if (marker) map.removeLayer(marker);
  if (destinationMarker) map.removeLayer(destinationMarker);

  // Add current location marker
  marker = L.circleMarker([currentLocation.lat, currentLocation.lng], {
    radius: 8,
    color: 'blue',
    fillColor: 'blue',
    fillOpacity: 1
  }).addTo(map);

  // Geocode destination address using ORS geocode API
  const geoRes = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(destinationAddress)}`);
  const geoData = await geoRes.json();
  if (!geoData.features || geoData.features.length === 0) return alert('Cannot find destination location');

  const destinationPos = geoData.features[0].geometry.coordinates; // [lng, lat]

  // Add destination marker
  destinationMarker = L.circleMarker([destinationPos[1], destinationPos[0]], {
    radius: 8,
    color: 'red',
    fillColor: 'red',
    fillOpacity: 1
  }).addTo(map);

  // Draw route using ORS directions
  const routeRes = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: {
      'Authorization': ORS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      coordinates: [
        [startLocation.lng, startLocation.lat],
        [destinationPos[0], destinationPos[1]]
      ]
    })
  });

  const routeData = await routeRes.json();

  // Draw the route on map
  routeLine = L.geoJSON(routeData, {
    style: { color: 'blue', weight: 4 }
  }).addTo(map);

  // Fit map bounds
  const bounds = L.latLngBounds([
    [currentLocation.lat, currentLocation.lng],
    [destinationPos[1], destinationPos[0]]
  ]);
  map.fitBounds(bounds);

  // Update status
  document.getElementById('tracking-status').innerHTML = `
    <div class="alert alert-success">
      <p>📍 Your order is on the way!</p>
      <p>Current Location: ${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}</p>
    </div>
  `;
}

// Initialize map when page loads
if (document.getElementById('map')) {
  initMap();

  // Wait for auth
  auth.onAuthStateChanged((user) => {
    if (user) {
      loadOrderTracking();
    } else {
      window.location.href = '/login.html';
    }
  });
}
