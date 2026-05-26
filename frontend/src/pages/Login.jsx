import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast, Popup } from 'antd-mobile';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { authAPI } from '../api/auth';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');

  // 忘记密码状态
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleLogin = async () => {
    if (!account.trim()) {
      Toast.show({ content: '请输入邮箱或手机号' });
      return;
    }
    if (!password) {
      Toast.show({ content: '请输入密码' });
      return;
    }

    setLoading(true);
    try {
      const result = await authAPI.login({ account, password });
      localStorage.setItem('token', result.token);
      localStorage.setItem('userId', result.userId);
      Toast.show({ icon: 'success', content: '登录成功' });
      navigate('/account-books');
    } catch (error) {
      console.error('登录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      Toast.show({ content: '请输入注册邮箱' });
      return;
    }
    if (!newPwd) {
      Toast.show({ content: '请输入新密码' });
      return;
    }
    if (newPwd.length < 6) {
      Toast.show({ content: '密码长度不能少于6位' });
      return;
    }
    if (newPwd !== confirmPwd) {
      Toast.show({ content: '两次密码输入不一致' });
      return;
    }

    setResetting(true);
    try {
      await authAPI.resetPasswordDirect({ email: resetEmail, newPassword: newPwd });
      Toast.show({ icon: 'success', content: '密码重置成功' });
      setShowReset(false);
      setResetEmail('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (error) {
      console.error('重置密码失败:', error);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-header">
        <img src="/logo.svg" alt="旅行记账" className="login-logo-img" />
        <h1>旅行记账</h1>
        <p>记录每一次旅行的美好</p>
      </div>

      <div className="login-form-area">
        <div className="login-input-group">
          <div className="login-input-wrapper">
            <span className="login-input-icon">👤</span>
            <input
              type="text"
              placeholder="邮箱或手机号"
              autoComplete="off"
              value={account}
              onChange={e => setAccount(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="login-input-wrapper">
            <span className="login-input-icon">🔒</span>
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder="请输入密码"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="pwd-eye" onClick={() => setShowPwd(!showPwd)}>
              {showPwd ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            </div>
          </div>
        </div>

        <div className="login-btn-group">
          <button className="login-btn-primary" onClick={handleLogin} disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
          <button className="login-btn-dark" onClick={() => navigate('/register')}>
            注册
          </button>
        </div>

        <div className="login-links">
          <a onClick={() => setShowReset(true)}>忘记密码</a>
        </div>
      </div>

      {/* 忘记密码弹窗 */}
      <Popup
        visible={showReset}
        onMaskClick={() => setShowReset(false)}
        bodyStyle={{
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          padding: '24px',
          background: 'var(--color-primary-light)',
        }}
      >
        <div className="reset-popup">
          <div className="reset-title">重置密码</div>
          <div className="reset-desc">请输入注册时使用的邮箱和新密码</div>

          <div className="login-input-group" style={{ marginTop: '20px' }}>
            <div className="login-input-wrapper">
              <span className="login-input-icon">📧</span>
              <input
                type="email"
                placeholder="注册邮箱"
                autoComplete="off"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
              />
            </div>

            <div className="login-input-wrapper">
              <span className="login-input-icon">🔑</span>
              <input
                type={showNewPwd ? 'text' : 'password'}
                placeholder="新密码（至少6位）"
                autoComplete="new-password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
              />
              <div className="pwd-eye" onClick={() => setShowNewPwd(!showNewPwd)}>
                {showNewPwd ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              </div>
            </div>

            <div className="login-input-wrapper">
              <span className="login-input-icon">🔑</span>
              <input
                type={showConfirmPwd ? 'text' : 'password'}
                placeholder="确认新密码"
                autoComplete="new-password"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
              />
              <div className="pwd-eye" onClick={() => setShowConfirmPwd(!showConfirmPwd)}>
                {showConfirmPwd ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              </div>
            </div>
          </div>

          <div className="login-btn-group" style={{ marginTop: '24px' }}>
            <button className="login-btn-primary" onClick={handleResetPassword} disabled={resetting}>
              {resetting ? '重置中...' : '确认重置'}
            </button>
            <button className="login-btn-dark" onClick={() => setShowReset(false)}>
              取消
            </button>
          </div>
        </div>
      </Popup>
    </div>
  );
}

export default Login;
