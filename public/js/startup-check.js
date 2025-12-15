// Startup check - waits for backend to be ready before loading page data
// This prevents "Failed to fetch" errors when backend is starting up

let backendReady = false;
let checkAttempts = 0;
const maxAttempts = 10;

// Show loading overlay
function showLoadingOverlay(message) {
  let overlay = document.getElementById('startup-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'startup-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;
    
    overlay.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <div class="spinner" style="margin: 0 auto 1rem;"></div>
        <p id="startup-message" style="color: #2c3e50; font-size: 1.1rem;"></p>
        <p id="startup-attempts" style="color: #7f8c8d; font-size: 0.9rem; margin-top: 0.5rem;"></p>
      </div>
    `;
    
    document.body.appendChild(overlay);
  }
  
  document.getElementById('startup-message').textContent = message;
  document.getElementById('startup-attempts').textContent = `Attempt ${checkAttempts + 1} of ${maxAttempts}`;
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('startup-overlay');
  if (overlay) {
    overlay.remove();
  }
}

// Check if backend is ready
async function checkBackendStatus() {
  checkAttempts++;
  
  console.log(`Backend check attempt ${checkAttempts}/${maxAttempts}`);
  
  try {
    showLoadingOverlay('Connecting to server...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is ready:', data);
      backendReady = true;
      hideLoadingOverlay();
      
      // Dispatch custom event to notify page that backend is ready
      window.dispatchEvent(new CustomEvent('backendReady'));
      return true;
    } else {
      throw new Error(`Backend returned status ${response.status}`);
    }
  } catch (error) {
    console.warn(`Backend check failed (attempt ${checkAttempts}):`, error.message);
    
    if (checkAttempts < maxAttempts) {
      // Retry after delay (exponential backoff)
      const delay = Math.min(1000 * Math.pow(1.5, checkAttempts), 5000);
      console.log(`Retrying in ${delay}ms...`);
      
      showLoadingOverlay(`Server starting up... Please wait`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return checkBackendStatus();
    } else {
      // Max attempts reached
      hideLoadingOverlay();
      console.error('❌ Backend is not responding after multiple attempts');
      
      // Show error message on page
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 2rem;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        max-width: 500px;
        z-index: 10000;
      `;
      
      errorDiv.innerHTML = `
        <h3 style="color: #e74c3c; margin-bottom: 1rem;">⚠️ Cannot Connect to Server</h3>
        <p style="margin-bottom: 1rem;">The backend server is not responding. This could be because:</p>
        <ul style="text-align: left; margin: 1rem 0; color: #7f8c8d;">
          <li>The server is still starting up (Render free tier can take 30-60 seconds)</li>
          <li>The server has an error</li>
          <li>Network connectivity issues</li>
        </ul>
        <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 1rem;">
          🔄 Refresh Page
        </button>
        <p style="margin-top: 1rem; font-size: 0.85rem; color: #95a5a6;">
          API URL: ${API_BASE_URL}
        </p>
      `;
      
      document.body.appendChild(errorDiv);
      return false;
    }
  }
}

// Initialize on page load
if (typeof API_BASE_URL !== 'undefined') {
  console.log('🔍 Checking backend status...');
  checkBackendStatus();
} else {
  console.error('❌ API_BASE_URL not defined. Make sure config.js is loaded first.');
}

// Export status checker
window.waitForBackend = function() {
  return new Promise((resolve) => {
    if (backendReady) {
      resolve(true);
    } else {
      window.addEventListener('backendReady', () => resolve(true), { once: true });
    }
  });
};