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

  return {
    status,
    statusLabel: status === 'approved' ? 'Approved' : (status === 'pending' ? 'Pending Approval' : 'ID Required'),
    hasUploadedId,
    isApproved,
    orderUsedWhilePending,
    canPlaceOrder: hasUploadedId && (isApproved || !orderUsedWhilePending),
    imageUrl: profile.verificationDisplayUrl || profile.verificationIdUrl || '',
    thumbUrl: profile.verificationThumbUrl || profile.verificationDisplayUrl || profile.verificationIdUrl || '',
    uploadedAt: profile.verificationUploadedAt || '',
    approvedAt: profile.verificationApprovedAt || '',
    idLabel: profile.verificationIdLabel || 'Government ID',
    blockedReason: !hasUploadedId
      ? 'Upload a valid ID before you can place an order.'
      : (isApproved || !orderUsedWhilePending
          ? ''
          : 'Your ID is still pending approval, and your one allowed order has already been used.')
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

window.userVerification = {
  loadCurrentUserProfile,
  getVerificationRecord,
  formatVerificationDate,
  uploadVerificationId
};
