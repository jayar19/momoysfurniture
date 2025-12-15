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
    return { success: false, error: error.message };
  }
}

// Login user
async function loginUser(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
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

// Register form handler
if (document.getElementById('register-form')) {
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('fullName').value;
    const messageDiv = document.getElementById('message');
    
    const result = await registerUser(email, password, fullName);
    
    if (result.success) {
      messageDiv.className = 'alert alert-success';
      messageDiv.textContent = 'Registration successful! Redirecting...';
      setTimeout(() => {
        window.location.href = '/products.html';
      }, 2000);
    } else {
      messageDiv.className = 'alert alert-error';
      messageDiv.textContent = result.error;
    }
    
    messageDiv.style.display = 'block';
  });
}

// Login form handler
if (document.getElementById('login-form')) {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('message');
    
    const result = await loginUser(email, password);
    
    if (result.success) {
      messageDiv.className = 'alert alert-success';
      messageDiv.textContent = 'Login successful! Redirecting...';
      
      // Check if admin
      const admin = await isAdmin();
      setTimeout(() => {
        window.location.href = admin ? '/admin/dashboard.html' : '/products.html';
      }, 1000);
    } else {
      messageDiv.className = 'alert alert-error';
      messageDiv.textContent = result.error;
    }
    
    messageDiv.style.display = 'block';
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