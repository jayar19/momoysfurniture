const metricConfigs = {
  'total-earned': {
    title: 'Total Earned',
    description: 'Revenue from orders that have already been delivered or marked completed.',
    load: loadOrders,
    getItems: orders => orders.filter(o => o.deliveryStatus === 'delivered' || o.status === 'completed'),
    summaryLabel: 'Revenue Total',
    summaryValue: items => formatPeso(sumBy(items, 'totalAmount')),
    secondaryLabel: 'Eligible Orders',
    secondaryValue: items => items.length,
    tableTitle: 'Delivered / Completed Orders',
    columns: ['Order', 'Created', 'Total', 'Payment', 'Delivery', 'Action'],
    renderRow: orderRow
  },
  'completed-purchase': {
    title: 'Completed Purchase',
    description: 'Orders whose payment has already been fully settled.',
    load: loadOrders,
    getItems: orders => orders.filter(o => o.paymentStatus === 'paid' || o.paymentStatus === 'fully_paid'),
    summaryLabel: 'Completed Purchases',
    summaryValue: items => items.length,
    secondaryLabel: 'Collected Value',
    secondaryValue: items => formatPeso(sumBy(items, 'totalAmount')),
    tableTitle: 'Fully Paid Orders',
    columns: ['Order', 'Created', 'Total', 'Payment', 'Delivery', 'Action'],
    renderRow: orderRow
  },
  'receivable-amount': {
    title: 'Receivable Amount',
    description: 'Outstanding balances that are still collectible from active orders.',
    load: loadOrders,
    getItems: orders => orders.filter(o => o.status !== 'cancelled' && o.deliveryStatus !== 'cancelled' && (o.remainingBalance || 0) > 0),
    summaryLabel: 'Outstanding Total',
    summaryValue: items => formatPeso(sumBy(items, 'remainingBalance')),
    secondaryLabel: 'Orders with Balance',
    secondaryValue: items => items.length,
    tableTitle: 'Orders with Remaining Balance',
    columns: ['Order', 'Created', 'Remaining', 'Down Payment', 'Delivery', 'Action'],
    renderRow: order => `
      <tr>
        <td>#${shortId(order.id)}</td>
        <td>${formatDate(order.createdAt)}</td>
        <td>${formatPeso(order.remainingBalance || 0)}</td>
        <td>${formatPeso(order.downPayment || 0)}</td>
        <td>${humanize(order.deliveryStatus)}</td>
        <td><a class="btn btn-secondary" href="/admin/manage-orders.html">Manage Orders</a></td>
      </tr>
    `
  },
  'approved-orders': {
    title: 'Approved Orders',
    description: 'Orders that have already been confirmed in the admin workflow.',
    load: loadOrders,
    getItems: orders => orders.filter(o => o.status === 'confirmed' || o.deliveryStatus === 'confirmed'),
    summaryLabel: 'Approved Orders',
    summaryValue: items => items.length,
    secondaryLabel: 'Order Value',
    secondaryValue: items => formatPeso(sumBy(items, 'totalAmount')),
    tableTitle: 'Confirmed Orders',
    columns: ['Order', 'Created', 'Total', 'Payment', 'Delivery', 'Action'],
    renderRow: orderRow
  },
  'completed-orders': {
    title: 'Completed Orders',
    description: 'Orders that have already reached the delivered or completed stage.',
    load: loadOrders,
    getItems: orders => orders.filter(o => o.deliveryStatus === 'delivered' || o.status === 'completed'),
    summaryLabel: 'Completed Orders',
    summaryValue: items => items.length,
    secondaryLabel: 'Completed Value',
    secondaryValue: items => formatPeso(sumBy(items, 'totalAmount')),
    tableTitle: 'Completed Order Records',
    columns: ['Order', 'Created', 'Total', 'Payment', 'Delivery', 'Action'],
    renderRow: orderRow
  },
  'pending-orders': {
    title: 'Pending Orders',
    description: 'Orders that are still waiting in the early stages of processing.',
    load: loadOrders,
    getItems: orders => orders.filter(o => o.status === 'pending' || o.deliveryStatus === 'processing'),
    summaryLabel: 'Pending Orders',
    summaryValue: items => items.length,
    secondaryLabel: 'Pending Value',
    secondaryValue: items => formatPeso(sumBy(items, 'totalAmount')),
    tableTitle: 'Orders Awaiting Progress',
    columns: ['Order', 'Created', 'Total', 'Payment', 'Delivery', 'Action'],
    renderRow: orderRow
  },
  'listed-products': {
    title: 'Listed Products',
    description: 'All products currently available in the admin catalog.',
    load: loadProducts,
    getItems: items => items,
    summaryLabel: 'Total Products',
    summaryValue: items => items.length,
    secondaryLabel: 'Total Stock',
    secondaryValue: items => items.reduce((sum, item) => sum + (Number(item.stock) || 0), 0),
    tableTitle: 'Product Catalog',
    columns: ['Product', 'Category', 'Price', 'Stock', '3D Model', 'Action'],
    renderRow: product => `
      <tr>
        <td>${escapeHtml(product.name || '')}</td>
        <td>${escapeHtml(product.category || '')}</td>
        <td>${formatPeso(product.price || 0)}</td>
        <td>${product.stock ?? 0}</td>
        <td>${product.modelUrl ? 'Yes' : 'No'}</td>
        <td><a class="btn btn-secondary" href="/admin/edit-product.html?id=${product.id}">Edit Product</a></td>
      </tr>
    `
  },
  'listed-brands': {
    title: 'Listed Brands',
    description: 'Brand records that support catalog organization and presentation.',
    load: loadBrands,
    getItems: items => items,
    summaryLabel: 'Total Brands',
    summaryValue: items => items.length,
    secondaryLabel: 'With Logo',
    secondaryValue: items => items.filter(item => item.logoUrl).length,
    tableTitle: 'Brand Directory',
    columns: ['Brand', 'Description', 'Logo', 'Created'],
    renderRow: brand => `
      <tr>
        <td>${escapeHtml(brand.name || '')}</td>
        <td>${escapeHtml((brand.description || '').slice(0, 90) || 'No description')}</td>
        <td>${brand.logoUrl ? 'Available' : 'None'}</td>
        <td>${formatDate(brand.createdAt)}</td>
      </tr>
    `
  },
  'registered-users': {
    title: 'Registered Users',
    description: 'Customer and admin accounts currently stored in the system.',
    load: loadUsers,
    getItems: items => items,
    summaryLabel: 'Registered Users',
    summaryValue: items => items.length,
    secondaryLabel: 'Admins',
    secondaryValue: items => items.filter(item => item.role === 'admin').length,
    tableTitle: 'User Accounts',
    columns: ['Name', 'Email', 'Role', 'Created'],
    renderRow: user => `
      <tr>
        <td>${escapeHtml(user.fullName || 'No name')}</td>
        <td>${escapeHtml(user.email || '')}</td>
        <td>${escapeHtml(user.role || 'customer')}</td>
        <td>${formatDate(user.createdAt)}</td>
      </tr>
    `
  },
  'queries': {
    title: 'Queries',
    description: 'Incoming customer concerns and messages submitted through the site.',
    load: loadQueries,
    getItems: items => items,
    summaryLabel: 'Total Queries',
    summaryValue: items => items.length,
    secondaryLabel: 'Unread',
    secondaryValue: items => items.filter(item => item.status === 'unread').length,
    tableTitle: 'Submitted Queries',
    columns: ['Name', 'Email', 'Subject', 'Status', 'Created'],
    renderRow: query => `
      <tr>
        <td>${escapeHtml(query.name || '')}</td>
        <td>${escapeHtml(query.email || '')}</td>
        <td>${escapeHtml(query.subject || 'General')}</td>
        <td>${escapeHtml(query.status || 'unread')}</td>
        <td>${formatDate(query.createdAt)}</td>
      </tr>
    `
  },
  'testimonials': {
    title: 'Testimonials',
    description: 'Customer feedback records, including both approved and pending submissions.',
    load: loadTestimonials,
    getItems: items => items,
    summaryLabel: 'Total Testimonials',
    summaryValue: items => items.length,
    secondaryLabel: 'Approved',
    secondaryValue: items => items.filter(item => item.approved).length,
    tableTitle: 'Feedback Records',
    columns: ['Name', 'Rating', 'Status', 'Message', 'Created'],
    renderRow: item => `
      <tr>
        <td>${escapeHtml(item.name || '')}</td>
        <td>${item.rating || '-'}</td>
        <td>${item.approved ? 'Approved' : 'Pending'}</td>
        <td>${escapeHtml((item.message || '').slice(0, 100))}</td>
        <td>${formatDate(item.createdAt)}</td>
      </tr>
    `
  }
};

