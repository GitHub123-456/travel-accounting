import React, { useState, useEffect } from 'react';
import { Popup, Form, Input, Button, Toast, List, Dialog, SwipeAction } from 'antd-mobile';
import { CloseOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { participantAPI } from '../api/participant';
import { userAPI } from '../api/user';
import './ParticipantManager.css';

function ParticipantManager({ visible, onClose, bookId, isArchived, onUpdate, bookOwnerId }) {
  const [form] = Form.useForm();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (visible && bookId) {
      (async () => {
        const user = await loadCurrentUser();
        await loadParticipants(user);
      })();
    }
  }, [visible, bookId]);

  const loadCurrentUser = async () => {
    try {
      const profile = await userAPI.getProfile();
      setCurrentUser(profile);
      return profile;
    } catch (error) {
      console.error('加载用户信息失败:', error);
      return null;
    }
  };

  const loadParticipants = async (user) => {
    try {
      const data = await participantAPI.getList(bookId);
      setParticipants(data || []);
      
      // 如果没有成员，自动添加当前用户
      const profile = user || currentUser;
      if ((!data || data.length === 0) && profile) {
        await participantAPI.create(bookId, {
          name: profile.nickname || '我',
          email: profile.email || ''
        });
        const refreshed = await participantAPI.getList(bookId);
        setParticipants(refreshed || []);
      }
    } catch (error) {
      console.error('加载成员失败:', error);
    }
  };

  const handleSubmit = async (values) => {
    if (isArchived) {
      Toast.show({ icon: 'fail', content: '已封存的账本不可修改成员' });
      return;
    }

    setLoading(true);
    try {
      if (editingParticipant) {
        await participantAPI.update(editingParticipant.id, {
          name: values.name,
          email: values.email || ''
        });
        Toast.show({ icon: 'success', content: '更新成功' });
      } else {
        await participantAPI.create(bookId, {
          name: values.name,
          email: values.email || ''
        });
        Toast.show({ icon: 'success', content: '添加成功' });
      }

      form.resetFields();
      setShowAddForm(false);
      setEditingParticipant(null);
      loadParticipants();
      
      // 通知父组件更新
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('操作失败:', error);
      Toast.show({ icon: 'fail', content: '操作失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (participant) => {
    if (isArchived) {
      Toast.show({ icon: 'fail', content: '已封存的账本不可修改成员' });
      return;
    }

    setEditingParticipant(participant);
    form.setFieldsValue({
      name: participant.name,
      email: participant.email || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (participant) => {
    if (isArchived) {
      Toast.show({ icon: 'fail', content: '已封存的账本不可删除成员' });
      return;
    }

    const result = await Dialog.confirm({
      content: `确定要删除成员"${participant.name}"吗？`,
      confirmText: '删除',
      cancelText: '取消'
    });

    if (result) {
      try {
        await participantAPI.delete(participant.id);
        Toast.show({ icon: 'success', content: '删除成功' });
        loadParticipants();
        
        // 通知父组件更新
        if (onUpdate) {
          onUpdate();
        }
      } catch (error) {
        console.error('删除失败:', error);
        Toast.show({ icon: 'fail', content: '删除失败' });
      }
    }
  };

  const handleAddNew = () => {
    if (isArchived) {
      Toast.show({ icon: 'fail', content: '已封存的账本不可添加成员' });
      return;
    }

    setEditingParticipant(null);
    form.resetFields();
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingParticipant(null);
    form.resetFields();
  };

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      bodyStyle={{ 
        height: '85vh',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px'
      }}
    >
      <div className="participant-manager">
        {/* 头部 */}
        <div className="manager-header">
          <h2>成员管理</h2>
          <Button
            fill="none"
            onClick={onClose}
            className="close-btn"
          >
            <CloseOutlined fontSize={24} />
          </Button>
        </div>

        <div className="manager-content">
          {/* 成员列表 */}
          <div className="participants-section">
            <div className="section-header">
              <span className="section-label">
                <span className="icon">👥</span> 账本成员
              </span>
              <span className="count-badge">共 {participants.length} 人</span>
            </div>

            {participants.length === 0 ? (
              <div className="empty-participants">
                <p>暂无成员</p>
                <p className="hint">点击下方按钮添加成员</p>
              </div>
            ) : (
              <List className="participants-list">
                {participants.map((participant) => {
                  const isMe = currentUser && participant.user_id === currentUser.userId;
                  const isCreator = bookOwnerId && participant.user_id === bookOwnerId;
                  const avatarUrl = participant.userAvatar || (isMe && currentUser.avatar);
                  return (
                  <SwipeAction
                    key={participant.id}
                    rightActions={[
                      {
                        key: 'edit',
                        text: '编辑',
                        color: 'primary',
                        onClick: () => handleEdit(participant)
                      },
                      {
                        key: 'delete',
                        text: '删除',
                        color: 'danger',
                        onClick: () => handleDelete(participant)
                      }
                    ]}
                  >
                    <List.Item
                      className="participant-item"
                      prefix={
                        avatarUrl ? (
                          <img src={avatarUrl} alt="" className="participant-avatar-img" />
                        ) : (
                          <div className="participant-avatar">
                            {participant.name.charAt(0)}
                          </div>
                        )
                      }
                      description={
                        <span>
                          {participant.email || '无邮箱'}
                          {isMe && <span className="me-tag"> · 本人</span>}
                        </span>
                      }
                    >
                      <div className="participant-name">
                        {participant.name}
                        {isCreator && <span className="creator-badge">创建人</span>}
                      </div>
                    </List.Item>
                  </SwipeAction>
                  );
                })}
              </List>
            )}

            {/* 添加成员按钮 */}
            {!showAddForm && !isArchived && (
              <Button
                block
                fill="none"
                className="add-participant-btn"
                onClick={handleAddNew}
              >
                <PlusOutlined /> 添加成员
              </Button>
            )}
          </div>

          {/* 添加/编辑表单 */}
          {showAddForm && (
            <div className="add-participant-form">
              <div className="form-title">
                {editingParticipant ? '编辑成员' : '添加成员'}
              </div>
              <Form
                form={form}
                onFinish={handleSubmit}
                footer={
                  <div className="form-actions">
                    <Button
                      block
                      color="default"
                      onClick={handleCancel}
                    >
                      取消
                    </Button>
                    <Button
                      block
                      color="primary"
                      loading={loading}
                      type="submit"
                    >
                      {editingParticipant ? '保存' : '添加'}
                    </Button>
                  </div>
                }
                layout="horizontal"
              >
                <Form.Item
                  name="name"
                  label="姓名"
                  rules={[
                    { required: true, message: '请输入姓名' },
                    { max: 20, message: '姓名不能超过20个字符' }
                  ]}
                >
                  <Input placeholder="如：张三" />
                </Form.Item>

                <Form.Item
                  name="email"
                  label="邮箱"
                  rules={[
                    { type: 'string', max: 100, message: '邮箱格式不正确' }
                  ]}
                >
                  <Input placeholder="对方的登录邮箱（可选）" type="email" />
                </Form.Item>
              </Form>
            </div>
          )}

          {/* 提示信息 */}
          <div className="tips-section">
            <div className="tips-title">💡 使用提示</div>
            <div className="tips-content">
              <p>• 添加成员时填写邮箱，对方注册登录后可直接查看账本</p>
              <p>• 记账时可以选择付款人和参与人</p>
              <p>• 左滑成员可以编辑或删除</p>
              <p>• 删除成员不会影响已有账单</p>
            </div>
          </div>
        </div>
      </div>
    </Popup>
  );
}

export default ParticipantManager;
