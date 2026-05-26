import request from '../utils/request';

export const userAPI = {
  // 获取个人信息
  getProfile: () => request.get('/user/profile'),
  
  // 更新个人信息
  updateProfile: (data) => request.put('/user/profile', data),
  
  // 上传头像
  uploadAvatar: (formData) => request.post('/user/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};
