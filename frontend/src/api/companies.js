import apiClient from './client';

export const companiesAPI = {
  getAll: async () => {
    const response = await apiClient.get('/api/companies');
    return response.data;
  },

  getOne: async (id) => {
    const response = await apiClient.get(`/api/companies/${id}`);
    return response.data;
  },

  create: async (companyData) => {
    const response = await apiClient.post('/api/companies', companyData);
    return response.data;
  },

  update: async (id, companyData) => {
    const response = await apiClient.put(`/api/companies/${id}`, companyData);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/api/companies/${id}`);
    return response.data;
  },
};
