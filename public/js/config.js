// API Configuration
// Automatically detects if running locally or in production

const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.includes('local');

// Set API base URL based on environment
// Since frontend and backend are on same Render service, use relative path in production
const API_BASE_URL = isLocalhost 
  ? 'http://localhost:3000/api'  // Local development
  : `${window.location.origin}/api`; // Production: same domain

console.log('🌍 Environment:', isLocalhost ? 'Development (Local)' : 'Production (Render)');
console.log('🔗 API Base URL:', API_BASE_URL);
console.log('📍 Current URL:', window.location.href);

// Export for use in other scripts
window.API_BASE_URL = API_BASE_URL;

// Test backend connection on load
fetch(`${API_BASE_URL}/health`)
  .then(res => res.json())
  .then(data => {
    console.log('✅ Backend Status:', data.status);
    console.log('📡 Session ID:', data.sessionId);
    console.log('🕐 Timestamp:', data.timestamp);
  })
  .catch(err => {
    console.error('❌ Backend Connection Failed:', err.message);
    console.error('💡 Trying to connect to:', API_BASE_URL);
    console.error('💡 Make sure backend routes are configured correctly');
  });