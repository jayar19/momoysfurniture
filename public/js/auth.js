// Register user
async function registerUser(email, password, fullName) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Create user document in Firestore
    await db.collection('users').doc(user.uid).set({
      email: email,
      fullName: fullName,
      role: 'user',
      createdAt: new Date().toISOString()
    });

    return { success: true, user };
  } catch (error) {
    return { success: false, error: friendlyAuthError(error.code) };
  }
}

// Login user
async function loginUser(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: friendlyAuthError(error.code) };
  }
}

// Logout user
async function logoutUser() {
  try {
    await auth.signOut();
    window.location.href = '/';
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Check if user is admin
async function isAdmin() {
  const user = auth.currentUser;
  if (!user) return false;

  try {
    const userDoc = await db.collection('users').doc(user.uid).get();
    return userDoc.exists && userDoc.data().role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// Protect admin pages
async function protectAdminPage() {
  const user = auth.currentUser;

  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  const admin = await isAdmin();
  if (!admin) {
    alert('Access denied. Admin only.');
    window.location.href = '/';
  }
}

// Friendly Firebase error messages
function friendlyAuthError(code) {
  const map = {
    'auth/user-not-found':             'No account found with that email.',
    'auth/wrong-password':             'Incorrect password. Please try again.',
    'auth/invalid-email':              'Please enter a valid email address.',
    'auth/email-already-in-use':       'An account with this email already exists.',
    'auth/weak-password':              'Password must be at least 6 characters.',
    'auth/too-many-requests':          'Too many attempts. Please try again later.',
    'auth/invalid-credential':         'Incorrect email or password. Please try again.',
    'auth/invalid-login-credentials':  'Incorrect email or password. Please try again.',
    'auth/network-request-failed':     'Network error. Please check your connection.',
    'auth/user-disabled':              'This account has been disabled.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

// Show message helper (works for both old message div and new auth-message div)
function showFormMessage(msg, type) {
  // New login.html style
  const authMsg = document.getElementById('auth-message');
  if (authMsg) {
    authMsg.textContent = msg;
    authMsg.className = `auth-message ${type === 'success' ? 'success' : 'error'}`;
    authMsg.style.display = 'block';
    return;
  }
  // Old style fallback
  const messageDiv = document.getElementById('message');
  if (messageDiv) {
    messageDiv.className = `alert alert-${type === 'success' ? 'success' : 'error'}`;
    messageDiv.textContent = msg;
    messageDiv.style.display = 'block';
  }
}

// Register form handler
if (document.getElementById('register-form')) {
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('fullName').value.trim();

    const btn = e.target.querySelector('button[type="submit"]') ||
                e.target.querySelector('.auth-submit') ||
                e.target.querySelector('.btn');
    const originalText = btn ? btn.textContent : '';
    if (btn) { btn.textContent = 'Creating account...'; btn.disabled = true; }

    const result = await registerUser(email, password, fullName);

    if (result.success) {
      showFormMessage('Account created! Redirecting...', 'success');
      setTimeout(() => window.location.href = '/products.html', 1500);
    } else {
      showFormMessage(result.error, 'error');
      if (btn) { btn.textContent = originalText; btn.disabled = false; }
    }
  });
}

// Login form handler
if (document.getElementById('login-form')) {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const btn = e.target.querySelector('button[type="submit"]') ||
                e.target.querySelector('.auth-submit') ||
                e.target.querySelector('.btn');
    const originalText = btn ? btn.textContent : '';
    if (btn) { btn.textContent = 'Logging in...'; btn.disabled = true; }

    const result = await loginUser(email, password);

    if (result.success) {
      showFormMessage('Login successful! Redirecting...', 'success');

      // Check role and redirect accordingly
      const admin = await isAdmin();
      setTimeout(() => {
        window.location.href = admin ? '/admin/dashboard.html' : '/products.html';
      }, 1000);
    } else {
      showFormMessage(result.error, 'error');
      if (btn) { btn.textContent = originalText; btn.disabled = false; }
    }
  });
}

// Logout button handler
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await logoutUser();
  });
}

// Show/hide nav links based on auth state
auth.onAuthStateChanged((user) => {
  const authRequired = document.querySelectorAll('.auth-required');
  const guestOnly    = document.querySelectorAll('.guest-only');

  if (user) {
    // User is logged in - show auth-required, hide guest-only
    authRequired.forEach(el => {
      el.classList.add('visible');
      el.classList.remove('hidden');
    });
    guestOnly.forEach(el => {
      el.classList.add('hidden');
      el.classList.remove('visible');
    });
  } else {
    // User is not logged in - hide auth-required, show guest-only
    authRequired.forEach(el => {
      el.classList.remove('visible');
      el.classList.add('hidden');
    });
    guestOnly.forEach(el => {
      el.classList.remove('hidden');
      el.classList.add('visible');
    });
  }

  // Update cart count on auth change
  if (typeof updateCartCount === 'function') updateCartCount();
  
  console.log('Auth state updated:', { isLoggedIn: !!user, email: user?.email });
});