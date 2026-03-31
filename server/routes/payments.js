const express = require('express');
const https = require('https');
const crypto = require('crypto');
const router = express.Router();
const admin = require('firebase-admin');
const { verifyToken } = require('../middleware/auth');

const db = admin.firestore();
const PAYMONGO_API_BASE = 'https://api.paymongo.com/v1';

function isOrderSettled(order) {
  return order.paymentStatus === 'down_payment_paid' || order.paymentStatus === 'fully_paid' || order.paymentStatus === 'paid';
}

function getPayMongoSecretKey() {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    throw new Error('PAYMONGO_SECRET_KEY is not configured');
  }
  return secretKey;
}

function getAppBaseUrl(req) {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, '');
  }
  return `${req.protocol}://${req.get('host')}`;
}

function toCentavos(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Invalid payment amount');
  }
  return Math.round(value * 100);
}

function parseJsonSafe(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function paymongoRequest(method, path, payload) {
  const body = payload ? JSON.stringify(payload) : null;
  const secretKey = getPayMongoSecretKey();

  return new Promise((resolve, reject) => {
    const request = https.request(`${PAYMONGO_API_BASE}${path}`, {
      method,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        ...(body ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        } : {})
      }
    }, (response) => {
      let responseText = '';

      response.on('data', (chunk) => {
        responseText += chunk;
      });

      response.on('end', () => {
        const parsed = responseText ? parseJsonSafe(responseText) : null;
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(parsed);
          return;
        }

        const apiMessage = parsed && parsed.errors && parsed.errors[0] && parsed.errors[0].detail;
        const error = new Error(apiMessage || `PayMongo request failed with status ${response.statusCode}`);
        error.statusCode = response.statusCode;
        error.payload = parsed;
        reject(error);
      });
    });

    request.on('error', reject);
    if (body) {
      request.write(body);
    }
    request.end();
  });
}

function getCheckoutSessionAttributes(sessionPayload) {
  return sessionPayload && sessionPayload.data && sessionPayload.data.attributes
    ? sessionPayload.data.attributes
    : null;
}

function getCheckoutSessionMetadata(sessionPayload) {
  const attributes = getCheckoutSessionAttributes(sessionPayload);
  return attributes && attributes.metadata ? attributes.metadata : {};
}

async function finalizePaymongoDownPayment({ orderId, checkoutSessionId, checkoutSessionPayload, source }) {
  let resolvedOrderId = orderId;
  if (!resolvedOrderId) {
    const metadata = getCheckoutSessionMetadata(checkoutSessionPayload);
    resolvedOrderId = metadata.orderId;
  }

  if (!resolvedOrderId) {
    throw new Error('Unable to resolve orderId for checkout session');
  }

  const orderRef = db.collection('orders').doc(resolvedOrderId);
  const paymentRef = db.collection('payments').doc(`paymongo_${checkoutSessionId}`);
  const sessionAttributes = getCheckoutSessionAttributes(checkoutSessionPayload) || {};
  const paymentRecords = Array.isArray(sessionAttributes.payments) ? sessionAttributes.payments : [];
  const paymongoPayment = paymentRecords[0] || null;
  const paidAmount = paymongoPayment && paymongoPayment.attributes && Number.isFinite(paymongoPayment.attributes.amount)
    ? paymongoPayment.attributes.amount / 100
    : null;
  const settledAt = paymongoPayment && paymongoPayment.attributes && paymongoPayment.attributes.paid_at
    ? paymongoPayment.attributes.paid_at
    : new Date().toISOString();

  const transactionResult = await db.runTransaction(async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) {
      throw new Error('Order not found');
    }

    const order = orderDoc.data();
    if (isOrderSettled(order)) {
      transaction.set(orderRef, {
        paymongoCheckoutStatus: 'paid',
        paymongoCheckoutSessionId: checkoutSessionId,
        paymongoLastSyncedAt: new Date().toISOString()
      }, { merge: true });
      return { alreadySettled: true, order };
    }

    const amount = paidAmount || Number(order.downPayment || 0);
    const paymentData = {
      orderId: resolvedOrderId,
      userId: order.userId,
      amount,
      paymentMethod: 'qrph',
      paymentType: 'down_payment',
      status: 'completed',
      provider: 'paymongo',
      providerPaymentId: paymongoPayment ? paymongoPayment.id : null,
      providerCheckoutSessionId: checkoutSessionId,
      providerEventSource: source,
      createdAt: settledAt,
      updatedAt: new Date().toISOString()
    };

    transaction.set(paymentRef, paymentData, { merge: true });
    transaction.set(orderRef, {
      paymentStatus: 'down_payment_paid',
      status: 'confirmed',
      paymongoCheckoutStatus: 'paid',
      paymongoCheckoutSessionId: checkoutSessionId,
      paymongoPaidAt: settledAt,
      paymongoLastSyncedAt: new Date().toISOString()
    }, { merge: true });

    return { alreadySettled: false, order, paymentData };
  });

  return transactionResult;
}

