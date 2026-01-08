// Load products
async function loadProducts(category = null) {
  const container = document.getElementById('products-container');
  if (!container) return;
  
  // Show loading state
  container.innerHTML = '<div class="spinner"></div>';
  
  try {
    let url = `/api/products`;
if (category) {
  url += `?category=${encodeURIComponent(category)}`;
}
    
    console.log('Fetching products from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      // Add timeout
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const products = await response.json();
    console.log('Products loaded:', products.length);
    
    displayProducts(products);
  } catch (error) {
    console.error('Error loading products:', error);
    
    let errorMessage = error.message;
    let troubleshooting = '';
    
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      errorMessage = 'Request timed out';
      troubleshooting = 'The server might be starting up. Please wait 30 seconds and refresh the page.';
    } else if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Cannot connect to server';
      troubleshooting = 'The backend server might be down or starting up. Check that the server is running.';
    }
    
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
        <div style="background: #fee; border: 1px solid #fcc; border-radius: 10px; padding: 2rem; max-width: 600px; margin: 0 auto;">
          <p style="font-size: 3rem; margin-bottom: 1rem;">⚠️</p>
          <h3 style="color: #e74c3c; margin-bottom: 1rem;">Failed to Load Products</h3>
          <p style="color: #7f8c8d; margin-bottom: 1rem;">${errorMessage}</p>
          ${troubleshooting ? `<p style="color: #7f8c8d; margin-bottom: 1rem; font-size: 0.9rem;">${troubleshooting}</p>` : ''}
          <button class="btn btn-primary" onclick="loadProducts()" style="margin-top: 1rem;">🔄 Try Again</button>
        </div>
        <div style="margin-top: 2rem; background: #f8f9fa; padding: 1.5rem; border-radius: 10px; max-width: 600px; margin: 2rem auto 0;">
          <h4 style="margin-bottom: 1rem;">Debug Information:</h4>
          <div style="text-align: left; font-family: monospace; font-size: 0.85rem;">
            <p><strong>API URL:</strong> /api/products</p>
            <p><strong>Error:</strong> ${error.message}</p>
            <p><strong>Error Type:</strong> ${error.name}</p>
          </div>
          <p style="margin-top: 1rem; font-size: 0.9rem; color: #7f8c8d;">Open browser console (F12) for more details</p>
        </div>
      </div>
    `;
  }
}

// Display products
function displayProducts(products) {
  const container = document.getElementById('products-container');
  
  if (!container) return;
  
  if (products.length === 0) {
    container.innerHTML = '<p>No products found.</p>';
    return;
  }
  
  container.innerHTML = products.map(product => `
    <div class="product-card">
      <img src="${product.imageUrl}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x250?text=No+Image'">
      <div class="product-info">
        <h3 class="product-title">${product.name}</h3>
        <p class="product-category">${product.category}</p>
        <p class="product-price">From ₱${product.price.toLocaleString()}</p>
        <p style="font-size: 0.9rem; color: #7f8c8d; margin-bottom: 0.5rem;">${product.description.substring(0, 80)}...</p>
        ${product.variants && product.variants.length > 0 ? 
          `<p style="font-size: 0.85rem; color: #3498db; margin-bottom: 1rem;">✓ ${product.variants.length} variants available</p>` : 
          ''}
        <div class="product-actions">
          <button class="btn btn-primary" onclick='viewProductDetails(${JSON.stringify(product).replace(/'/g, "&apos;")})' style="width: 100%;">
            View Details
          </button>
        </div>
      </div>
    </div>
  `).join('');
  document.querySelectorAll('.view-details-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const product = JSON.parse(btn.dataset.product);
    viewProductDetails(product);
  });
});
}

// View product details
function viewProductDetails(product) {
  // Remove existing modal if any
  closeProductModal();

  const modal = document.createElement('div');
  modal.id = 'product-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    overflow-y: auto;
    padding: 2rem 1rem;
  `;

  const hasVariants = product.variants && product.variants.length > 0;
  const defaultVariant = hasVariants ? product.variants[0] : null;

  // Build modal inner HTML
  modal.innerHTML = `
    <div style="background: white; border-radius: 15px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
      <div style="position: sticky; top: 0; background: white; z-index: 10; padding: 1.5rem; border-bottom: 1px solid #ecf0f1; display: flex; justify-content: space-between; align-items: center; border-radius: 15px 15px 0 0;">
        <h2 style="margin: 0;">${product.name}</h2>
        <button id="close-product-modal" style="background: none; border: none; font-size: 2rem; cursor: pointer; color: #7f8c8d;">&times;</button>
      </div>
      
      <div style="padding: 2rem;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
          <div>
            <img id="product-main-image" src="${hasVariants ? defaultVariant.imageUrl : product.imageUrl}" 
                 style="width: 100%; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);" 
                 onerror="this.src='https://via.placeholder.com/400x400?text=No+Image'">
            <p style="color: #7f8c8d; font-size: 0.85rem; margin-top: 0.5rem; text-align: center;">Click variant to see image</p>
          </div>

          <div>
            <p style="color: #7f8c8d; margin-bottom: 1rem;">${product.description}</p>
            <p style="font-size: 0.9rem; color: #95a5a6; margin-bottom: 0.5rem;">Category: ${product.category}</p>
            <div style="display: flex; align-items: baseline; gap: 1rem; margin-bottom: 1.5rem;">
              <span style="font-size: 2rem; font-weight: bold; color: #e67e22;" id="selected-price">₱${hasVariants ? defaultVariant.price.toLocaleString() : product.price.toLocaleString()}</span>
              <span style="color: #27ae60; font-size: 0.9rem;" id="stock-status">${hasVariants ? defaultVariant.stock : product.stock} in stock</span>
            </div>

            ${hasVariants ? `
              <div style="margin-bottom: 1.5rem;">
                <label style="display: block; font-weight: 600; margin-bottom: 0.75rem; font-size: 1.1rem;">Select Variant:</label>
                <div id="variants-container" style="display: flex; flex-direction: column; gap: 0.75rem;">
                  ${product.variants.map((v, i) => `
                    <div class="variant-option" data-variant-id="${v.id}" style="padding: 1rem; border: 2px solid ${i === 0 ? '#3498db' : '#ecf0f1'}; border-radius: 8px; cursor: pointer; background: ${i === 0 ? '#e3f2fd' : 'white'};">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                          <strong style="color: #2c3e50;">${v.name}</strong>
                          <p style="margin: 0.25rem 0 0 0; color: #7f8c8d; font-size: 0.9rem;">${v.stock} available</p>
                        </div>
                        <strong style="color: #e67e22;">₱${v.price.toLocaleString()}</strong>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div style="margin-bottom: 1.5rem;">
              <label style="display: block; font-weight: 600; margin-bottom: 0.75rem;">Quantity:</label>
              <div style="display: flex; align-items: center; gap: 1rem;">
                <button id="qty-decrease" style="width: 40px; height: 40px; border: 1px solid #bdc3c7; background: white; border-radius: 5px; cursor: pointer; font-size: 1.2rem;">−</button>
                <input type="number" id="product-quantity" value="1" min="1" max="${hasVariants ? defaultVariant.stock : product.stock}" 
                       style="width: 80px; text-align: center; padding: 0.5rem; border: 1px solid #bdc3c7; border-radius: 5px; font-size: 1.1rem;">
                <button id="qty-increase" style="width: 40px; height: 40px; border: 1px solid #bdc3c7; background: white; border-radius: 5px; cursor: pointer; font-size: 1.2rem;">+</button>
              </div>
            </div>

            <div style="margin-bottom: 1.5rem;">
              <label style="display: block; font-weight: 600; margin-bottom: 0.75rem;">Special Remarks / Customization:</label>
              <textarea id="product-remarks" placeholder="Add any special requests..." style="width: 100%; min-height: 100px; padding: 0.75rem; border: 1px solid #bdc3c7; border-radius: 8px; font-family: inherit; resize: vertical;"></textarea>
            </div>

            <div style="display: flex; gap: 1rem; margin-top: 2rem;">
              <button id="add-to-cart-btn" class="btn btn-secondary" style="flex: 1; padding: 1rem; font-size: 1.1rem;">🛒 Add to Cart</button>
              <button id="buy-now-btn" class="btn btn-primary" style="flex: 1; padding: 1rem; font-size: 1.1rem;">⚡ Buy Now</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // Event listeners
  document.getElementById('close-product-modal').addEventListener('click', closeProductModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeProductModal(); });

  // Quantity buttons
  document.getElementById('qty-decrease').addEventListener('click', () => changeQuantity(-1));
  document.getElementById('qty-increase').addEventListener('click', () => changeQuantity(1));

  // Variant selection
  if (hasVariants) {
    modal.querySelectorAll('.variant-option').forEach(el => {
      el.addEventListener('click', () => {
        const variantId = el.dataset.variantId;
        const variant = product.variants.find(v => v.id === variantId);
        selectVariant(variant);
      });
    });
  }

  // Add to cart & buy now
  document.getElementById('add-to-cart-btn').addEventListener('click', () => addToCartFromModal(product));
  document.getElementById('buy-now-btn').addEventListener('click', () => buyNowFromModal(product));
}

// Select variant
function selectVariant(variant) {
  // Update price
  document.getElementById('selected-price').textContent = `₱${variant.price.toLocaleString()}`;
  
  // Update stock
  document.getElementById('stock-status').textContent = `${variant.stock} in stock`;
  
  // Update max quantity
  const quantityInput = document.getElementById('product-quantity');
  quantityInput.max = variant.stock;
  if (parseInt(quantityInput.value) > variant.stock) {
    quantityInput.value = variant.stock;
  }
  
  // Update image
  document.getElementById('product-main-image').src = variant.imageUrl;
  
  // Update UI - highlight selected variant
  document.querySelectorAll('.variant-option').forEach(el => {
    const isSelected = el.dataset.variantId === variant.id;
    el.style.border = isSelected ? '2px solid #3498db' : '2px solid #ecf0f1';
    el.style.background = isSelected ? '#e3f2fd' : 'white';
    if (isSelected) {
      el.classList.add('selected');
    } else {
      el.classList.remove('selected');
    }
  });
}

// Change quantity
function changeQuantity(delta) {
  const input = document.getElementById('product-quantity');
  const newValue = parseInt(input.value) + delta;
  const max = parseInt(input.max);
  
  if (newValue >= 1 && newValue <= max) {
    input.value = newValue;
  }
}

// Add to cart from modal
function addToCartFromModal(product) {
  const quantity = parseInt(document.getElementById('product-quantity').value);
  const remarks = document.getElementById('product-remarks').value.trim();
  
  // Get selected variant
  const selectedVariantEl = document.querySelector('.variant-option.selected');
  let selectedVariant = null;
  let variantName = 'Standard';
  let price = product.price;
  let imageUrl = product.imageUrl;
  
  if (selectedVariantEl && product.variants) {
    const variantId = selectedVariantEl.dataset.variantId;
    selectedVariant = product.variants.find(v => v.id === variantId);
    if (selectedVariant) {
      variantName = selectedVariant.name;
      price = selectedVariant.price;
      imageUrl = selectedVariant.imageUrl;
    }
  }
  
  const user = auth.currentUser;
  if (!user) {
    alert('Please login to add items to cart');
    window.location.href = '/login.html';
    return;
  }
  
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  
  // Check if same product with same variant and remarks exists
  const existingItemIndex = cart.findIndex(item => 
    item.productId === product.id && 
    item.variantId === (selectedVariant ? selectedVariant.id : null) &&
    item.remarks === remarks
  );
  
  if (existingItemIndex >= 0) {
    cart[existingItemIndex].quantity += quantity;
  } else {
    cart.push({
      productId: product.id,
      productName: product.name,
      variantId: selectedVariant ? selectedVariant.id : null,
      variantName: variantName,
      price: price,
      imageUrl: imageUrl,
      quantity: quantity,
      remarks: remarks
    });
  }
  
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  
  closeProductModal();
  showMessage(`${quantity} x ${product.name} (${variantName}) added to cart!`, 'success');
}

// Buy now from modal
function buyNowFromModal(product) {
  addToCartFromModal(product);
  setTimeout(() => {
    window.location.href = '/cart.html';
  }, 500);
}

// Close modal
function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = 'auto';
  }
}

// Add to cart (old function for backward compatibility)
function addToCart(productId, productName, price, imageUrl) {
  // This function is kept for any old code references
  // New products should use viewProductDetails instead
  const user = auth.currentUser;
  if (!user) {
    alert('Please login to add items to cart');
    window.location.href = '/login.html';
    return;
  }
  
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  
  const existingItem = cart.find(item => item.productId === productId);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      productId,
      productName,
      price,
      imageUrl,
      quantity: 1,
      variantName: 'Standard',
      remarks: ''
    });
  }
  
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  showMessage('Product added to cart!', 'success');
}

// Update cart count in navigation
function updateCartCount() {
  const cartCountElement = document.getElementById('cart-count');
  if (!cartCountElement) return;
  
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  cartCountElement.textContent = totalItems;
}

// Category filter
const categoryFilter = document.getElementById('category-filter');
if (categoryFilter) {
  categoryFilter.addEventListener('change', (e) => {
    const category = e.target.value;
    loadProducts(category || null);
  });
}

// Show message
function showMessage(message, type) {
  const messageDiv = document.getElementById('message');
  if (messageDiv) {
    messageDiv.className = `alert alert-${type === 'success' ? 'success' : 'error'}`;
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 3000);
  } else {
    alert(message);
  }
}

// Initialize - wait for backend before loading
if (document.getElementById('products-container')) {
  // Wait for backend to be ready
  if (typeof waitForBackend === 'function') {
    waitForBackend().then(() => {
      console.log('Backend ready, loading products...');
      loadProducts();
    });
  } else {
    // Fallback if startup-check.js not loaded
    console.log('Loading products without backend check...');
    loadProducts();
  }
}

updateCartCount();