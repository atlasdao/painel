import axios from 'axios';
import Cookies from 'js-cookie';

// Determine API URL based on environment
// Note: Backend uses API versioning, so we need to include /v1
let API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:19997/api/v1';

// Auto-detect HTTPS and adjust API URL if needed
if (typeof window !== 'undefined') {
  const isHttps = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost';
  
  // Frontend URL info detected
  
  // If frontend is on HTTPS but API URL is HTTP, and not localhost, update to HTTPS
  if (isHttps && API_URL.startsWith('http://') && !isLocalhost) {
    API_URL = API_URL.replace('http://', 'https://');
    // Auto-updated API URL to HTTPS for mixed content compatibility
  }
  
  // API URL configured for production
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Build the full URL that will be called
    const fullUrl = config.baseURL + (config.url?.startsWith('/') ? config.url : '/' + config.url);
    const timestamp = new Date().toISOString();
    console.log(`[API REQUEST] ${timestamp} - ${config.method?.toUpperCase()} ${fullUrl}`);

    // Check if we're in the browser
    if (typeof window !== 'undefined') {
      const token = Cookies.get('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('[API REQUEST] Auth token attached, length:', token.length);
      } else {
        console.log('[API REQUEST] No auth token found in cookies');
      }
    }

    // Log request details
    console.log('[API REQUEST] Details:', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      fullUrl: fullUrl,
      hasAuth: !!config.headers.Authorization,
      headers: config.headers,
      data: config.data
    });

    return config;
  },
  (error) => {
    console.error('[API REQUEST] Interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and CORS errors
api.interceptors.response.use(
  (response) => {
    const timestamp = new Date().toISOString();
    console.log(`[API RESPONSE] ${timestamp} - ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    console.log('[API RESPONSE] Data received:', response.data);
    return response;
  },
  async (error) => {
    // Log the error with details
    if (error.response) {
      console.error(`❌ API ${error.config?.method?.toUpperCase()} ${error.config?.url} - Status: ${error.response.status}`);
      console.error('Error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        requestUrl: error.config?.url,
        fullUrl: error.config?.baseURL + error.config?.url
      });
    } else if (!error.response) {
      console.error('❌ Network error (possibly CORS):', error.message);

      // If it's a CORS error and we're on HTTPS, try to suggest HTTPS API URL
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && API_URL.startsWith('http://')) {
        console.error('🔐 Mixed content detected - HTTPS frontend trying to access HTTP API');
        console.error('💡 Consider setting NEXT_PUBLIC_API_URL to an HTTPS endpoint');
      }

      return Promise.reject({
        ...error,
        message: 'Network error. Check if the API server is running and CORS is configured correctly.',
      });
    }

    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refresh_token');
        if (refreshToken) {
          // Use the same API_URL which already includes version
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken: refreshToken,
          });

          const { accessToken } = response.data;
          
          Cookies.set('access_token', accessToken);
          Cookies.set('refresh_token', refreshToken); // Keep the same refresh token
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export { api };
export default api;