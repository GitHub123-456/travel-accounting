import request from '../utils/request';

export const transactionAPI = {
  // 创建账单
  create: (bookId, data) => request.post(`/account-books/${bookId}/transactions`, data),
  
  // 获取账单列表
  getList: (bookId, params) => request.get(`/account-books/${bookId}/transactions`, { params }),
  
  // 获取账单详情
  getDetail: (id) => request.get(`/transactions/${id}`),
  
  // 更新账单
  update: (id, data) => request.put(`/transactions/${id}`, data),
  
  // 删除账单
  delete: (id) => request.delete(`/transactions/${id}`)
};
