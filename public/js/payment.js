let currentOrder = null;

function formatPeso(value) {
  return `P${Number(value || 0).toLocaleString()}`;
}

function isDownPaymentSettled(order) {
  return order && (
    order.paymentStatus === 'down_payment_paid' ||
    order.paymentStatus === 'fully_paid' ||
    order.paymentStatus === 'paid'
  );
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

function getQueryState() {
  const params = new URLSearchParams(window.location.search);
  return {
    orderId: params.get('orderId'),
    paymongoState: params.get('paymongo')
  };
}

function getStoredCheckoutSessionId(orderId) {
  if (!orderId) return null;
  return sessionStorage.getItem(`paymongoCheckoutSession:${orderId}`);
}

function setStoredCheckoutSessionId(orderId, sessionId) {
  if (!orderId || !sessionId) return;
  sessionStorage.setItem(`paymongoCheckoutSession:${orderId}`, sessionId);
}

function clearStoredCheckoutSessionId(orderId) {
  if (!orderId) return;
  sessionStorage.removeItem(`paymongoCheckoutSession:${orderId}`);
}

function updateActionButtons(order) {
  const payBtn = document.getElementById('pay-with-gcash-btn');
  const refreshBtn = document.getElementById('refresh-payment-btn');
  const settled = isDownPaymentSettled(order);

  if (!payBtn || !refreshBtn) return;

  if (settled) {
    payBtn.disabled = true;
    refreshBtn.disabled = false;
    payBtn.textContent = 'Down Payment Already Paid';
    return;
  }

  payBtn.disabled = false;
  refreshBtn.disabled = false;
  payBtn.textContent = `Pay ${formatPeso(order.downPayment)} Using GCash`;
}

function updatePage(order) {
  document.getElementById('order-id-text').textContent = `#${order.id.substring(0, 8)}`;
  document.getElementById('shipping-address-text').textContent = order.shippingAddress || '-';
  document.getElementById('total-amount-text').textContent = formatPeso(order.totalAmount);
  document.getElementById('down-payment-text').textContent = formatPeso(order.downPayment);
  document.getElementById('payment-status-text').textContent = (order.paymentStatus || 'pending').replace(/_/g, ' ');
  updateActionButtons(order);
}

async function loadOrder() {
  const { orderId } = getQueryState();

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
    await handleReturnFromCheckout();
  } catch (error) {
    hideLoading();
    if (error.name === 'AbortError') {
      showMessage('Loading order timed out. Please refresh and try again.', 'error');
    } else {
      showMessage(error.message || 'Failed to load order.', 'error');
    }
  }
}

async function syncCheckoutStatus(options = {}) {
  if (!currentOrder) return false;

  const sessionId = currentOrder.paymongoCheckoutSessionId || getStoredCheckoutSessionId(currentOrder.id);
  if (!sessionId) {
    if (!options.silent) {
      showMessage('No PayMongo checkout session found yet. Start the GCash checkout first.', 'error');
    }
    return false;
  }

  try {
    const token = await getTokenOrRedirect();
    if (!token) return false;

    const refreshBtn = document.getElementById('refresh-payment-btn');
    const originalText = refreshBtn ? refreshBtn.textContent : '';
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Refreshing...';
    }

    const response = await fetchApi(`/payments/paymongo/checkout-session/${encodeURIComponent(sessionId)}/sync`, token, {
      method: 'POST',
      body: JSON.stringify({ orderId: currentOrder.id })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Unable to refresh payment status');
    }

    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = originalText || 'Refresh Payment Status';
    }

    await reloadOrder({ silent: true });

    if (payload.paid) {
      clearStoredCheckoutSessionId(currentOrder.id);
      showMessage('GCash payment confirmed. Your order down payment is now marked as paid.', 'success');
      return true;
    }

    if (!options.silent) {
      showMessage('Payment is still pending. If you already paid, please wait a moment and refresh again.', 'error');
    }
    return false;
  } catch (error) {
    const refreshBtn = document.getElementById('refresh-payment-btn');
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Refresh Payment Status';
    }
    if (!options.silent) {
      showMessage(error.message || 'Unable to refresh payment status.', 'error');
    }
    return false;
  }
}

async function reloadOrder(options = {}) {
  if (!currentOrder) return null;

  const token = await getTokenOrRedirect();
  if (!token) return null;

  const response = await fetchApi(`/orders/${encodeURIComponent(currentOrder.id)}`, token, { method: 'GET' });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to reload order');
  }

  currentOrder = payload;
  updatePage(currentOrder);

  if (!options.silent && isDownPaymentSettled(currentOrder)) {
    showMessage('Down payment already received for this order.', 'success');
  }

  return currentOrder;
}

async function handleReturnFromCheckout() {
  if (!currentOrder) return;

  const { paymongoState } = getQueryState();
  if (paymongoState === 'success') {
    showMessage('Checking your PayMongo payment status...', 'success');
    const paid = await syncCheckoutStatus({ silent: true });
    if (!paid && !isDownPaymentSettled(currentOrder)) {
      showMessage('Payment submitted. We are still waiting for PayMongo confirmation, so please refresh again in a moment.', 'error');
    }
  } else if (paymongoState === 'cancelled') {
    showMessage('GCash checkout was cancelled. You can try again whenever you are ready.', 'error');
  }
}

async function startPaymongoCheckout() {
  if (!currentOrder) return;

  if (isDownPaymentSettled(currentOrder)) {
    showMessage('Down payment is already settled for this order.', 'success');
    return;
  }

  const payBtn = document.getElementById('pay-with-gcash-btn');
  payBtn.disabled = true;
  payBtn.textContent = 'Opening Secure Checkout...';

  try {
    const token = await getTokenOrRedirect();
    if (!token) return;

    const response = await fetchApi('/payments/paymongo/checkout-session', token, {
      method: 'POST',
      body: JSON.stringify({ orderId: currentOrder.id })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Unable to start GCash checkout');
    }

    setStoredCheckoutSessionId(currentOrder.id, payload.checkoutSessionId);
    window.location.href = payload.checkoutUrl;
  } catch (error) {
    payBtn.disabled = false;
    payBtn.textContent = `Pay ${formatPeso(currentOrder.downPayment)} Using GCash`;
    showMessage(error.message || 'Unable to open GCash checkout. Please try again.', 'error');
  }
}

const payWithGcashBtn = document.getElementById('pay-with-gcash-btn');
if (payWithGcashBtn) payWithGcashBtn.addEventListener('click', startPaymongoCheckout);

const refreshPaymentBtn = document.getElementById('refresh-payment-btn');
if (refreshPaymentBtn) refreshPaymentBtn.addEventListener('click', () => syncCheckoutStatus());

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
