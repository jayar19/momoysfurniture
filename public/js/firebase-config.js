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

console.log('🔥 Firebase initializing...');

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Set auth persistence
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .then(() => console.log('✅ Auth persistence enabled'))
  .catch((error) => console.error('Auth persistence error:', error));

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

console.log('✅ Firebase services initialized');
console.log('🔗 API URL from config:', API_BASE_URL);

// Get auth token
async function getAuthToken() {
  const user = auth.currentUser;
  if (user) {
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('Token error:', error);
      return null;
    }
  }
  return null;
}

// Authenticated fetch helper
async function authenticatedFetch(url, options = {}) {
  // Use URL as-is if it's already complete, otherwise prepend API_BASE_URL
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  console.log('📡 Fetching:', fullUrl);
  
  const token = await getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(fullUrl, {
    ...options,
    headers
  });
  
  console.log('📥 Response:', response.status);
  
  return response;
}

// Auth state observer
auth.onAuthStateChanged((user) => {
  console.log('👤 Auth:', user ? user.email : 'Not logged in');
  updateUIForAuthState(user);
});

// Update UI based on auth state
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