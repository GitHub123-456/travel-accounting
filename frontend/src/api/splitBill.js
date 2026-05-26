import request from '../utils/request';

export const splitBillAPI = {
  // 计算分账
  calculate: (bookId) => request.get(`/account-books/${bookId}/split-bills/calculate`),
  
  // 获取个人分账视图
  getPersonal: (bookId, participantId) => 
    request.get(`/account-books/${bookId}/split-bills/personal`, { 
      params: { participantId } 
    }),
  
  // 更新结清状态
  updateSettledStatus: (bookId, participantId, isSettled) =>
    request.put(`/account-books/${bookId}/participants/${participantId}/settled`, { isSettled })
};