function verifyWebhookSignature(rawBody, signatureHeader, livemode) {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('PAYMONGO_WEBHOOK_SECRET is not configured; skipping webhook signature verification.');
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split(',').reduce((accumulator, part) => {
    const [key, value] = part.split('=');
    if (key && value) {
      accumulator[key.trim()] = value.trim();
    }
    return accumulator;
  }, {});

  if (!parts.t) {
    return false;
  }

  const receivedSignature = livemode ? parts.li : parts.te;
  if (!receivedSignature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${parts.t}.${rawBody}`)
    .digest('hex');

  const signatureBuffer = Buffer.from(receivedSignature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const tolerance = 300;
  if (Math.abs(now - Number(parts.t)) > tolerance) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

router.post('/paymongo/checkout-session', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderDoc.data();
    if (order.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (isOrderSettled(order)) {
      return res.status(400).json({ error: 'Down payment is already settled for this order' });
    }

    const baseUrl = getAppBaseUrl(req);
    const successUrl = `${baseUrl}/payment.html?orderId=${encodeURIComponent(orderId)}&paymongo=success`;
    const cancelUrl = `${baseUrl}/payment.html?orderId=${encodeURIComponent(orderId)}&paymongo=cancelled`;

    const sessionPayload = await paymongoRequest('POST', '/checkout_sessions', {
      data: {
        attributes: {
          billing: {
            name: req.user.name || req.user.email || "Momoy's Furniture Customer",
            email: req.user.email || undefined
          },
          cancel_url: cancelUrl,
          success_url: successUrl,
          description: `Down payment for order ${orderId}`,
          line_items: [{
            currency: 'PHP',
            amount: toCentavos(order.downPayment),
            description: `30% down payment for order ${orderId}`,
            name: "Momoy's Furniture Down Payment",
            quantity: 1
          }],
          metadata: {
            orderId,
            userId: req.user.uid,
            paymentType: 'down_payment'
          },
          payment_method_types: ['qrph'],
          send_email_receipt: false,
          show_description: true,
          show_line_items: true
        }
      }
    });

    const sessionData = sessionPayload && sessionPayload.data ? sessionPayload.data : null;
    const sessionAttributes = getCheckoutSessionAttributes(sessionPayload);
    if (!sessionData || !sessionAttributes || !sessionAttributes.checkout_url) {
      throw new Error('PayMongo did not return a checkout URL');
    }

    await db.collection('orders').doc(orderId).set({
      paymongoCheckoutSessionId: sessionData.id,
      paymongoCheckoutStatus: 'pending',
      paymongoCheckoutUrl: sessionAttributes.checkout_url,
      paymongoCheckoutCreatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    res.status(201).json({
      checkoutSessionId: sessionData.id,
      checkoutUrl: sessionAttributes.checkout_url
    });
  } catch (error) {
    console.error('Create PayMongo checkout session error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Unable to create PayMongo checkout session'
    });
  }
});

router.post('/paymongo/checkout-session/:sessionId/sync', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { orderId } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderDoc.data();
    if (order.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sessionPayload = await paymongoRequest('GET', `/checkout_sessions/${encodeURIComponent(sessionId)}`);
    const sessionAttributes = getCheckoutSessionAttributes(sessionPayload) || {};
    const metadata = getCheckoutSessionMetadata(sessionPayload);
    if (metadata.orderId && metadata.orderId !== orderId) {
      return res.status(400).json({ error: 'Checkout session does not belong to this order' });
    }

    const hasPayment = Array.isArray(sessionAttributes.payments) && sessionAttributes.payments.length > 0;
    if (!hasPayment) {
      await db.collection('orders').doc(orderId).set({
        paymongoCheckoutStatus: sessionAttributes.status || 'pending',
        paymongoLastSyncedAt: new Date().toISOString()
      }, { merge: true });

      return res.json({
        paid: false,
        status: sessionAttributes.status || 'pending'
      });
    }

    const result = await finalizePaymongoDownPayment({
      orderId,
      checkoutSessionId: sessionId,
      checkoutSessionPayload: sessionPayload,
      source: 'sync'
    });

    res.json({
      paid: true,
      alreadySettled: result.alreadySettled,
      status: 'paid'
    });
  } catch (error) {
    console.error('Sync PayMongo checkout session error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Unable to sync PayMongo checkout session'
    });
  }
});

router.post('/paymongo/webhook', async (req, res) => {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
    const signatureHeader = req.get('paymongo-signature');
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const livemode = Boolean(
      payload &&
      payload.data &&
      payload.data.attributes &&
      payload.data.attributes.livemode
    );

    if (!verifyWebhookSignature(rawBody, signatureHeader, livemode)) {
      return res.status(401).json({ error: 'Invalid PayMongo webhook signature' });
    }

    const eventType = payload && payload.data && payload.data.attributes ? payload.data.attributes.type : null;
    const checkoutSessionPayload = payload && payload.data && payload.data.attributes
      ? payload.data.attributes.data
      : null;

    if (eventType === 'checkout_session.payment.paid' && checkoutSessionPayload) {
      const checkoutSessionId = checkoutSessionPayload.id;
      const metadata = getCheckoutSessionMetadata({ data: checkoutSessionPayload });
      await finalizePaymongoDownPayment({
        orderId: metadata.orderId,
        checkoutSessionId,
        checkoutSessionPayload: { data: checkoutSessionPayload },
        source: 'webhook'
      });
    }

    res.json({ received: true });
  } catch (error) {
    console.error('PayMongo webhook error:', error);
    res.status(500).json({ error: error.message || 'Webhook processing failed' });
  }
});

router.post('/down-payment', verifyToken, async (req, res) => {
  try {
    const { orderId, amount, paymentMethod } = req.body;

    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orderDoc.data();

    if (order.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (isOrderSettled(order)) {
      return res.status(400).json({ error: 'Down payment is already settled for this order' });
    }

    const paymentData = {
      orderId,
      userId: req.user.uid,
      amount: parseFloat(amount),
      paymentMethod,
      paymentType: 'down_payment',
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('payments').add(paymentData);

    await db.collection('orders').doc(orderId).update({
      paymentStatus: 'down_payment_paid',
      status: 'confirmed'
    });

    res.status(201).json({ id: docRef.id, ...paymentData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/remaining-balance', verifyToken, async (req, res) => {
  try {
    const { orderId, amount, paymentMethod } = req.body;

    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orderDoc.data();

    if (order.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const paymentData = {
      orderId,
      userId: req.user.uid,
      amount: parseFloat(amount),
      paymentMethod,
      paymentType: 'remaining_balance',
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('payments').add(paymentData);

    await db.collection('orders').doc(orderId).update({
      paymentStatus: 'fully_paid',
      remainingBalance: 0,
      status: 'paid'
    });

    res.status(201).json({ id: docRef.id, ...paymentData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    if (req.user.uid !== req.params.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const snapshot = await db.collection('payments')
      .where('userId', '==', req.params.userId)
      .orderBy('createdAt', 'desc')
      .get();

    const payments = [];
    snapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() });
    });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
