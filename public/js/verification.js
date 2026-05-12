const OTP_RESEND_COOLDOWN_MS = 2 * 60 * 1000;

function createVerificationImageData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read the selected file.'));
    reader.readAsDataURL(file);
  });
}

async function loadCurrentUserProfile(forceRefresh = false) {
  if (!forceRefresh && window.__currentUserProfileCache) {
    return window.__currentUserProfileCache;
  }

  const response = await authenticatedFetch('/users/me');
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load your profile.');
  }

  window.__currentUserProfileCache = payload;
  return payload;
}

function getVerificationRecord(profile = {}) {
  const status = profile.verificationStatus || (profile.verificationIdUrl ? 'pending' : 'missing');
  const hasUploadedId = Boolean(profile.verificationIdUrl);
  const isApproved = status === 'approved';
  const orderUsedWhilePending = Boolean(profile.verificationOrderUsed);
  const emailVerified = profile.emailVerificationStatus === 'verified';

  return {
    status,
    statusLabel: status === 'approved' ? 'Approved' : (status === 'pending' ? 'Pending Approval' : 'ID Required'),
    hasUploadedId,
    isApproved,
    orderUsedWhilePending,
    emailVerified,
    emailStatusLabel: emailVerified ? 'Verified' : 'Verification Required',
    emailOtpSentAt: profile.emailOtpSentAt || '',
    canPlaceOrder: hasUploadedId && emailVerified && (isApproved || !orderUsedWhilePending),
    imageUrl: profile.verificationDisplayUrl || profile.verificationIdUrl || '',
    thumbUrl: profile.verificationThumbUrl || profile.verificationDisplayUrl || profile.verificationIdUrl || '',
    uploadedAt: profile.verificationUploadedAt || '',
    approvedAt: profile.verificationApprovedAt || '',
    idLabel: profile.verificationIdLabel || 'Government ID',
    blockedReason: !hasUploadedId
      ? 'Upload a valid ID before you can place an order.'
      : (!emailVerified
          ? 'Verify your email with the one-time code before you can place an order.'
          : (isApproved || !orderUsedWhilePending
              ? ''
              : 'Your ID is still pending approval, and your one allowed order has already been used.')),
  };
}

function formatVerificationDate(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function getOtpRemainingMs(sentAt) {
  if (!sentAt) return 0;
  const sentTime = new Date(sentAt).getTime();
  if (!sentTime) return 0;
  return Math.max(0, OTP_RESEND_COOLDOWN_MS - (Date.now() - sentTime));
}

async function uploadVerificationId(file, idLabel = 'Government ID') {
  if (!file) {
    throw new Error('Please choose an ID image first.');
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only JPG, PNG, or WEBP files are allowed.');
  }

  const imageBase64 = await createVerificationImageData(file);
  const response = await authenticatedFetch('/users/me/verification', {
    method: 'POST',
    body: JSON.stringify({
      imageBase64,
      fileName: file.name,
      mimeType: file.type,
      idLabel
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to upload your ID.');
  }

  window.__currentUserProfileCache = payload;
  window.dispatchEvent(new CustomEvent('verification-updated', { detail: payload }));
  return payload;
}

async function sendEmailVerificationOtp() {
  const response = await authenticatedFetch('/users/me/email-verification/send-otp', {
    method: 'POST'
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to send the email verification code.');
  }

  window.__currentUserProfileCache = payload;
  window.dispatchEvent(new CustomEvent('verification-updated', { detail: payload }));
  return payload;
}

async function verifyEmailOtp(code) {
  const response = await authenticatedFetch('/users/me/email-verification/verify', {
    method: 'POST',
    body: JSON.stringify({ code })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to verify the email code.');
  }

  window.__currentUserProfileCache = payload;
  window.dispatchEvent(new CustomEvent('verification-updated', { detail: payload }));
  return payload;
}

window.userVerification = {
  loadCurrentUserProfile,
  getVerificationRecord,
  formatVerificationDate,
  getOtpRemainingMs,
  uploadVerificationId,
  sendEmailVerificationOtp,
  verifyEmailOtp
};
