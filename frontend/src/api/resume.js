import apiClient from './client';

export const resumeAPI = {
  upload: async (file) => {
    const formData = new FormData();
    formData.append('resume', file);

    const response = await apiClient.post('/api/resume/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getInfo: async () => {
    const response = await apiClient.get('/api/resume/info');
    return response.data;
  },

  delete: async () => {
    const response = await apiClient.delete('/api/resume');
    return response.data;
  },
};
