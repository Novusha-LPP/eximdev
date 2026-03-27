import apiClient from '../attendanceApiClient';

const authAPI = {
  /**
   * Login user
   */
  login: async (credentials) => {
    try {
      // Removed hardcoded credentials. Now calls the actual API endpoint.
      const response = await apiClient.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' };
    }
  },

  /**
   * Register user
   */
  register: async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  },

  /**
   * Logout user
   */
  logout: async () => {
    try {
      // Uncommented to use the real API call
      const response = await apiClient.post('/auth/logout');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Logout failed' };
    }
  },

  /**
   * Get current user profile
   */
  getProfile: async () => {
    try {
      // Uncommented to fetch the real user profile from the database
      const response = await apiClient.get('/auth/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch profile' };
    }
  },

  /**
   * Update user profile
   */
  updateProfile: async (profileData) => {
    try {
      const response = await apiClient.put('/auth/profile', profileData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update profile' };
    }
  },

  /**
   * Change password
   */
  changePassword: async (passwordData) => {
    try {
      const response = await apiClient.post('/auth/change-password', passwordData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to change password' };
    }
  },

  /**
   * Forgot password
   */
  forgotPassword: async (email) => {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to send reset link' };
    }
  },

  /**
   * Reset password
   */
  resetPassword: async (token, newPassword) => {
    try {
      const response = await apiClient.post('/auth/reset-password', {
        token,
        password: newPassword
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to reset password' };
    }
  },

  /**
   * Verify token
   */
  verifyToken: async () => {
    try {
      // Uncommented to verify token against the backend
      const response = await apiClient.get('/auth/verify');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Token verification failed' };
    }
  }
};

export default authAPI;
