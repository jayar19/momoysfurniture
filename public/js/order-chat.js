const ORDER_AI_STORAGE_KEY = 'momoysOrderAiSessions';

let currentOrder = null;
let currentOrderId = null;
let orderAiSessions = loadOrderAiSessions();

function getQueryOrderId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('orderId');
}

function showPageMessage(message, type) {
  const messageDiv = document.getElementById('page-message');
  if (!messageDiv) return;

  messageDiv.className = `alert alert-${type === 'success' ? 'success' : 'error'}`;
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';
}

function hideLoadingState() {
  const loading = document.getElementById('order-chat-loading');
  if (loading) loading.style.display = 'none';
}

function showContentState() {
  const content = document.getElementById('order-chat-content');
  if (content) content.style.display = 'block';
}

function formatPeso(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatChatTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toTitleCase(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusInfo(status) {
  const statusMap = {
    processing: { label: 'Processing', class: 'status-pending' },
    confirmed: { label: 'Confirmed', class: 'status-confirmed' },
    in_transit: { label: 'In Transit', class: 'status-in-transit' },
    delivered: { label: 'Delivered', class: 'status-delivered' },
    cancelled: { label: 'Cancelled', class: 'status-pending' }
  };

  return statusMap[status] || { label: toTitleCase(status || 'pending'), class: 'status-pending' };
}

function loadOrderAiSessions() {
  try {
    const raw = sessionStorage.getItem(ORDER_AI_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('Failed to load AI order sessions:', error);
    return {};
  }
}

function saveOrderAiSessions() {
  try {
    sessionStorage.setItem(ORDER_AI_STORAGE_KEY, JSON.stringify(orderAiSessions));
  } catch (error) {
    console.warn('Failed to save AI order sessions:', error);
  }
}

function ensureOrderAiSession(orderId) {
  if (!orderAiSessions[orderId]) {
    orderAiSessions[orderId] = [];
  }
  return orderAiSessions[orderId];
}

function appendOrderAiMessage(orderId, role, message) {
  const session = ensureOrderAiSession(orderId);
  session.push({
    role,
    message,
    createdAt: new Date().toISOString()
  });
  saveOrderAiSessions();
}

function summarizeOrderItems(order) {
  if (!order?.items?.length) return 'No items were found on this order.';

  return order.items.map((item) => {
    const variant = item.variantName && item.variantName !== 'Standard'
      ? ` (${item.variantName})`
      : '';
    return `${item.productName} x${item.quantity}${variant}`;
  }).join(', ');
}

function getOrderAiSuggestions(order) {
  const suggestions = [
    'What is my order status?',
    'When will this be delivered?',
    'How much do I still need to pay?',
    'What items are in this order?',
    'Can I change my shipping address?'
  ];

  if (order?.currentLocation || order?.deliveryStatus === 'in_transit') {
    suggestions.unshift('Where is my order right now?');
  }

  return suggestions.slice(0, 6);
}

function buildOrderAssistantReply(order, question) {
  if (!order) {
    return 'I could not find the latest details for this order. Please go back and reload the page.';
  }

  const normalizedQuestion = String(question || '').toLowerCase();
  const statusInfo = getStatusInfo(order.deliveryStatus);
  const deliveryDate = order.estimatedDelivery ? formatDate(order.estimatedDelivery) : null;
  const paymentStatus = toTitleCase(order.paymentStatus || 'pending');
  const remainingBalance = Number(order.remainingBalance) || 0;
  const downPaymentSettled = order.paymentStatus === 'down_payment_paid' || order.paymentStatus === 'fully_paid' || order.paymentStatus === 'paid';
  const fullyPaid = order.paymentStatus === 'fully_paid' || order.paymentStatus === 'paid';
  const itemsSummary = summarizeOrderItems(order);

  if (/(where|track|location|driver|map)/.test(normalizedQuestion)) {
    if (order.currentLocation) {
      return `Your order is currently marked as ${statusInfo.label}. Tracking is available for this order, so you can use the Track Delivery button for the latest location update.`;
    }

    if (order.deliveryStatus === 'in_transit') {
      return 'Your order is already in transit, but a live location has not been shared yet. Send a message to the admin if you need the latest delivery update.';
    }

    return `Your order is currently ${statusInfo.label}. Tracking becomes available once the delivery team shares a live location for this order.`;
  }

  if (/(when|deliver|delivery|arrive|arrival|eta)/.test(normalizedQuestion)) {
    if (deliveryDate) {
      return `The current estimated delivery date for this order is ${deliveryDate}. Its present delivery stage is ${statusInfo.label}.`;
    }

    if (order.deliveryStatus === 'delivered') {
      return 'This order is already marked as delivered.';
    }

    return `This order is currently ${statusInfo.label}. A delivery date has not been posted yet, so the admin will need to confirm the schedule if you need a more exact timeline.`;
  }

  if (/(pay|payment|balance|down payment|gcash|paid|amount)/.test(normalizedQuestion)) {
    if (fullyPaid) {
      return `This order is already fully paid. Total paid: ${formatPeso(order.totalAmount)}.`;
    }

    if (downPaymentSettled) {
      return `Your down payment of ${formatPeso(order.downPayment)} is already marked as paid. The remaining balance is ${formatPeso(remainingBalance)} and the payment status is ${paymentStatus}.`;
    }

    return `The total amount is ${formatPeso(order.totalAmount)}. The required down payment is ${formatPeso(order.downPayment)}, and it is still marked as pending.`;
  }

  if (/(status|progress|update|stage|confirmed|processing|transit|delivered)/.test(normalizedQuestion)) {
    const deliveryLine = deliveryDate ? ` The current estimated delivery date is ${deliveryDate}.` : '';
    return `Your order status is ${toTitleCase(order.status || 'pending')} and the delivery stage is ${statusInfo.label}.${deliveryLine}`;
  }

  if (/(item|product|ordered|order details|what did i order|include)/.test(normalizedQuestion)) {
    return `This order includes ${itemsSummary}. The total order amount is ${formatPeso(order.totalAmount)}.`;
  }

  if (/(address|shipping|deliver to|location change|change address)/.test(normalizedQuestion)) {
    const address = order.shippingAddress || 'No shipping address is currently saved for this order.';
    return `The shipping address on this order is: ${address} If you need to change it, please message the admin so they can confirm whether the update is still possible.`;
  }

  if (/(cancel|refund|return|change order|edit order|reschedule|move delivery)/.test(normalizedQuestion)) {
    return 'Requests like cancellations, returns, schedule changes, or order edits usually need manual approval. Please send the details to the admin conversation on this page.';
  }

  if (/(contact|admin|support|message|talk to someone)/.test(normalizedQuestion)) {
    return 'Use the admin conversation on this page for anything that needs a store reply or manual approval.';
  }

  return `Here is a quick summary: this order is currently ${statusInfo.label}, the payment status is ${paymentStatus}, and the remaining balance is ${formatPeso(remainingBalance)}. You can ask me about delivery, tracking, payment, address, or the items in this order.`;
}

function renderOrderSummary(order) {
  const statusInfo = getStatusInfo(order.deliveryStatus);
  const badge = document.getElementById('order-status-badge');
  if (badge) {
    badge.className = `order-status ${statusInfo.class}`;
    badge.textContent = statusInfo.label;
  }

  document.getElementById('order-id-text').textContent = `Order #${String(order.id || '').substring(0, 8)}`;
  document.getElementById('delivery-stage-text').textContent = statusInfo.label;
  document.getElementById('payment-status-text').textContent = toTitleCase(order.paymentStatus || 'pending');
  document.getElementById('total-amount-text').textContent = formatPeso(order.totalAmount);
  document.getElementById('remaining-balance-text').textContent = formatPeso(order.remainingBalance);
  document.getElementById('estimated-delivery-text').textContent = order.estimatedDelivery ? formatDate(order.estimatedDelivery) : 'Not available yet';
  document.getElementById('items-summary-text').textContent = summarizeOrderItems(order);
  document.getElementById('shipping-address-text').textContent = order.shippingAddress || '-';

  const trackLink = document.getElementById('track-delivery-link');
  if (trackLink) {
    if (order.currentLocation || order.deliveryStatus === 'in_transit') {
      trackLink.href = `/track-delivery.html?orderId=${encodeURIComponent(order.id)}`;
      trackLink.style.display = 'inline-flex';
    } else {
      trackLink.style.display = 'none';
    }
  }

  const paymentLink = document.getElementById('payment-link');
  if (paymentLink) {
    const needsDownPayment = !downPaymentSettled(order);
    if (needsDownPayment) {
      paymentLink.href = `/payment.html?orderId=${encodeURIComponent(order.id)}`;
      paymentLink.style.display = 'inline-flex';
      paymentLink.textContent = 'Go to Payment';
    } else {
      paymentLink.style.display = 'none';
    }
  }
}

function downPaymentSettled(order) {
  return order && (
    order.paymentStatus === 'down_payment_paid' ||
    order.paymentStatus === 'fully_paid' ||
    order.paymentStatus === 'paid'
  );
}

function renderOrderAiSuggestions(order) {
  const suggestionsContainer = document.getElementById('order-ai-suggestions');
  if (!suggestionsContainer) return;

  const questions = getOrderAiSuggestions(order);
  suggestionsContainer.innerHTML = questions.map((question) => `
    <button type="button" class="order-ai-chip" data-question="${escapeHtml(question)}">
      ${escapeHtml(question)}
    </button>
  `).join('');
}

function renderOrderAiThread(orderId) {
  const thread = document.getElementById('order-ai-thread');
  if (!thread) return;

  const messages = ensureOrderAiSession(orderId);
  if (!messages.length) {
    thread.innerHTML = '<div class="chat-empty">Ask about this order and the assistant will answer from the latest order details.</div>';
    return;
  }

  thread.innerHTML = messages.map((message) => {
    const isUser = message.role === 'user';
    const roleLabel = isUser ? 'You' : 'Momoy Assistant';

    return `
      <div class="chat-message ${isUser ? 'chat-own' : 'chat-other chat-ai'}">
        <div class="chat-meta">
          <span>${escapeHtml(roleLabel)}</span>
          <span>${escapeHtml(formatChatTimestamp(message.createdAt))}</span>
        </div>
        <div class="chat-body">${escapeHtml(message.message || '')}</div>
      </div>
    `;
  }).join('');

  thread.scrollTop = thread.scrollHeight;
}

function askOrderAssistant(question) {
  const trimmedQuestion = String(question || '').trim();
  if (!trimmedQuestion || !currentOrderId) return;

  appendOrderAiMessage(currentOrderId, 'user', trimmedQuestion);
  appendOrderAiMessage(currentOrderId, 'assistant', buildOrderAssistantReply(currentOrder, trimmedQuestion));
  renderOrderAiThread(currentOrderId);

  const input = document.getElementById('order-ai-input');
  if (input) {
    input.value = '';
    input.focus();
  }
}

function renderOrderChatMessages(messages) {
  const thread = document.getElementById('order-chat-thread');
  const currentUser = auth.currentUser;
  if (!thread) return;

  if (!messages.length) {
    thread.innerHTML = '<div class="chat-empty">No messages yet. Send the first update for this order.</div>';
    return;
  }

  thread.innerHTML = messages.map((message) => {
    const isOwn = currentUser && message.senderId === currentUser.uid;
    const senderLabel = isOwn ? 'You' : (message.senderRole === 'admin' ? 'Admin' : 'Customer');

    return `
      <div class="chat-message ${isOwn ? 'chat-own' : 'chat-other'}">
        <div class="chat-meta">
          <span>${escapeHtml(senderLabel)}</span>
          <span>${escapeHtml(formatChatTimestamp(message.createdAt))}</span>
        </div>
        <div class="chat-body">${escapeHtml(message.message || '')}</div>
      </div>
    `;
  }).join('');

  thread.scrollTop = thread.scrollHeight;
}

async function loadAdminConversation() {
  const thread = document.getElementById('order-chat-thread');
  if (!thread || !currentOrderId) return;

  thread.innerHTML = '<div class="chat-empty">Loading messages...</div>';

  try {
    const response = await authenticatedFetch(`/orders/${encodeURIComponent(currentOrderId)}/chat`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to load chat' }));
      throw new Error(error.error || 'Failed to load chat');
    }

    const messages = await response.json();
    renderOrderChatMessages(messages);
  } catch (error) {
    thread.innerHTML = `<div class="chat-empty">${escapeHtml(error.message)}</div>`;
  }
}

async function submitAdminChatMessage(event) {
  event.preventDefault();
  if (!currentOrderId) return;

  const form = event.target;
  const input = document.getElementById('order-chat-input');
  const button = form.querySelector('button[type="submit"]');
  const message = input.value.trim();

  if (!message) return;

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Sending...';

  try {
    const response = await authenticatedFetch(`/orders/${encodeURIComponent(currentOrderId)}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to send message' }));
      throw new Error(error.error || 'Failed to send message');
    }

    input.value = '';
    await loadAdminConversation();
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function loadOrderSupportPage() {
  currentOrderId = getQueryOrderId();

  if (!currentOrderId) {
    hideLoadingState();
    showPageMessage('Missing orderId in the page URL.', 'error');
    return;
  }

  try {
    const response = await authenticatedFetch(`/orders/${encodeURIComponent(currentOrderId)}`);
    const order = await response.json();

    if (!response.ok) {
      throw new Error(order.error || 'Failed to load order');
    }

    currentOrder = order;
    renderOrderSummary(order);
    renderOrderAiSuggestions(order);
    renderOrderAiThread(currentOrderId);
    await loadAdminConversation();
    hideLoadingState();
    showContentState();
  } catch (error) {
    hideLoadingState();
    showPageMessage(error.message || 'Failed to load order support details.', 'error');
  }
}

const orderAiForm = document.getElementById('order-ai-form');
if (orderAiForm) {
  orderAiForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.getElementById('order-ai-input');
    const question = input?.value || '';
    if (!question.trim()) return;
    askOrderAssistant(question);
  });
}

const orderAiSuggestions = document.getElementById('order-ai-suggestions');
if (orderAiSuggestions) {
  orderAiSuggestions.addEventListener('click', (event) => {
    const button = event.target.closest('.order-ai-chip');
    if (!button) return;
    askOrderAssistant(button.dataset.question || '');
  });
}

const orderChatForm = document.getElementById('order-chat-form');
if (orderChatForm) {
  orderChatForm.addEventListener('submit', submitAdminChatMessage);
}

const refreshOrderChatButton = document.getElementById('refresh-order-chat-btn');
if (refreshOrderChatButton) {
  refreshOrderChatButton.addEventListener('click', () => {
    loadAdminConversation();
  });
}

if (document.getElementById('order-chat-content')) {
  auth.onAuthStateChanged((user) => {
    if (user) {
      loadOrderSupportPage();
    } else {
      window.location.href = '/login.html';
    }
  });
}
