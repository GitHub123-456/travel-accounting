import request from '../utils/request';

export const authAPI = {
  // 注册
  register: (data) => request.post('/auth/register', data),
  
  // 登录
  login: (data) => request.post('/auth/login', data),
  
  // 发送验证码
  sendCode: (data) => request.post('/auth/send-code', data),
  
  // 重置密码
  resetPassword: (data) => request.post('/auth/reset-password', data),
  
  // 直接重置密码
  resetPasswordDirect: (data) => request.post('/auth/reset-password-direct', data)
};
