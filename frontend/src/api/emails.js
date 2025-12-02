import apiClient from './client';

export const emailsAPI = {
  send: async (emailData) => {
    const response = await apiClient.post('/api/emails/send', emailData);
    return response.data;
  },

  getSent: async () => {
    const response = await apiClient.get('/api/emails/sent');
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/api/emails/stats');
    return response.data;
  },

  schedule: async (emailData) => {
    const response = await apiClient.post('/api/emails/schedule', emailData);
    return response.data;
  },

  getScheduled: async () => {
    const response = await apiClient.get('/api/emails/scheduled');
    return response.data;
  },

  cancelScheduled: async (id) => {
    const response = await apiClient.delete(`/api/emails/scheduled/${id}`);
    return response.data;
  },
};
