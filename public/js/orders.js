// Load user orders
const ORDER_AI_STORAGE_KEY = 'momoysOrderAiSessions';
let activeOrderChatId = null;
let loadedOrders = [];
let orderAiSessions = loadOrderAiSessions();

async function loadUserOrders() {
  const user = auth.currentUser;

  if (!user) {
    console.log('No user logged in');
    window.location.href = '/login.html';
    return;
  }

  const container = document.getElementById('orders-container');
  container.innerHTML = '<div class="spinner"></div>';

  const url = `/api/orders/user/${user.uid}`;

  console.log('=== Loading Orders Debug ===');
  console.log('User ID:', user.uid);
  console.log('User Email:', user.email);
  console.log('API URL:', url);

  
  try {
    // Get token
    const token = await user.getIdToken();
    console.log('Token obtained:', token ? 'Yes' : 'No');
    
    console.log('API URL:', `/api/orders/user/${user.uid}`);
    console.log('Fetching from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    if (!response.ok) {
      let errorMsg = 'Failed to load orders';
      try {
        const errorData = JSON.parse(responseText);
        errorMsg = errorData.error || errorMsg;
      } catch (e) {
        errorMsg = responseText || errorMsg;
      }
      throw new Error(errorMsg);
    }
    
    const orders = JSON.parse(responseText);
    loadedOrders = Array.isArray(orders) ? orders : [];
    console.log('Orders received:', orders.length);
    console.log('Orders data:', orders);
    
    displayOrders(orders);
  } catch (error) {
    console.error('=== Error Loading Orders ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <div style="background: #fee; border: 1px solid #fcc; border-radius: 10px; padding: 2rem; max-width: 500px; margin: 0 auto;">
          <p style="font-size: 3rem; margin-bottom: 1rem;">⚠️</p>
          <h3 style="color: #e74c3c; margin-bottom: 1rem;">Failed to Load Orders</h3>
          <p style="color: #7f8c8d; margin-bottom: 1rem;">${error.message}</p>
          <p style="color: #95a5a6; font-size: 0.9rem; margin-bottom: 1rem;">Check browser console (F12) for details</p>
          <button class="btn btn-primary" onclick="loadUserOrders()">🔄 Try Again</button>
          <a href="/products.html" class="btn btn-secondary" style="margin-left: 0.5rem;">Browse Products</a>
        </div>
        <div style="margin-top: 2rem; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto; background: #f8f9fa; padding: 1.5rem; border-radius: 10px;">
          <h4 style="margin-bottom: 1rem;">Debug Info:</h4>
          <ul style="line-height: 2; font-family: monospace; font-size: 0.9rem;">
            <li>User ID: ${user.uid}</li>
            <li>API URL: /api/orders/user/${user.uid}</li>
            <li>Error: ${error.message}</li>
          </ul>
        </div>
      </div>
    `;
  }
}

// Display orders
function displayOrders(orders) {
  const container = document.getElementById('orders-container');
  
  if (!container) return;
  loadedOrders = Array.isArray(orders) ? orders : [];
  
  if (orders.length === 0) {
    container.innerHTML = `
      <div class="order-empty">
        <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="opacity: 0.3;">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
        <h2 style="color: #7f8c8d; margin: 1rem 0;">No orders yet</h2>
        <p style="color: #95a5a6; margin-bottom: 2rem;">Start shopping to see your orders here!</p>
        <a href="/products.html" class="btn btn-primary">Browse Products</a>
      </div>
    `;
    return;
  }
  
  container.innerHTML = orders.map(order => {
    const statusInfo = getStatusInfo(order.deliveryStatus);
    const itemsList = order.items.map(item => 
      `<div class="order-item">
        <div>
          <span>${item.productName} <small>(x${item.quantity})</small></span>
          ${item.variantName && item.variantName !== 'Standard' ? 
            `<br><small style="color: #3498db;">📦 ${item.variantName}</small>` : 
            ''}
          ${item.remarks ? 
            `<br><small style="color: #7f8c8d;">💬 ${item.remarks}</small>` : 
            ''}
        </div>
        <strong>₱${(item.price * item.quantity).toLocaleString()}</strong>
      </div>`
    ).join('');
    
    const downPaymentSettled = order.paymentStatus === 'down_payment_paid' || order.paymentStatus === 'fully_paid' || order.paymentStatus === 'paid';
    const fullyPaid = order.paymentStatus === 'fully_paid' || order.paymentStatus === 'paid';
    const paymentBadgeClass = fullyPaid ? 'payment-full' : 'payment-partial';
    const paymentText = fullyPaid
      ? 'Fully Paid'
      : (downPaymentSettled ? 'Down Payment Paid' : 'Down Payment Pending');
    
    return `
      <div class="order-card">
        <div class="order-header">
          <div>
            <h3>Order #${order.id.substring(0, 8)}</h3>
            <p style="color: #7f8c8d; font-size: 0.9rem;">
              ${new Date(order.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <span class="order-status ${statusInfo.class}">${statusInfo.label}</span>
        </div>
        
        ${createTimeline(order.deliveryStatus)}
        
        <div class="order-items-list">
          <strong style="display: block; margin-bottom: 0.5rem;">Items Ordered:</strong>
          ${itemsList}
        </div>
        
        <div style="background: white; padding: 1rem; border-radius: 5px; margin: 1rem 0;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div>
              <p style="color: #7f8c8d; font-size: 0.85rem;">Total Amount</p>
              <p style="font-size: 1.3rem; font-weight: bold; color: #2c3e50;">₱${order.totalAmount.toLocaleString()}</p>
            </div>
            <div>
              <p style="color: #7f8c8d; font-size: 0.85rem;">Down Payment</p>
              <p style="font-size: 1.3rem; font-weight: bold; color: #27ae60;">₱${order.downPayment.toLocaleString()}</p>
            </div>
            <div>
              <p style="color: #7f8c8d; font-size: 0.85rem;">Remaining Balance</p>
              <p style="font-size: 1.3rem; font-weight: bold; color: ${order.remainingBalance > 0 ? '#e67e22' : '#27ae60'};">₱${order.remainingBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #ecf0f1;">
          <div>
            <span class="payment-badge ${paymentBadgeClass}">${paymentText}</span>
            ${order.estimatedDelivery ? `
              <p style="color: #7f8c8d; font-size: 0.85rem; margin-top: 0.5rem;">
                📅 Est. Delivery: ${new Date(order.estimatedDelivery).toLocaleDateString()}
              </p>
            ` : ''}
          </div>
          <div class="order-actions">
            ${!downPaymentSettled ? `
              <a href="/payment.html?orderId=${order.id}" class="btn btn-primary">Pay Down Payment (GCash)</a>
            ` : ''}
            <button class="btn btn-secondary" onclick="openOrderChat('${order.id}')">Chat About Order</button>
            ${order.currentLocation ? `
              <a href="/track-delivery.html?orderId=${order.id}" class="btn btn-primary">📍 Track Delivery</a>
            ` : `
              <button class="btn btn-secondary" disabled style="opacity: 0.6;">Tracking Not Available</button>
            `}
            ${order.remainingBalance > 0 && order.deliveryStatus === 'delivered' ? `
              <button class="btn btn-secondary" onclick="payRemainingBalance('${order.id}', ${order.remainingBalance})">💳 Pay Balance</button>
            ` : ''}
          </div>
        </div>
        
        <details style="margin-top: 1rem;">
          <summary style="cursor: pointer; color: #3498db; font-weight: 600; padding: 0.5rem 0;">View Full Details</summary>
          <div style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 5px;">
            <p><strong>Shipping Address:</strong></p>
            <p style="white-space: pre-line; color: #7f8c8d; margin: 0.5rem 0;">${order.shippingAddress}</p>
            <p style="margin-top: 1rem;"><strong>Order Status:</strong> ${order.status}</p>
            <p><strong>Payment Status:</strong> ${order.paymentStatus.replace('_', ' ')}</p>
          </div>
        </details>
      </div>
    `;
  }).join('');
}

// Get status info
function getStatusInfo(status) {
  const statusMap = {
    'processing': { label: '⏳ Processing', class: 'status-pending' },
    'confirmed': { label: '✓ Confirmed', class: 'status-confirmed' },
    'in_transit': { label: '🚚 In Transit', class: 'status-in-transit' },
    'delivered': { label: '✓ Delivered', class: 'status-delivered' },
    'cancelled': { label: '✗ Cancelled', class: 'status-pending' }
  };
  
  return statusMap[status] || { label: status, class: 'status-pending' };
}

// Create timeline
function createTimeline(currentStatus) {
  const statuses = ['processing', 'confirmed', 'in_transit', 'delivered'];
  const statusLabels = ['Processing', 'Confirmed', 'In Transit', 'Delivered'];
  const currentIndex = statuses.indexOf(currentStatus);
  
  return `
    <div class="order-timeline">
      ${statuses.map((status, index) => {
        let dotClass = '';
        if (index < currentIndex) {
          dotClass = 'active';
        } else if (index === currentIndex) {
          dotClass = 'current';
        }
        
        return `
          <div class="timeline-step">
            <div class="timeline-dot ${dotClass}">${index < currentIndex ? '✓' : index + 1}</div>
            <span class="timeline-label">${statusLabels[index]}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Pay remaining balance
async function payRemainingBalance(orderId, amount) {
  const confirmation = confirm(
    `Confirm Payment\n\n` +
    `Remaining Balance: ₱${amount.toLocaleString()}\n\n` +
    `Are you ready to pay the remaining balance?`
  );
  
  if (!confirmation) return;
  
  try {
    const response = await authenticatedFetch(`/api/payments/remaining-balance`, {
      method: 'POST',
      body: JSON.stringify({
        orderId,
        amount,
        paymentMethod: 'cash'
      })
    });
    
    if (response.ok) {
      alert('✅ Payment successful!\n\nYour order is now fully paid. Thank you for your purchase!');
      loadUserOrders();
      showMessage('Payment completed successfully', 'success');
    } else {
      const error = await response.json();
      alert('❌ Payment failed: ' + error.error);
    }
  } catch (error) {
    console.error('Payment error:', error);
    alert('❌ Payment failed. Please try again or contact support.');
  }
}

// Show message
function showMessage(message, type) {
  const messageDiv = document.getElementById('message');
  if (!messageDiv) return;
  
  messageDiv.className = `alert alert-${type === 'success' ? 'success' : 'error'}`;
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 3000);
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

function getOrderById(orderId) {
  return loadedOrders.find((order) => order.id === orderId) || null;
}

function formatPeso(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(Number(value) || 0);
}

function toTitleCase(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatOrderStatusText(order) {
  if (!order) return 'Unknown';
  const statusInfo = getStatusInfo(order.deliveryStatus);
  return statusInfo.label.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function summarizeOrderItems(order) {
  if (!order?.items?.length) return 'No items were found on this order.';

  return order.items
    .map((item) => {
      const variant = item.variantName && item.variantName !== 'Standard'
        ? ` (${item.variantName})`
        : '';
      return `${item.productName} x${item.quantity}${variant}`;
    })
    .join(', ');
}

function getOrderAiSuggestions(order) {
  const suggestions = [
    'What is my order status?',
    'When will this be delivered?',
    'How much do I still need to pay?',
    'What items are in this order?'
  ];

  if (order?.currentLocation || order?.deliveryStatus === 'in_transit') {
    suggestions.unshift('Where is my order right now?');
  }

  return suggestions.slice(0, 5);
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
    thread.innerHTML = '<div class="chat-empty">Ask a question and the assistant will answer using this order\'s current details.</div>';
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

function buildOrderAssistantReply(order, question) {
  if (!order) {
    return 'I could not find the latest details for this order. Please refresh the page and try again.';
  }

  const normalizedQuestion = String(question || '').toLowerCase();
  const statusText = formatOrderStatusText(order);
  const deliveryDate = order.estimatedDelivery
    ? new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;
  const paymentStatus = toTitleCase(order.paymentStatus || 'pending');
  const remainingBalance = Number(order.remainingBalance) || 0;
  const downPaymentSettled = order.paymentStatus === 'down_payment_paid' || order.paymentStatus === 'fully_paid' || order.paymentStatus === 'paid';
  const fullyPaid = order.paymentStatus === 'fully_paid' || order.paymentStatus === 'paid';
  const itemsSummary = summarizeOrderItems(order);

  if (/(where|track|location|driver|map)/.test(normalizedQuestion)) {
    if (order.currentLocation) {
      return `Your order is currently marked as ${statusText}. Live delivery tracking is available for this order, so you can use the Track Delivery button for the latest location update.`;
    }

    if (order.deliveryStatus === 'in_transit') {
      return 'Your order is already in transit, but a live location has not been shared yet. Send a message to the admin below if you need the latest delivery update.';
    }

    return `Your order is currently ${statusText}. Tracking becomes available once the delivery team shares a live location for this order.`;
  }

  if (/(when|deliver|delivery|arrive|arrival|eta)/.test(normalizedQuestion)) {
    if (deliveryDate) {
      return `The current estimated delivery date for this order is ${deliveryDate}. Its present delivery stage is ${statusText}.`;
    }

    if (order.deliveryStatus === 'delivered') {
      return 'This order is already marked as delivered.';
    }

    return `This order is currently ${statusText}. A delivery date has not been posted yet, so the admin will need to confirm the schedule if you need a more exact timeline.`;
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
    return `Your order status is ${toTitleCase(order.status || 'pending')} and the delivery stage is ${statusText}.${deliveryLine}`;
  }

  if (/(item|product|ordered|order details|what did i order|include)/.test(normalizedQuestion)) {
    return `This order includes ${itemsSummary}. The total order amount is ${formatPeso(order.totalAmount)}.`;
  }

  if (/(address|shipping|deliver to|location change|change address)/.test(normalizedQuestion)) {
    const address = order.shippingAddress || 'No shipping address is currently saved for this order.';
    return `The shipping address on this order is: ${address} If you need to change it, please message the admin below so they can confirm whether the update is still possible.`;
  }

  if (/(cancel|refund|return|change order|edit order|reschedule|move delivery)/.test(normalizedQuestion)) {
    return 'Requests like cancellations, returns, schedule changes, or order edits usually need manual approval. Please send the details to the admin in the order conversation below.';
  }

  if (/(contact|admin|support|message|talk to someone)/.test(normalizedQuestion)) {
    return 'You can send a message in the admin conversation below. That thread is saved under this order so the store can reply with order-specific help.';
  }

  return `Here is a quick summary: this order is currently ${statusText}, the payment status is ${paymentStatus}, and the remaining balance is ${formatPeso(remainingBalance)}. You can ask me about delivery, tracking, payment, address, or the items in this order.`;
}

function askOrderAssistant(question) {
  if (!activeOrderChatId) return;

  const trimmedQuestion = String(question || '').trim();
  if (!trimmedQuestion) {
    alert('Type a question first so the assistant has something to answer.');
    return;
  }

  const order = getOrderById(activeOrderChatId);
  appendOrderAiMessage(activeOrderChatId, 'user', trimmedQuestion);
  appendOrderAiMessage(activeOrderChatId, 'assistant', buildOrderAssistantReply(order, trimmedQuestion));
  renderOrderAiThread(activeOrderChatId);

  const input = document.getElementById('order-chat-input');
  if (input) {
    input.value = '';
    input.focus();
  }
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

function renderOrderChatMessages(messages) {
  const thread = document.getElementById('order-chat-thread');
  const currentUser = auth.currentUser;
  if (!thread) return;

  if (!messages.length) {
    thread.innerHTML = '<div class="chat-empty">No messages yet. Start the conversation for this order.</div>';
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

async function loadOrderChat(orderId) {
  const thread = document.getElementById('order-chat-thread');
  if (!thread) return;

  thread.innerHTML = '<div class="chat-empty">Loading messages...</div>';

  try {
    const response = await authenticatedFetch(`/orders/${orderId}/chat`);
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

async function openOrderChat(orderId) {
  activeOrderChatId = orderId;

  const modal = document.getElementById('order-chat-modal');
  const title = document.getElementById('order-chat-title');
  const subtitle = document.getElementById('order-chat-subtitle');
  const input = document.getElementById('order-chat-input');

  if (!modal || !title || !subtitle || !input) return;

  title.textContent = `Order Chat #${orderId.substring(0, 8)}`;
  subtitle.textContent = 'Ask the order assistant for quick answers or message the admin for custom help.';
  input.value = '';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  renderOrderAiSuggestions(getOrderById(orderId));
  renderOrderAiThread(orderId);
  await loadOrderChat(orderId);
  input.focus();
}

function closeOrderChat() {
  const modal = document.getElementById('order-chat-modal');
  if (!modal) return;

  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  activeOrderChatId = null;

  const suggestionsContainer = document.getElementById('order-ai-suggestions');
  const thread = document.getElementById('order-ai-thread');
  if (suggestionsContainer) suggestionsContainer.innerHTML = '';
  if (thread) {
    thread.innerHTML = '<div class="chat-empty">Ask a question and the assistant will answer using this order\'s current details.</div>';
  }
}

async function submitOrderChatMessage(event) {
  event.preventDefault();
  if (!activeOrderChatId) return;

  const input = document.getElementById('order-chat-input');
  const button = event.target.querySelector('button[type="submit"]');
  const message = input.value.trim();

  if (!message) return;

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Sending...';

  try {
    const response = await authenticatedFetch(`/orders/${activeOrderChatId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to send message' }));
      throw new Error(error.error || 'Failed to send message');
    }

    input.value = '';
    await loadOrderChat(activeOrderChatId);
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

const orderChatModal = document.getElementById('order-chat-modal');
if (orderChatModal) {
  orderChatModal.addEventListener('click', (event) => {
    if (event.target === orderChatModal) closeOrderChat();
  });
}

const orderChatForm = document.getElementById('order-chat-form');
if (orderChatForm) {
  orderChatForm.addEventListener('submit', submitOrderChatMessage);
}

const orderChatAiButton = document.getElementById('order-chat-ai-btn');
if (orderChatAiButton) {
  orderChatAiButton.addEventListener('click', () => {
    const input = document.getElementById('order-chat-input');
    askOrderAssistant(input?.value || '');
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

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.getElementById('order-chat-modal')?.classList.contains('open')) {
    closeOrderChat();
  }
});

// Initialize - wait for backend and auth
if (document.getElementById('orders-container')) {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      // Wait for backend to be ready
      if (typeof waitForBackend === 'function') {
        console.log('Waiting for backend before loading orders...');
        await waitForBackend();
      }
      console.log('Loading orders...');
      loadUserOrders();
    } else {
      window.location.href = '/login.html';
    }
  });
}
