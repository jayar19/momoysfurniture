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

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// Ensure auth persists across reloads
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .then(() => console.log('✅ Auth persistence set to LOCAL'))
  .catch(err => console.error('❌ Failed to set auth persistence:', err));

// Get Firebase ID token
async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const token = await user.getIdToken(true); // force refresh
    return token;
  } catch (error) {
    console.error('❌ Error fetching Firebase ID token:', error);
    return null;
  }
}

// Make authenticated fetch requests
async function authenticatedFetch(url, options = {}) {
  const token = await getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  console.log('🌐 Making authenticated request to:', url);
  console.log('🔑 Token being sent:', token ? token.substring(0, 20) + '...' : 'No token');

  try {
    const response = await fetch(url, { ...options, headers });

    console.log('🔎 Response status:', response.status);

    if (response.status === 401) {
      console.warn('🚫 Unauthorized request. User may not be authenticated.');
    } else if (response.status === 403) {
      console.warn('⛔ Forbidden request. Access denied.');
      alert('Access denied. Admin only.');
    }

    return response;
  } catch (error) {
    console.error('❌ Fetch error:', error);
    throw error;
  }
}

// Listen to auth state changes
auth.onAuthStateChanged(user => {
  console.log('📩 Auth state changed:', user ? user.email : 'Not logged in');
  updateUIForAuthState(user);
});

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
  }
}
