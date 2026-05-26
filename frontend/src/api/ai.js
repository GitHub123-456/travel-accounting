import request from '../utils/request';

export const aiAPI = {
  parse: (bookId, data) => request.post(`/account-books/${bookId}/ai/parse`, data)
};
