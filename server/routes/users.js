const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const db = admin.firestore();

function sanitizeUser(doc) {
  const data = doc.data() || {};
  const { password, ...safeData } = data;
  return { id: doc.id, ...safeData };
}

function buildVerificationResetFields() {
  return {
    verificationStatus: 'missing',
    verificationIdUrl: admin.firestore.FieldValue.delete(),
    verificationDisplayUrl: admin.firestore.FieldValue.delete(),
    verificationThumbUrl: admin.firestore.FieldValue.delete(),
    verificationDeleteUrl: admin.firestore.FieldValue.delete(),
    verificationFileName: admin.firestore.FieldValue.delete(),
    verificationMimeType: admin.firestore.FieldValue.delete(),
    verificationIdLabel: admin.firestore.FieldValue.delete(),
    verificationUploadedAt: admin.firestore.FieldValue.delete(),
    verificationApprovedAt: admin.firestore.FieldValue.delete(),
    verificationApprovedBy: admin.firestore.FieldValue.delete(),
    verificationRejectedAt: admin.firestore.FieldValue.delete(),
    verificationRejectedBy: admin.firestore.FieldValue.delete(),
    verificationOrderUsed: false
  };
}

function buildEmailVerificationResetFields() {
  return {
    emailVerificationStatus: 'pending',
    emailVerifiedAt: admin.firestore.FieldValue.delete(),
    emailOtpCode: admin.firestore.FieldValue.delete(),
    emailOtpExpiresAt: admin.firestore.FieldValue.delete(),
    emailOtpSentAt: admin.firestore.FieldValue.delete(),
    emailOtpLastEmailId: admin.firestore.FieldValue.delete()
  };
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function buildOtpEmailHtml({ code, fullName }) {
  const safeName = fullName ? `${fullName},` : 'Hello,';
  return `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
      <p>${safeName}</p>
      <p>Your Momoy's Furniture verification code is:</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 12px 18px; background: #fff7e6; border: 1px solid #facc15; display: inline-block; border-radius: 12px;">
        ${code}
      </div>
      <p style="margin-top: 16px;">This code expires in 10 minutes.</p>
      <p>If you did not request this code, you can ignore this email.</p>
    </div>
  `;
}

async function sendResendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    const error = new Error('Email verification is not configured on the server. Please set RESEND_API_KEY and RESEND_FROM_EMAIL.');
    error.status = 500;
    throw error;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.id) {
    const error = new Error(payload?.message || payload?.error || 'Failed to send email verification code.');
    error.status = 502;
    throw error;
  }

  return payload.id;
}

async function uploadToImgBb({ imageBase64, fileName, mimeType }) {
  const apiKey = process.env.IMGBB_API_KEY;

  if (!apiKey) {
    const error = new Error('ID upload is not configured on the server. Please set IMGBB_API_KEY.');
    error.status = 500;
    throw error;
  }

  const cleanedImage = String(imageBase64 || '').replace(/^data:[^;]+;base64,/, '');
  const body = new URLSearchParams({
    image: cleanedImage,
    name: fileName || `verification-${Date.now()}`
  });

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success || !payload?.data?.url) {
    const error = new Error(payload?.error?.message || 'Failed to upload ID image to ImgBB.');
    error.status = 502;
    throw error;
  }

  return {
    verificationStatus: 'pending',
    verificationIdUrl: payload.data.url,
    verificationDisplayUrl: payload.data.display_url || payload.data.url,
    verificationThumbUrl: payload.data.thumb?.url || payload.data.medium?.url || payload.data.display_url || payload.data.url,
    verificationDeleteUrl: payload.data.delete_url || null,
    verificationFileName: fileName || `verification-${Date.now()}`,
    verificationMimeType: mimeType || 'image/jpeg',
    verificationUploadedAt: new Date().toISOString(),
    verificationApprovedAt: null,
    verificationApprovedBy: null,
    verificationRejectedAt: null,
    verificationRejectedBy: null,
    verificationOrderUsed: false
  };
}

