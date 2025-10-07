import axios from 'axios';
import Cookies from 'js-cookie';

// Determine API URL based on environment
let API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:19997/api/v1';

// Auto-detect HTTPS and adjust API URL if needed
if (typeof window !== 'undefined') {
  const isHttps = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost';
  
  console.log('🔍 Frontend URL info:', {
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    href: window.location.href,
    isHttps,
    isLocalhost
  });
  
  // If frontend is on HTTPS but API URL is HTTP, and not localhost, update to HTTPS
  if (isHttps && API_URL.startsWith('http://') && !isLocalhost) {
    API_URL = API_URL.replace('http://', 'https://');
    console.warn('🔄 Auto-updated API URL to HTTPS for mixed content compatibility:', API_URL);
  }
  
  console.log('🔍 Final API_URL:', API_URL);
  console.log('🔍 NEXT_PUBLIC_API_URL env var:', process.env.NEXT_PUBLIC_API_URL);
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
    console.log('🚀 Making request to:', config.url, 'with baseURL:', config.baseURL);
    
    // Check if we're in the browser
    if (typeof window !== 'undefined') {
      const token = Cookies.get('access_token');
      console.log('Token in interceptor:', token ? 'EXISTS' : 'NOT FOUND');
      console.log('All cookies:', document.cookie);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Authorization header set:', config.headers.Authorization);
      } else {
        console.log('No token found, headers:', config.headers);
      }
    }
    
    console.log('📤 Final request config:', {
      url: config.url,
      baseURL: config.baseURL,
      method: config.method,
      headers: config.headers
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and CORS errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle CORS and network errors
    if (!error.response) {
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