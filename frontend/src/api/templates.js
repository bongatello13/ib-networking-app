import apiClient from './client';

export const templatesAPI = {
  getAll: async () => {
    const response = await apiClient.get('/api/templates');
    return response.data;
  },

  getOne: async (id) => {
    const response = await apiClient.get(`/api/templates/${id}`);
    return response.data;
  },

  create: async (template) => {
    const response = await apiClient.post('/api/templates', template);
    return response.data;
  },

  update: async (id, template) => {
    const response = await apiClient.put(`/api/templates/${id}`, template);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/api/templates/${id}`);
    return response.data;
  },
};
