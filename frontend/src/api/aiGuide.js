import request from '../utils/request';

export const aiGuideAPI = {
  generate: (data) => request.post('/ai/generate-guide', data),
  
  getList: () => request.get('/ai/guides'),
  
  getDetail: (id) => request.get(`/ai/guides/${id}`),
  
  update: (id, data) => request.put(`/ai/guides/${id}`, data),
  
  delete: (id) => request.delete(`/ai/guides/${id}`),
  
  modify: (id, data) => request.post(`/ai/guides/${id}/modify`, data),
  
  createAccountBook: (id) => request.post(`/ai/guides/${id}/create-account-book`)
};
