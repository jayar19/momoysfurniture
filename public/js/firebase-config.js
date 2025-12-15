// Firebase configuration - Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBpSImRjgBmMk4vDww2is3xQHPk7ChePao",
  authDomain: "momoys-furniture.firebaseapp.com",
  projectId: "momoys-furniture",
  storageBucket: "momoys-furniture.firebasestorage.app",
  messagingSenderId: "983456745334",
  appId: "1:983456745334:web:3a84804be7799271571c57",
  measurementId: "G-XPZY184G3L"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// API base URL - Make sure this is correct
const API_BASE_URL = window.API_BASE_URL;

// ------------------- Helper: Get Firebase ID Token -------------------
async function getAuthToken() {
  return new Promise((resolve) => {
    const user = auth.currentUser;
    if (user) {
      user.getIdToken(true)
        .then(token => resolve(token))
        .catch(err => {
          console.error('Error fetching token:', err);
          resolve(null);
        });
    } else {
      // Wait for auth state to be ready
      const unsubscribe = auth.onAuthStateChanged(u => {
        unsubscribe();
        if (u) {
          u.getIdToken(true)
            .then(token => resolve(token))
            .catch(err => {
              console.error('Error fetching token:', err);
              resolve(null);
            });
        } else {
          resolve(null);
        }
      });
    }
  });
}

// ------------------- Helper: Authenticated Fetch -------------------
async function authenticatedFetch(url, options = {}) {
  const token = await getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  console.log('Making authenticated request to:', url);
  console.log('Token exists:', !!token);

  try {
    const res = await fetch(url, { ...options, headers });
    console.log('Response status:', res.status);

    // Optional: handle 401/403 globally
    if (res.status === 401) {
      console.warn('Unauthorized request. User may not be authenticated.');
      // window.location.href = '/login.html'; // Commented out for debugging
    } else if (res.status === 403) {
      console.warn('Forbidden request. Admin access required.');
      alert('Access denied. Admin only.');
    }

    return res;
  } catch (err) {
    console.error('Error in authenticatedFetch:', err);
    throw err;
  }
}

// ------------------- Auth State Listener -------------------
auth.onAuthStateChanged(async (user) => {
  console.log('Auth state changed:', user ? user.email : 'Not logged in');

  if (user) {
    const token = await getAuthToken();
    console.log('Admin verified token:', token ? '✅ Token exists' : '❌ No token');
  }

  updateUIForAuthState(user);
});

// ------------------- UI Updates -------------------
function updateUIForAuthState(user) {
  const authLinks = document.querySelectorAll('.auth-required');
  const guestLinks = document.querySelectorAll('.guest-only');
  const userEmail = document.getElementById('user-email');

  if (user) {
    authLinks.forEach(link => link.style.display = 'block');
    guestLinks.forEach(link => link.style.display = 'none');
    if (userEmail) userEmail.textContent = user.email;
  } else {
    authLinks.forEach(link => link.style.display = 'none');
    guestLinks.forEach(link => link.style.display = 'block');
    if (userEmail) userEmail.textContent = '';
  }
}
