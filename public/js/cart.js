let cartVerificationProfile = null;

function getCheckoutButton() {
  return document.getElementById('checkout-btn');
}

function setCheckoutAvailability(record) {
  const checkoutBtn = getCheckoutButton();
  if (!checkoutBtn) return;

  checkoutBtn.disabled = !record.canPlaceOrder;
  checkoutBtn.style.opacity = record.canPlaceOrder ? '1' : '0.65';
  checkoutBtn.title = record.canPlaceOrder ? '' : record.blockedReason;
}

function getVerificationStatusMarkup(record) {
  const color = record.isApproved ? '#1f7a3e' : (record.hasUploadedId ? '#9a6700' : '#9f1239');
  const background = record.isApproved ? '#e8f5e9' : (record.hasUploadedId ? '#fff7e6' : '#fff1f2');

  return `<span style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.8rem; border-radius: 999px; background: ${background}; color: ${color}; font-weight: 700; font-size: 0.9rem;">${record.statusLabel}</span>`;
}

function getEmailStatusMarkup(record) {
  const color = record.emailVerified ? '#1f7a3e' : '#9a6700';
  const background = record.emailVerified ? '#e8f5e9' : '#fff7e6';
  return `<span style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.8rem; border-radius: 999px; background: ${background}; color: ${color}; font-weight: 700; font-size: 0.9rem;">${record.emailStatusLabel}</span>`;
}

