import request from '../utils/request';

export const participantAPI = {
  // 添加参与人
  create: (bookId, data) => request.post(`/account-books/${bookId}/participants`, data),
  
  // 获取参与人列表
  getList: (bookId) => request.get(`/account-books/${bookId}/participants`),
  
  // 更新参与人
  update: (id, data) => request.put(`/participants/${id}`, data),
  
  // 删除参与人
  delete: (id) => request.delete(`/participants/${id}`)
};
