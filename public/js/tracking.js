let map;
let marker;
let destinationMarker;

// Initialize Google Maps
function initMap() {
  // Default center (Philippines)
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 10.3157, lng: 123.8854 }, // Cebu
    zoom: 12
  });
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
    const response = await authenticatedFetch(`${API_BASE_URL}/orders/${orderId}`);
    const order = await response.json();
    
    if (!response.ok) {
      throw new Error(order.error);
    }
    
    displayOrderInfo(order);
    
    if (order.currentLocation) {
      updateMapLocation(order.currentLocation, order.shippingAddress);
    } else {
      document.getElementById('tracking-status').innerHTML = `
        <div class="alert alert-error">
          <p>This order is not yet out for delivery. Current status: ${order.deliveryStatus}</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading order:', error);
    alert('Failed to load order tracking: ' + error.message);
    window.location.href = '/orders.html';
  }
}

// Display order information
function displayOrderInfo(order) {
  const infoDiv = document.getElementById('order-info');
  const itemsList = order.items.map(item => 
    `${item.productName} (x${item.quantity})`
  ).join(', ');
  
  infoDiv.innerHTML = `
    <h2>Order #${order.id.substring(0, 8)}</h2>
    <p><strong>Items:</strong> ${itemsList}</p>
    <p><strong>Shipping Address:</strong> ${order.shippingAddress}</p>
    <p><strong>Status:</strong> ${order.deliveryStatus.replace('_', ' ').toUpperCase()}</p>
    ${order.estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${new Date(order.estimatedDelivery).toLocaleDateString()}</p>` : ''}
  `;
}

// Update map with current location
function updateMapLocation(currentLocation, destinationAddress) {
  const currentPos = { lat: currentLocation.lat, lng: currentLocation.lng };
  
  // Clear existing markers
  if (marker) marker.setMap(null);
  if (destinationMarker) destinationMarker.setMap(null);
  
  // Add current location marker
  marker = new google.maps.Marker({
    position: currentPos,
    map: map,
    title: 'Current Location',
    icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
  });
  
  // Geocode destination address
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: destinationAddress }, (results, status) => {
    if (status === 'OK') {
      const destinationPos = results[0].geometry.location;
      
      // Add destination marker
      destinationMarker = new google.maps.Marker({
        position: destinationPos,
        map: map,
        title: 'Destination',
        icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
      });
      
      // Draw route
      const directionsService = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true
      });
      
      directionsService.route({
        origin: currentPos,
        destination: destinationPos,
        travelMode: 'DRIVING'
      }, (result, status) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
        }
      });
      
      // Fit bounds to show both markers
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(currentPos);
      bounds.extend(destinationPos);
      map.fitBounds(bounds);
    }
  });
  
  // Center map on current location
  map.setCenter(currentPos);
  
  document.getElementById('tracking-status').innerHTML = `
    <div class="alert alert-success">
      <p>📍 Your order is on the way!</p>
      <p>Current Location: ${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}</p>
    </div>
  `;
}

// Initialize
if (document.getElementById('map')) {
  // Wait for auth state
  auth.onAuthStateChanged((user) => {
    if (user) {
      loadOrderTracking();
    } else {
      window.location.href = '/login.html';
    }
  });
}