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

const attendanceApiClient = axios.create({
  baseURL: process.env.REACT_APP_API_STRING || 'http://localhost:9006',
  timeout: 30000,
  withCredentials: true,          // send the EXIM cookie automatically
});

// Request interceptor — nothing extra needed (cookie is automatic)
attendanceApiClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor
attendanceApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response;
      // Unauthorized → redirect to EXIM root (session expired)
      if (status === 401) {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default attendanceApiClient;
