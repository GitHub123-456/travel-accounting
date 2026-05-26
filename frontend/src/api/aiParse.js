import request from '../utils/request';

export const aiParseAPI = {
  parse: (bookId, data) => request.post(`/account-books/${bookId}/ai/parse`, data)
};
