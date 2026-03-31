let currentOrder = null;

function formatPeso(value) {
  return `P${Number(value || 0).toLocaleString()}`;
}

function showMessage(message, type) {
  const messageDiv = document.getElementById('message');
  if (!messageDiv) return;
  messageDiv.className = `alert alert-${type === 'success' ? 'success' : 'error'}`;
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';
}

function hideLoading() {
  const loading = document.getElementById('payment-loading');
  if (loading) loading.style.display = 'none';
}

async function getTokenOrRedirect() {
  const user = auth.currentUser;
  if (!user) {
    window.location.href = '/login.html';
    return null;
  }
  return user.getIdToken();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchApi(path, token, options = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiBases = [];

  if (typeof API_BASE_URL === 'string' && API_BASE_URL.trim()) {
    apiBases.push(API_BASE_URL.replace(/\/$/, ''));
  }
  apiBases.push('/api');

  let lastError = null;
  for (const base of apiBases) {
    try {
      const response = await fetchWithTimeout(`${base}${normalizedPath}`, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(options.headers || {})
        },
        body: options.body
      });
      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to contact payment server');
}

function getGcashNumber() {
  const numberEl = document.getElementById('gcash-number-text');
  return (numberEl ? numberEl.textContent : '0998 435 8888').trim();
}

function buildPaymentDetailsText() {
  if (!currentOrder) return '';
  return [
    `Order: #${currentOrder.id.substring(0, 8)}`,
    `Amount: ${formatPeso(currentOrder.downPayment)}`,
    `GCash Number: ${getGcashNumber()}`,
    'Account Name: Momoy\'s Furniture'
  ].join('\n');
}

async function copyPaymentDetails() {
  if (!currentOrder) return;
  const details = buildPaymentDetailsText();
  try {
    await navigator.clipboard.writeText(details);
    showMessage('Payment details copied.', 'success');
  } catch (error) {
    showMessage('Unable to copy automatically. Please copy details manually.', 'error');
  }
}

async function openGcash() {
  if (!currentOrder) return;

  await copyPaymentDetails();
  // Note: Public GCash deep links do not reliably support prefilled recipient+amount.
  // We still attempt to open the app, then fallback to website.
  window.location.href = 'gcash://';
  setTimeout(() => {
    window.open('https://www.gcash.com/', '_blank');
  }, 1200);
}

function updatePage(order) {
  document.getElementById('order-id-text').textContent = `#${order.id.substring(0, 8)}`;
  document.getElementById('shipping-address-text').textContent = order.shippingAddress || '-';
  document.getElementById('total-amount-text').textContent = formatPeso(order.totalAmount);
  document.getElementById('down-payment-text').textContent = formatPeso(order.downPayment);
  document.getElementById('payment-status-text').textContent = (order.paymentStatus || 'pending').replace(/_/g, ' ');

  const payBtn = document.getElementById('pay-now-btn');
  const openGcashBtn = document.getElementById('open-gcash-btn');
  const downPaymentSettled = order.paymentStatus === 'down_payment_paid' || order.paymentStatus === 'fully_paid' || order.paymentStatus === 'paid';

  if (downPaymentSettled) {
    payBtn.disabled = true;
    openGcashBtn.disabled = true;
    payBtn.textContent = 'Down Payment Already Paid';
  } else {
    payBtn.disabled = false;
    openGcashBtn.disabled = false;
    payBtn.textContent = `I Paid ${formatPeso(order.downPayment)} via GCash`;
  }
}

async function loadOrder() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');

  if (!orderId) {
    hideLoading();
    showMessage('Missing orderId in URL.', 'error');
    return;
  }

  const token = await getTokenOrRedirect();
  if (!token) return;

  try {
    const response = await fetchApi(`/orders/${encodeURIComponent(orderId)}`, token, { method: 'GET' });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Failed to load order');
    }

    currentOrder = payload;
    updatePage(currentOrder);
    hideLoading();
    document.getElementById('payment-content').style.display = 'block';
  } catch (error) {
    hideLoading();
    if (error.name === 'AbortError') {
      showMessage('Loading order timed out. Please refresh and try again.', 'error');
    } else {
      showMessage(error.message || 'Failed to load order.', 'error');
    }
  }
}

async function payDownPayment() {
  if (!currentOrder) return;

  const downPaymentSettled = currentOrder.paymentStatus === 'down_payment_paid' || currentOrder.paymentStatus === 'fully_paid' || currentOrder.paymentStatus === 'paid';
  if (downPaymentSettled) {
    showMessage('Down payment is already settled for this order.', 'success');
    return;
  }

  const confirmed = confirm(
    `Confirm GCash Payment\n\n` +
    `Order: #${currentOrder.id.substring(0, 8)}\n` +
    `Amount: ${formatPeso(currentOrder.downPayment)}\n\n` +
    `Proceed to mark this down payment as paid?`
  );
  if (!confirmed) return;

  const payBtn = document.getElementById('pay-now-btn');
  payBtn.disabled = true;
  payBtn.textContent = 'Processing Payment...';

  try {
    const token = await getTokenOrRedirect();
    if (!token) return;

    const response = await fetchApi('/payments/down-payment', token, {
      method: 'POST',
      body: JSON.stringify({
        orderId: currentOrder.id,
        amount: currentOrder.downPayment,
        paymentMethod: 'gcash'
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Payment failed');
    }

    showMessage('Down payment recorded successfully. Redirecting to My Orders...', 'success');
    setTimeout(() => {
      window.location.href = '/orders.html';
    }, 1200);
  } catch (error) {
    payBtn.disabled = false;
    payBtn.textContent = `I Paid ${formatPeso(currentOrder.downPayment)} via GCash`;
    showMessage(error.message || 'Payment failed. Please try again.', 'error');
  }
}

const payNowBtn = document.getElementById('pay-now-btn');
if (payNowBtn) payNowBtn.addEventListener('click', payDownPayment);

const openGcashBtn = document.getElementById('open-gcash-btn');
if (openGcashBtn) openGcashBtn.addEventListener('click', openGcash);

const copyDetailsBtn = document.getElementById('copy-details-btn');
if (copyDetailsBtn) copyDetailsBtn.addEventListener('click', copyPaymentDetails);

const paymentLogoutBtn = document.getElementById('logout-btn');
if (paymentLogoutBtn) {
  paymentLogoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (typeof logoutUser === 'function') {
      await logoutUser();
    }
  });
}

auth.onAuthStateChanged((user) => {
  if (user) {
    loadOrder();
  } else {
    window.location.href = '/login.html';
  }
});
