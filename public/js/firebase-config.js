// Firebase configuration - Replace with your actual Firebase config from Firebase Console
// Go to: Project Settings > General > Your apps > Web app > Config
const firebaseConfig = {
  apiKey: "AIzaSyBpSImRjgBmMk4vDww2is3xQHPk7ChePao",
  authDomain: "momoys-furniture.firebaseapp.com",
  projectId: "momoys-furniture",
  storageBucket: "momoys-furniture.firebasestorage.app",
  messagingSenderId: "983456745334",
  appId: "1:983456745334:web:3a84804be7799271571c57",
  measurementId: "G-XPZY184G3L"
};

// Verify config is correct
console.log('Firebase initialized with project:', firebaseConfig.projectId);

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// API base URL - MAKE SURE THIS IS CORRECT
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';

const API_BASE_URL = isLocalhost ? 'http://localhost:3000/api' : '/api';
console.log('🌍 Environment:', isLocalhost ? 'Development' : 'Production');
console.log('🔗 API Base URL:', API_BASE_URL);

// Helper function to get auth token
async function getAuthToken() {
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return null;
}

// Helper function for API calls with auth
async function authenticatedFetch(url, options = {}) {
  const token = await getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  console.log('Making authenticated request to:', url);
  console.log('Has token:', !!token);
  
  return fetch(url, {
    ...options,
    headers
  });
}

// Check auth state
auth.onAuthStateChanged((user) => {
  console.log('Auth state changed:', user ? user.email : 'Not logged in');
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