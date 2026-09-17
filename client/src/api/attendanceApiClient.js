/**
 * Attendance API Client
 *
 * This is an axios instance adapted for use inside the EXIM system.
 * Instead of reading a Bearer token from localStorage (as the standalone
 * attendance app did), it sends cookies via `withCredentials: true` so that
 * EXIM's cookie-based JWT is forwarded automatically.
 *
 * The base URL points to EXIM's own backend (same server, /api prefix).
 * On a 401 the user is redirected to the EXIM root so normal EXIM session
 * recovery kicks in.
 */
import axios from 'axios';
import toast from 'react-hot-toast';

const getDynamicBaseURL = () => {
  const envVal = process.env.REACT_APP_API_STRING || 'http://localhost:9006';
  
  if (typeof window === 'undefined' || !window.location.hostname) {
    return envVal;
  }

  const browserHost = window.location.hostname;
  const isLocalHostOrIp = 
    browserHost === 'localhost' || 
    browserHost === '127.0.0.1' || 
    /^192\.168\.\d+\.\d+$/.test(browserHost) ||
    /^10\.\d+\.\d+\.\d+$/.test(browserHost) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(browserHost);

  if (isLocalHostOrIp) {
    try {
      const url = new URL(envVal);
      url.hostname = browserHost;
      return url.toString().replace(/\/$/, '');
    } catch (e) {
      // Ignore URL parsing errors
    }
  }
  return envVal;
};

const attendanceApiClient = axios.create({
  baseURL: getDynamicBaseURL(),
  timeout: 30000,
  withCredentials: true,          // send the EXIM cookie automatically
});

// Request interceptor — attach Bearer token as fallback for cross-origin/cookie issues
attendanceApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      if (!config.headers) {
        config.headers = {};
      }
      if (typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
attendanceApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || data?.error;

      // Unauthorized (401) → save message, clean session, and redirect to login
      if (status === 401) {
        const authMsg = message || 'Your session has expired. Please log in again.';
        sessionStorage.setItem('auth_error_message', authMsg);
        localStorage.removeItem('token');
        localStorage.removeItem('exim_user');
        window.location.href = '/';
      } else if (status === 403) {
        // Forbidden (403) → show explicit permission / profile reason
        const forbiddenMsg = message || 'Access Denied: You do not have permission to access this resource.';
        toast.error(forbiddenMsg, { id: 'auth-forbidden-toast', duration: 5000 });
      }
    } else if (error.request) {
      // Network error (server down or unreachable)
      toast.error('Network Error: Unable to reach the server. Please check your connection.', {
        id: 'auth-network-toast',
        duration: 4000,
      });
    }
    return Promise.reject(error);
  }
);

export default attendanceApiClient;
