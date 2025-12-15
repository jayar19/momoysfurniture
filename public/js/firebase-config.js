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

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Ensure auth persistence is LOCAL so admin stays logged in
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .then(() => console.log("Auth persistence set to LOCAL"))
  .catch(err => console.error("Failed to set auth persistence:", err));

// -----------------------------
// Helper function to get Firebase ID token
async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    // Force refresh token to ensure validity
    const token = await user.getIdToken(true);
    return token;
  } catch (error) {
    console.error('Error fetching Firebase ID token:', error);
    return null;
  }
}

// -----------------------------
// Authenticated fetch wrapper
// Make authenticated fetch requests
async function authenticatedFetch(url, options = {}) {
  try {
    // Get the current Firebase ID token
    const token = await getAuthToken();

    if (!token) {
      console.warn('No Firebase ID token available. Cannot make authenticated request.');
      return { ok: false, status: 401, error: 'No token available' };
    }

    // Merge headers
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}` // Send token as "Bearer <token>"
    };

    console.log('Making authenticated request to:', url);
    console.log('Token being sent:', token);

    // Make the fetch request
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Log response status for debugging
    console.log('Response status:', response.status);

    // Optional: handle 401/403 but do NOT auto-redirect
    if (response.status === 401) {
      console.warn('Unauthorized request. User may not be authenticated.');
      // Do NOT redirect automatically; just return response for handling
    } else if (response.status === 403) {
      console.warn('Forbidden request. Access denied.');
      alert('Access denied. Admin only.');
    }

    return response;

  } catch (error) {
    console.error('Error in authenticatedFetch:', error);
    throw error;
  }
}


// -----------------------------
// Auth state change listener
auth.onAuthStateChanged(async (user) => {
  console.log('Auth state changed:', user ? user.email : 'Not logged in');

  // Only proceed if user exists
  if (user) {
    // Check Firestore for admin role
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (!userDoc.exists || userDoc.data().role !== 'admin') {
        alert('Access denied. Admin only.');
        await auth.signOut();
        window.location.href = '/login.html';
        return;
      }

      console.log('Admin verified:', user.email);
      updateUIForAuthState(user);

    } catch (err) {
      console.error('Error verifying admin role:', err);
      await auth.signOut();
      window.location.href = '/login.html';
    }
  } else {
    // Not logged in
    updateUIForAuthState(null);
  }
});

// -----------------------------
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
