import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Toast, NavBar } from 'antd-mobile';
import { authAPI } from '../api/auth';
import './Register.css';

function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    if (values.password !== values.confirmPassword) {
      Toast.show({
        icon: 'fail',
        content: '两次密码输入不一致'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await authAPI.register({
        email: values.email,
        phone: values.phone,
        password: values.password,
        nickname: values.nickname
      });
      
      localStorage.setItem('token', result.token);
      localStorage.setItem('userId', result.userId);
      
      Toast.show({
        icon: 'success',
        content: '注册成功'
      });
      
      navigate('/account-books');
    } catch (error) {
      console.error('注册失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <NavBar onBack={() => navigate('/login')}>注册</NavBar>
      
      <div className="register-form">
        <Form
          onFinish={onFinish}
          footer={
            <Button
              block
              type="submit"
              color="primary"
              size="large"
              loading={loading}
            >
              注册
            </Button>
          }
        >
          <Form.Item
            name="nickname"
            label="昵称"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input placeholder="请输入昵称" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
          >
            <Input placeholder="请输入邮箱" type="email" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
          >
            <Input placeholder="请输入手机号" autoComplete="off" />
          </Form.Item>
          
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input type="password" placeholder="请输入密码" autoComplete="new-password" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认密码"
            rules={[{ required: true, message: '请再次输入密码' }]}
          >
            <Input type="password" placeholder="请再次输入密码" autoComplete="new-password" />
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}

export default Register;
