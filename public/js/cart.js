// Load cart
function loadCart() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  displayCart(cart);
  updateCartSummary(cart);
}

// Display cart items
function displayCart(cart) {
  const container = document.getElementById('cart-items');
  if (!container) return;
  
  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="opacity: 0.3;">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <h2 style="color: #7f8c8d; margin: 1rem 0;">Your cart is empty</h2>
        <p style="color: #95a5a6; margin-bottom: 2rem;">Add some furniture to get started!</p>
        <a href="/products.html" class="btn btn-primary">Browse Products</a>
      </div>
    `;
    document.getElementById('cart-summary').style.display = 'none';
    return;
  }
  
  container.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <img src="${item.imageUrl}" alt="${item.productName}" class="cart-item-image" onerror="this.src='https://via.placeholder.com/100?text=No+Image'">
      <div class="cart-item-info">
        <h3>${item.productName}</h3>
        ${item.variantName && item.variantName !== 'Standard' ? 
          `<p style="color: #3498db; font-size: 0.9rem; margin: 0.25rem 0;">📦 Variant: ${item.variantName}</p>` : 
          ''}
        ${item.remarks ? 
          `<p style="color: #7f8c8d; font-size: 0.85rem; margin: 0.5rem 0; padding: 0.5rem; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #3498db;">
            💬 <strong>Remarks:</strong> ${item.remarks}
          </p>` : 
          ''}
        <p class="product-price">₱${item.price.toLocaleString()} each</p>
        <div class="quantity-controls">
          <button class="quantity-btn" onclick="updateQuantity(${index}, -1)" title="Decrease quantity">−</button>
          <span class="quantity-display">${item.quantity}</span>
          <button class="quantity-btn" onclick="updateQuantity(${index}, 1)" title="Increase quantity">+</button>
        </div>
        <div class="cart-actions">
          <button class="btn btn-danger" onclick="removeFromCart(${index})" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
            🗑️ Remove
          </button>
        </div>
      </div>
      <div style="text-align: right;">
        <p style="color: #7f8c8d; font-size: 0.9rem; margin-bottom: 0.5rem;">Subtotal</p>
        <p style="font-size: 1.5rem; font-weight: bold; color: #e67e22;">₱${(item.price * item.quantity).toLocaleString()}</p>
      </div>
    </div>
  `).join('');
  
  document.getElementById('cart-summary').style.display = 'block';
}

// Update cart summary
function updateCartSummary(cart) {
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const downPayment = totalAmount * 0.3;
  const remainingBalance = totalAmount - downPayment;
  
  const subtotalEl        = document.getElementById('subtotal');
  const totalItemsEl      = document.getElementById('total-items');
  const totalAmountEl     = document.getElementById('total-amount');
  const downPaymentEl     = document.getElementById('down-payment');
  const remainingBalanceEl = document.getElementById('remaining-balance');
  
  if (subtotalEl)         subtotalEl.textContent         = `₱${totalAmount.toLocaleString()}`;
  if (totalItemsEl)       totalItemsEl.textContent       = totalItems;
  if (totalAmountEl)      totalAmountEl.textContent      = `₱${totalAmount.toLocaleString()}`;
  if (downPaymentEl)      downPaymentEl.textContent      = `₱${downPayment.toLocaleString()}`;
  if (remainingBalanceEl) remainingBalanceEl.textContent = `₱${remainingBalance.toLocaleString()}`;
}

// Update quantity
function updateQuantity(index, change) {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  cart[index].quantity += change;
  
  if (cart[index].quantity <= 0) {
    if (confirm(`Remove ${cart[index].productName} from cart?`)) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity = 1;
    }
  }
  
  localStorage.setItem('cart', JSON.stringify(cart));
  loadCart();
  updateCartCount();
  showMessage(change > 0 ? 'Quantity increased' : 'Quantity decreased', 'success');
}

// Remove from cart
function removeFromCart(index) {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const productName = cart[index].productName;
  
  if (confirm(`Remove ${productName} from cart?`)) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
    updateCartCount();
    showMessage(`${productName} removed from cart`, 'success');
  }
}