function orderRow(order) {
  return `
    <tr>
      <td>#${shortId(order.id)}</td>
      <td>${formatDate(order.createdAt)}</td>
      <td>${formatPeso(order.totalAmount || 0)}</td>
      <td>${humanize(order.paymentStatus)}</td>
      <td>${humanize(order.deliveryStatus)}</td>
      <td><a class="btn btn-secondary" href="/admin/manage-orders.html">Manage Orders</a></td>
    </tr>
  `;
}

function sumBy(items, key) {
  return items.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
}

function formatPeso(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function shortId(value = '') {
  return String(value).slice(0, 8);
}

function humanize(value = '') {
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
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

async function loadOrders() {
  const response = await authenticatedFetch(`${API_BASE_URL}/orders`);
  if (!response.ok) throw new Error('Failed to load orders');
  return response.json();
}

async function loadProducts() {
  const response = await authenticatedFetch(`${API_BASE_URL}/products`);
  if (!response.ok) throw new Error('Failed to load products');
  return response.json();
}

async function loadBrands() {
  const response = await authenticatedFetch(`${API_BASE_URL}/brands`);
  if (!response.ok) throw new Error('Failed to load brands');
  return response.json();
}

async function loadUsers() {
  const response = await authenticatedFetch(`${API_BASE_URL}/users`);
  if (!response.ok) throw new Error('Failed to load users');
  return response.json();
}

async function loadQueries() {
  const response = await authenticatedFetch(`${API_BASE_URL}/queries`);
  if (!response.ok) throw new Error('Failed to load queries');
  return response.json();
}

async function loadTestimonials() {
  const response = await authenticatedFetch(`${API_BASE_URL}/testimonials?all=true`);
  if (!response.ok) throw new Error('Failed to load testimonials');
  return response.json();
}

function renderMetricPage(config, items) {
  document.getElementById('metric-title').textContent = config.title;
  document.getElementById('metric-description').textContent = config.description;
  document.getElementById('metric-summary-label').textContent = config.summaryLabel;
  document.getElementById('metric-summary-value').textContent = config.summaryValue(items);
  document.getElementById('metric-secondary-label').textContent = config.secondaryLabel;
  document.getElementById('metric-secondary-value').textContent = config.secondaryValue(items);
  document.getElementById('metric-table-title').textContent = config.tableTitle;

  const head = document.getElementById('metric-table-head');
  head.innerHTML = `<tr>${config.columns.map(col => `<th>${col}</th>`).join('')}</tr>`;

  const body = document.getElementById('metric-table-body');
  if (!items.length) {
    body.innerHTML = `<tr><td colspan="${config.columns.length}" style="text-align:center;">No records found.</td></tr>`;
    return;
  }

  body.innerHTML = items.map(config.renderRow).join('');
}

async function initializeMetricPage() {
  const metric = new URLSearchParams(window.location.search).get('metric');
  const config = metricConfigs[metric];
  const errorEl = document.getElementById('metric-error');
  const contentEl = document.getElementById('metric-content');

  if (!config) {
    errorEl.textContent = 'Unknown dashboard metric.';
    errorEl.style.display = 'block';
    return;
  }

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = '/login.html';
      return;
    }

    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      const isAdmin = userDoc.exists && userDoc.data().role === 'admin';

      if (!isAdmin) {
        alert('Access denied. Admin only.');
        window.location.href = '/';
        return;
      }

      const rawItems = await config.load();
      const items = config.getItems(rawItems);
      renderMetricPage(config, items);
      contentEl.style.display = 'block';
    } catch (error) {
      errorEl.textContent = error.message || 'Failed to load metric details.';
      errorEl.style.display = 'block';
    }
  });
}

document.addEventListener('DOMContentLoaded', initializeMetricPage);
