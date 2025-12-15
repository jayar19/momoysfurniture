// Firebase configuration
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

// Services
const auth = firebase.auth();
const db = firebase.firestore();

// 🔑 READ from config.js
const API_BASE_URL = window.API_BASE_URL;

// ------------------- Get Firebase ID Token -------------------
async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    return await user.getIdToken(true); // force refresh
  } catch (err) {
    console.error('Error fetching token:', err);
    return null;
  }
}

// ------------------- Authenticated Fetch -------------------
async function authenticatedFetch(url, options = {}) {
  const token = await getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  console.log('➡️ Request:', url);
  console.log('🔐 Token exists:', !!token);

  const response = await fetch(url, {
    ...options,
    headers
  });

  console.log('⬅️ Response status:', response.status);
  return response;
}

// ------------------- Auth Listener -------------------
auth.onAuthStateChanged(user => {
  console.log('Auth state changed:', user ? user.email : 'Not logged in');
  updateUIForAuthState(user);
});

// ------------------- UI -------------------
function updateUIForAuthState(user) {
  document.querySelectorAll('.auth-required')
    .forEach(el => el.style.display = user ? 'block' : 'none');

  document.querySelectorAll('.guest-only')
    .forEach(el => el.style.display = user ? 'none' : 'block');

  const email = document.getElementById('user-email');
  if (email) email.textContent = user ? user.email : '';
}
