import apiClient from './client';

export const authAPI = {
  signup: async (email, password, name) => {
    const response = await apiClient.post('/api/auth/signup', { email, password, name });
    return response.data;
  },

  login: async (email, password) => {
    const response = await apiClient.post('/api/auth/login', { email, password });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },
};
