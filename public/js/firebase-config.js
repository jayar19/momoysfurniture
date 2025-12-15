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
async function authenticatedFetch(endpoint, options = {}) {
  const token = await getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const fullUrl = window.API_BASE_URL + endpoint;

  console.log('➡️ Auth fetch:', fullUrl);

  return fetch(fullUrl, {
    ...options,
    headers
  });
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