function renderCartVerificationCard(profile) {
  const container = document.getElementById('verification-card');
  if (!container) return;

  const record = userVerification.getVerificationRecord(profile);
  setCheckoutAvailability(record);

  const helperText = !record.hasUploadedId
    ? 'Upload one valid ID to unlock ordering and checkout.'
    : (record.isApproved
        ? 'Your ID has been approved. You can continue ordering normally.'
        : (record.orderUsedWhilePending
            ? 'Your one pending-verification order has already been used. Please wait for admin approval before ordering again.'
            : 'Your ID is under review. You can place one order while waiting for admin approval.'));

  container.style.display = 'block';
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
      <div>
        <h2 style="margin-bottom: 0.35rem;">Verification ID</h2>
        <p style="margin: 0; color: #667085;">A valid ID and one-time email OTP verification are required before checkout.</p>
      </div>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        ${getVerificationStatusMarkup(record)}
        ${getEmailStatusMarkup(record)}
      </div>
    </div>
    <div style="margin-top: 1rem; background: #f8fafc; border-radius: 10px; padding: 1rem;">
      <p style="margin: 0 0 0.65rem; color: #334155;"><strong>Status note:</strong> ${helperText}</p>
      <div style="margin-bottom: 1rem; padding: 1rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h3 style="margin: 0 0 0.55rem; font-size: 1rem;">Email Verification</h3>
        <p style="margin: 0 0 0.75rem; color: #475467;">We will send a 6-digit OTP to your account email. You only need to verify once.</p>
        ${record.emailVerified ? `
          <p style="margin: 0; color: #1f7a3e; font-weight: 600;">Your email has already been verified.</p>
        ` : `
          <form id="email-verification-form" style="display: grid; gap: 0.75rem; max-width: 420px;">
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
              <button type="button" id="send-email-otp-btn" class="btn btn-secondary">Send OTP Code</button>
              <input id="email-verification-code" type="text" inputmode="numeric" pattern="\\d{6}" maxlength="6" placeholder="Enter 6-digit code" style="flex: 1 1 180px; padding: 0.8rem; border: 1px solid #cbd5e1; border-radius: 8px;">
            </div>
            <button type="submit" class="btn btn-primary" style="width: fit-content;">Verify Email</button>
          </form>
        `}
      </div>
      ${record.hasUploadedId ? `
        <div style="display: flex; gap: 1rem; align-items: flex-start; flex-wrap: wrap;">
          <a href="${record.imageUrl}" target="_blank" rel="noopener">
            <img src="${record.thumbUrl}" alt="Uploaded verification ID" style="width: 160px; max-width: 100%; border-radius: 10px; border: 1px solid #dbe4ee; object-fit: cover;">
          </a>
          <div>
            <p style="margin: 0 0 0.45rem;"><strong>ID Type:</strong> ${record.idLabel}</p>
            <p style="margin: 0 0 0.45rem;"><strong>Uploaded:</strong> ${userVerification.formatVerificationDate(record.uploadedAt)}</p>
            <p style="margin: 0 0 0.7rem;"><strong>Approved:</strong> ${record.isApproved ? userVerification.formatVerificationDate(record.approvedAt) : 'Pending admin review'}</p>
            <a href="${record.imageUrl}" target="_blank" rel="noopener" class="btn btn-secondary">View Uploaded ID</a>
          </div>
        </div>
      ` : `
        <form id="verification-upload-form" style="display: grid; gap: 0.85rem; max-width: 480px;">
          <div>
            <label for="verification-id-label" style="display: block; margin-bottom: 0.35rem; font-weight: 600;">ID Type</label>
            <input id="verification-id-label" type="text" value="Government ID" maxlength="80" style="width: 100%; padding: 0.8rem; border: 1px solid #cbd5e1; border-radius: 8px;">
          </div>
          <div>
            <label for="verification-id-file" style="display: block; margin-bottom: 0.35rem; font-weight: 600;">Upload ID Image</label>
            <input id="verification-id-file" type="file" accept="image/png,image/jpeg,image/webp" style="width: 100%;">
            <p style="margin: 0.4rem 0 0; color: #64748b; font-size: 0.9rem;">Accepted formats: JPG, PNG, WEBP.</p>
          </div>
          <button type="submit" class="btn btn-primary" style="width: fit-content;">Upload ID for Verification</button>
        </form>
      `}
    </div>
  `;

  const uploadForm = document.getElementById('verification-upload-form');
  if (uploadForm) {
    uploadForm.addEventListener('submit', submitVerificationUploadFromCart);
  }

  const emailForm = document.getElementById('email-verification-form');
  if (emailForm) {
    emailForm.addEventListener('submit', submitEmailVerificationFromCart);
  }

  const sendOtpBtn = document.getElementById('send-email-otp-btn');
  if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', sendEmailOtpFromCart);
  }
}

async function refreshCartVerification(forceRefresh = false) {
  const container = document.getElementById('verification-card');
  if (!container || typeof userVerification === 'undefined') return;

  container.style.display = 'block';
  container.innerHTML = '<p style="margin: 0; color: #64748b;">Loading verification status...</p>';

  try {
    cartVerificationProfile = await userVerification.loadCurrentUserProfile(forceRefresh);
    renderCartVerificationCard(cartVerificationProfile);
  } catch (error) {
    setCheckoutAvailability({ canPlaceOrder: false, blockedReason: error.message });
    container.innerHTML = `<p style="margin: 0; color: #b42318;">${error.message}</p>`;
  }
}

async function submitVerificationUploadFromCart(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const fileInput = document.getElementById('verification-id-file');
  const labelInput = document.getElementById('verification-id-label');
  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;

  try {
    submitButton.disabled = true;
    submitButton.textContent = 'Uploading...';
    await userVerification.uploadVerificationId(fileInput.files[0], labelInput.value.trim() || 'Government ID');
    showMessage('Your ID was uploaded successfully and is now pending review.', 'success');
    await refreshCartVerification(true);
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
}

async function sendEmailOtpFromCart(event) {
  const button = event.currentTarget;
  const originalText = button.textContent;

  try {
    button.disabled = true;
    button.textContent = 'Sending...';
    await userVerification.sendEmailVerificationOtp();
    showMessage('Verification code sent to your email.', 'success');
    await refreshCartVerification(true);
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function submitEmailVerificationFromCart(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const codeInput = document.getElementById('email-verification-code');
  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;

  try {
    submitButton.disabled = true;
    submitButton.textContent = 'Verifying...';
    await userVerification.verifyEmailOtp(codeInput.value.trim());
    showMessage('Email verified successfully. You can now continue to checkout.', 'success');
    await refreshCartVerification(true);
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
}

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

  try {
    const profile = await userVerification.loadCurrentUserProfile(true);
    const verification = userVerification.getVerificationRecord(profile);
    cartVerificationProfile = profile;
    renderCartVerificationCard(profile);

    if (!verification.canPlaceOrder) {
      alert(verification.blockedReason);
      return;
    }
  } catch (error) {
    alert(error.message);
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
  window.addEventListener('verification-updated', () => {
    refreshCartVerification(true);
  });
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = '/login.html';
    } else {
      loadCart();
      refreshCartVerification();
    }
  });
}



