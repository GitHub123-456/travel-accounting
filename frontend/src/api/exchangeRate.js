import request from '../utils/request';

export const exchangeRateAPI = {
  getList: (bookId) => request.get(`/account-books/${bookId}/exchange-rates`),
  setRate: (bookId, data) => request.post(`/account-books/${bookId}/exchange-rates`, data),
  refreshAll: (bookId) => request.post(`/account-books/${bookId}/exchange-rates/refresh`),
};
