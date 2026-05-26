import request from '../utils/request';

export const accountBookAPI = {
  // 创建账本
  create: (data) => request.post('/account-books', data),
  
  // 获取账本列表
  getList: (params) => request.get('/account-books', { params }),
  
  // 获取账本详情
  getDetail: (id) => request.get(`/account-books/${id}`),
  
  // 更新账本
  update: (id, data) => request.put(`/account-books/${id}`, data),
  
  // 删除账本
  delete: (id) => request.delete(`/account-books/${id}`),
  
  // 封存/解封账本
  archive: (id, isArchived) => request.put(`/account-books/${id}/archive`, { isArchived }),

  // 上传封面
  uploadCover: (id, formData) => request.post(`/account-books/${id}/cover`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};
