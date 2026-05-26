import axios from 'axios';
import { Toast } from 'antd-mobile';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data;
    
    if (code === 200) {
      return data;
    } else {
      Toast.show({
        icon: 'fail',
        content: message || '请求失败'
      });
      return Promise.reject(new Error(message));
    }
  },
  (error) => {
    if (error.response?.status === 401) {
      Toast.show({
        icon: 'fail',
        content: '登录已过期，请重新登录'
      });
      // 清除所有登录信息
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      // 跳转到登录页
      window.location.href = '/login';
    } else {
      Toast.show({
        icon: 'fail',
        content: error.message || '网络错误'
      });
    }
    return Promise.reject(error);
  }
);

export default request;
