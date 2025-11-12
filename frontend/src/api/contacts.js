import apiClient from './client';

export const contactsAPI = {
  getAll: async () => {
    const response = await apiClient.get('/api/contacts');
    return response.data;
  },

  getOne: async (id) => {
    const response = await apiClient.get(`/api/contacts/${id}`);
    return response.data;
  },

  create: async (contactData) => {
    const response = await apiClient.post('/api/contacts', contactData);
    return response.data;
  },

  update: async (id, contactData) => {
    const response = await apiClient.put(`/api/contacts/${id}`, contactData);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/api/contacts/${id}`);
    return response.data;
  },
};
