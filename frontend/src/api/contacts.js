import apiClient from './client';

export const contactsAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.quality) params.append('quality', filters.quality);
    if (filters.company_id) params.append('company_id', filters.company_id);
    if (filters.tags) params.append('tags', filters.tags);

    const url = params.toString() ? `/api/contacts?${params}` : '/api/contacts';
    const response = await apiClient.get(url);
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

  updateStatus: async (id, status) => {
    const response = await apiClient.put(`/api/contacts/${id}/status`, { status });
    return response.data;
  },

  logCall: async (id, callData) => {
    const response = await apiClient.post(`/api/contacts/${id}/call`, callData);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/api/contacts/${id}`);
    return response.data;
  },

  // Timeline notes
  getNotes: async (contactId) => {
    const response = await apiClient.get(`/api/contacts/${contactId}/notes`);
    return response.data;
  },

  addNote: async (contactId, noteData) => {
    const response = await apiClient.post(`/api/contacts/${contactId}/notes`, noteData);
    return response.data;
  },

  updateNote: async (noteId, content) => {
    const response = await apiClient.put(`/api/notes/${noteId}`, { content });
    return response.data;
  },

  deleteNote: async (noteId) => {
    const response = await apiClient.delete(`/api/notes/${noteId}`);
    return response.data;
  },

  // Email threads
  getEmails: async (contactId) => {
    const response = await apiClient.get(`/api/contacts/${contactId}/emails`);
    return response.data;
  },
};
