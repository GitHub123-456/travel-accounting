import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Toast } from 'antd-mobile';
import { LeftOutlined } from '@ant-design/icons';
import { userAPI } from '../api/user';
import dayjs from 'dayjs';
import './Profile.css';

function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const data = await userAPI.getProfile();
      setProfile(data);
    } catch (error) {
      console.error('加载个人信息失败:', error);
    }
  };

  const handleAvatarClick = (e) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      Toast.show({ icon: 'fail', content: '图片不能超过5MB' });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const result = await userAPI.uploadAvatar(formData);
      setProfile(prev => ({ ...prev, avatar: result.avatarUrl }));
      Toast.show({ icon: 'success', content: '头像更新成功' });
    } catch (error) {
      Toast.show({ icon: 'fail', content: '上传失败' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleLogout = async () => {
    const result = await Dialog.confirm({ content: '确定要退出登录吗？' });
    if (result) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      navigate('/login');
    }
  };

  if (!profile) return null;

  return (
    <div className="profile-page">
      {/* 顶部背景 */}
      <div className="profile-bg">
        <div className="profile-nav">
          <div className="profile-back" onClick={() => navigate('/account-books')}>
            <LeftOutlined fontSize={22} color="white" />
          </div>
          <span className="profile-nav-title">个人中心</span>
          <div style={{ width: 22 }} />
        </div>

        <div className="profile-avatar-section" onClick={handleAvatarClick}>
          <div className="profile-avatar-wrap">
            {profile.avatar ? (
              <img src={profile.avatar} alt="" className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-default">
                {(profile.nickname || '?').charAt(0)}
              </div>
            )}
            <div className="profile-avatar-camera">📷</div>
            {uploading && <div className="profile-avatar-uploading">...</div>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        <div className="profile-name">{profile.nickname}</div>
        <div className="profile-account">{profile.email || profile.phone}</div>
      </div>

      {/* 统计卡片 */}
      <div className="profile-stats-card">
        <div className="profile-stat-item">
          <div className="profile-stat-value">{profile.accountBookCount || 0}</div>
          <div className="profile-stat-label">账本</div>
        </div>
        <div className="profile-stat-divider" />
        <div className="profile-stat-item">
          <div className="profile-stat-value">{profile.defaultCurrency || 'CNY'}</div>
          <div className="profile-stat-label">默认币种</div>
        </div>
        <div className="profile-stat-divider" />
        <div className="profile-stat-item">
          <div className="profile-stat-value">{dayjs(profile.createdAt).format('YYYY')}</div>
          <div className="profile-stat-label">加入年份</div>
        </div>
      </div>

      {/* 功能列表 */}
      <div className="profile-menu">
        <div className="profile-menu-item" onClick={() => navigate('/account-books')}>
          <span className="menu-icon">📚</span>
          <span className="menu-text">我的账本</span>
          <span className="menu-arrow">›</span>
        </div>
      </div>

      {/* 退出登录 */}
      <div className="profile-menu" style={{ marginTop: 24 }}>
        <div className="profile-menu-item logout" onClick={handleLogout}>
          <span className="menu-text">退出登录</span>
        </div>
      </div>
    </div>
  );
}

export default Profile;