// Checkout
async function checkout() {
  const user = auth.currentUser;
  if (!user) {
    alert('Please login to checkout');
    window.location.href = '/login.html';
    return;
  }
  
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  if (cart.length === 0) {
    alert('Your cart is empty');
    return;
  }
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); display: flex;
    align-items: center; justify-content: center; z-index: 2000;
  `;
  
  modal.innerHTML = `
    <div style="background: white; padding: 2rem; border-radius: 10px; max-width: 500px; width: 90%;">
      <h2 style="margin-bottom: 1rem;">Shipping Information</h2>
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Full Address *</label>
        <textarea id="shipping-address" placeholder="Enter your complete delivery address including street, barangay, city" 
          style="width: 100%; padding: 0.75rem; border: 1px solid #bdc3c7; border-radius: 5px; min-height: 100px;" required></textarea>
      </div>
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Contact Number *</label>
        <input type="tel" id="contact-number" placeholder="09XX XXX XXXX" 
          style="width: 100%; padding: 0.75rem; border: 1px solid #bdc3c7; border-radius: 5px;" required>
      </div>
      <div style="display: flex; gap: 1rem;">
        <button id="confirm-checkout" class="btn btn-primary" style="flex: 1;">Confirm Order</button>
        <button id="cancel-checkout" class="btn btn-secondary" style="flex: 1;">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('cancel-checkout').onclick = () => modal.remove();
  
  document.getElementById('confirm-checkout').onclick = async () => {
    const address = document.getElementById('shipping-address').value.trim();
    const contact = document.getElementById('contact-number').value.trim();
    
    if (!address || !contact) {
      alert('Please fill in all fields');
      return;
    }
    
    modal.remove();
    
    const totalAmount    = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const downPayment    = totalAmount * 0.3;
    const shippingAddress = `${address}\nContact: ${contact}`;

    try {
      const checkoutBtn    = document.getElementById('checkout-btn');
      const originalText   = checkoutBtn ? checkoutBtn.textContent : '';
      if (checkoutBtn) { checkoutBtn.textContent = 'Creating Order...'; checkoutBtn.disabled = true; }
      
      const token = await getAuthToken();
      
      const orderResponse = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ items: cart, totalAmount, downPayment, shippingAddress })
      });
      
      const order = await orderResponse.json();
      
      if (orderResponse.ok) {
        localStorage.removeItem('cart');
        updateCartCount();
        window.location.href = `/payment.html?orderId=${encodeURIComponent(order.id)}`;
        return;
      }

      alert('Failed to create order: ' + order.error);
      if (checkoutBtn) { checkoutBtn.textContent = originalText; checkoutBtn.disabled = false; }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to create order. Please try again.');
      const btn = document.getElementById('checkout-btn');
      if (btn) { btn.textContent = 'Proceed to Checkout'; btn.disabled = false; }
    }
  };
}

// Show message
function showMessage(message, type) {
  const messageDiv = document.getElementById('message');
  if (!messageDiv) return;
  messageDiv.className = `alert alert-${type === 'success' ? 'success' : 'error'}`;
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';
  setTimeout(() => { messageDiv.style.display = 'none'; }, 3000);
}

function setupAgreementModal() {
  const checkoutBtn = document.getElementById('checkout-btn');
  const modal = document.getElementById('agreement-modal');
  const closeBtn = document.getElementById('agreement-close-btn');
  const agreeCheckbox = document.getElementById('agree-checkbox');
  const confirmBtn = document.getElementById('confirm-checkout-btn');

  if (!checkoutBtn || !modal || !agreeCheckbox || !confirmBtn) return;

  function setConfirmState(isEnabled) {
    confirmBtn.disabled = !isEnabled;
    confirmBtn.classList.toggle('enabled', isEnabled);
  }

  function closeAgreementModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function openAgreementModal() {
    agreeCheckbox.checked = false;
    setConfirmState(false);
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  checkoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openAgreementModal();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeAgreementModal();
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeAgreementModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeAgreementModal();
    }
  });

  agreeCheckbox.addEventListener('change', () => {
    setConfirmState(agreeCheckbox.checked);
  });

  confirmBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!agreeCheckbox.checked) return;
    closeAgreementModal();
    setTimeout(() => {
      checkout();
    }, 150);
  });

  setConfirmState(false);
}

// Initialize
if (document.getElementById('cart-items')) {
  setupAgreementModal();
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = '/login.html';
    } else {
      loadCart();
    }
  });
}