// Get all users (Admin only)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = [];

    snapshot.forEach(doc => {
      users.push(sanitizeUser(doc));
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.user.uid).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json(sanitizeUser(doc));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload current user verification ID
router.post('/me/verification', verifyToken, async (req, res) => {
  try {
    const { imageBase64, fileName, mimeType, idLabel } = req.body || {};
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userData = userDoc.data() || {};
    if (userData.verificationIdUrl) {
      return res.status(409).json({ error: 'A verification ID is already on file. Please contact an admin if you need it reset.' });
    }

    if (!imageBase64 || !mimeType || !/^image\/(jpeg|jpg|png|webp)$/i.test(mimeType)) {
      return res.status(400).json({ error: 'Please upload a valid JPG, PNG, or WEBP image.' });
    }

    const uploadData = await uploadToImgBb({ imageBase64, fileName, mimeType });
    const updateData = {
      ...uploadData,
      verificationIdLabel: String(idLabel || 'Government ID').trim().slice(0, 80) || 'Government ID',
      updatedAt: new Date().toISOString()
    };

    await userRef.set(updateData, { merge: true });
    const updatedDoc = await userRef.get();
    res.status(201).json(sanitizeUser(updatedDoc));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Send email verification OTP
router.post('/me/email-verification/send-otp', verifyToken, async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userData = userDoc.data() || {};
    const email = userData.email || req.user.email;
    if (!email) {
      return res.status(400).json({ error: 'No email address is available for this account.' });
    }

    if (userData.emailVerificationStatus === 'verified') {
      return res.json(sanitizeUser(userDoc));
    }

    const lastSentAt = userData.emailOtpSentAt ? new Date(userData.emailOtpSentAt).getTime() : 0;
    if (lastSentAt && (Date.now() - lastSentAt) < 60 * 1000) {
      return res.status(429).json({ error: 'Please wait at least 1 minute before requesting another code.' });
    }

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + (10 * 60 * 1000)).toISOString();
    const emailId = await sendResendEmail({
      to: email,
      subject: 'Your Momoy\'s Furniture verification code',
      html: buildOtpEmailHtml({ code, fullName: userData.fullName || '' })
    });

    await userRef.set({
      emailVerificationStatus: 'pending',
      emailOtpCode: code,
      emailOtpExpiresAt: expiresAt,
      emailOtpSentAt: new Date().toISOString(),
      emailOtpLastEmailId: emailId,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const updatedDoc = await userRef.get();
    res.json(sanitizeUser(updatedDoc));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Verify email OTP
router.post('/me/email-verification/verify', verifyToken, async (req, res) => {
  try {
    const code = String(req.body?.code || '').trim();
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit verification code.' });
    }

    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userData = userDoc.data() || {};
    if (userData.emailVerificationStatus === 'verified') {
      return res.json(sanitizeUser(userDoc));
    }

    const expiresAt = userData.emailOtpExpiresAt ? new Date(userData.emailOtpExpiresAt).getTime() : 0;
    if (!userData.emailOtpCode || !expiresAt) {
      return res.status(400).json({ error: 'No verification code has been sent yet.' });
    }

    if (Date.now() > expiresAt) {
      return res.status(400).json({ error: 'This verification code has expired. Please request a new one.' });
    }

    if (userData.emailOtpCode !== code) {
      return res.status(400).json({ error: 'The verification code is incorrect.' });
    }

    await userRef.set({
      emailVerificationStatus: 'verified',
      emailVerifiedAt: new Date().toISOString(),
      emailOtpCode: admin.firestore.FieldValue.delete(),
      emailOtpExpiresAt: admin.firestore.FieldValue.delete(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const updatedDoc = await userRef.get();
    res.json(sanitizeUser(updatedDoc));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single user (Admin only)
router.get('/:id', verifyAdmin, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(sanitizeUser(doc));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve verification ID (Admin only)
router.put('/:id/verification/approve', verifyAdmin, async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.params.id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data() || {};
    if (!userData.verificationIdUrl) {
      return res.status(400).json({ error: 'This user has not uploaded an ID yet.' });
    }

    await userRef.set({
      verificationStatus: 'approved',
      verificationApprovedAt: new Date().toISOString(),
      verificationApprovedBy: req.user.uid,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const updatedDoc = await userRef.get();
    res.json(sanitizeUser(updatedDoc));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete verification ID (Admin only)
router.delete('/:id/verification', verifyAdmin, async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.params.id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data() || {};
    if (userData.verificationDeleteUrl) {
      fetch(userData.verificationDeleteUrl).catch((error) => {
        console.warn('Failed to delete ImgBB verification image:', error.message);
      });
    }

    await userRef.set({
      ...buildVerificationResetFields(),
      verificationRejectedAt: new Date().toISOString(),
      verificationRejectedBy: req.user.uid,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const updatedDoc = await userRef.get();
    res.json(sanitizeUser(updatedDoc));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (Admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    await db.collection('users').doc(req.params.id).delete();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
