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

async function getTokenOrRedirect() {
  const user = auth.currentUser;
  if (!user) {
    window.location.href = '/login.html';
    return null;
  }
  return user.getIdToken();
}

function updatePage(order) {
  document.getElementById('order-id-text').textContent = `#${order.id.substring(0, 8)}`;
  document.getElementById('shipping-address-text').textContent = order.shippingAddress || '-';
  document.getElementById('total-amount-text').textContent = formatPeso(order.totalAmount);
  document.getElementById('down-payment-text').textContent = formatPeso(order.downPayment);
  document.getElementById('payment-status-text').textContent = (order.paymentStatus || 'pending').replace(/_/g, ' ');

  const payBtn = document.getElementById('pay-now-btn');
  const downPaymentSettled = order.paymentStatus === 'down_payment_paid' || order.paymentStatus === 'fully_paid' || order.paymentStatus === 'paid';
  if (downPaymentSettled) {
    payBtn.disabled = true;
    payBtn.textContent = 'Down Payment Already Paid';
  } else {
    payBtn.disabled = false;
    payBtn.textContent = `Pay ${formatPeso(order.downPayment)} via GCash`;
  }
}

async function loadOrder() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');

  if (!orderId) {
    showMessage('Missing orderId in URL.', 'error');
    document.getElementById('payment-loading').style.display = 'none';
    return;
  }

  const token = await getTokenOrRedirect();
  if (!token) return;

  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to load order');
    }

    currentOrder = payload;
    updatePage(currentOrder);
    document.getElementById('payment-loading').style.display = 'none';
    document.getElementById('payment-content').style.display = 'block';
  } catch (error) {
    document.getElementById('payment-loading').style.display = 'none';
    showMessage(error.message || 'Failed to load order.', 'error');
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

    const response = await fetch('/api/payments/down-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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
    payBtn.textContent = `Pay ${formatPeso(currentOrder.downPayment)} via GCash`;
    showMessage(error.message || 'Payment failed. Please try again.', 'error');
  }
}

if (document.getElementById('pay-now-btn')) {
  document.getElementById('pay-now-btn').addEventListener('click', payDownPayment);
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
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
