import apiClient from './client';

export const gmailAPI = {
  getAuthUrl: async () => {
    const response = await apiClient.get('/api/gmail/auth-url');
    return response.data;
  },

  getStatus: async () => {
    const response = await apiClient.get('/api/gmail/status');
    return response.data;
  },

  disconnect: async () => {
    const response = await apiClient.post('/api/gmail/disconnect');
    return response.data;
  },

  getSignature: async () => {
    const response = await apiClient.get('/api/gmail/signature');
    return response.data;
  },

  saveSignature: async (signature) => {
    const response = await apiClient.post('/api/gmail/signature', { signature });
    return response.data;
  },
};
