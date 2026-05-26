import React, { useState, useEffect } from 'react';
import { Popup, Form, Input, DatePicker, Button, Dialog, Toast, Space } from 'antd-mobile';
import { CloseOutlined, DeleteOutlined, InboxOutlined } from '@ant-design/icons';
import { accountBookAPI } from '../api/accountBook';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import './AccountBookSettings.css';

function AccountBookSettings({ visible, onClose, book, onUpdate }) {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && book) {
      form.setFieldsValue({
        name: book.name,
        destination: book.destination,
        startDate: new Date(book.start_date),
        endDate: new Date(book.end_date),
        budget: book.budget ? book.budget.toString() : ''
      });
    }
  }, [visible, book, form]);

  const handleUpdate = async (values) => {
    setLoading(true);
    try {
      await accountBookAPI.update(book.id, {
        name: values.name,
        destination: values.destination,
        startDate: dayjs(values.startDate).format('YYYY-MM-DD'),
        endDate: dayjs(values.endDate).format('YYYY-MM-DD'),
        budget: values.budget ? parseFloat(values.budget) : null
      });

      Toast.show({ icon: 'success', content: '更新成功' });
      onClose();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('更新失败:', error);
      Toast.show({ icon: 'fail', content: '更新失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    const result = await Dialog.confirm({
      content: '确定要封存这个账本吗？封存后将无法修改。',
      confirmText: '封存',
      cancelText: '取消'
    });

    if (result) {
      try {
        await accountBookAPI.archive(book.id);
        Toast.show({ icon: 'success', content: '封存成功' });
        onClose();
        if (onUpdate) onUpdate();
      } catch (error) {
        console.error('封存失败:', error);
        Toast.show({ icon: 'fail', content: '封存失败' });
      }
    }
  };

  const handleDelete = async () => {
    const result = await Dialog.confirm({
      content: '确定要删除这个账本吗？删除后无法恢复，所有相关数据都将被删除。',
      confirmText: '删除',
      cancelText: '取消'
    });

    if (result) {
      try {
        await accountBookAPI.delete(book.id);
        Toast.show({ icon: 'success', content: '删除成功' });
        onClose();
        navigate('/account-books');
      } catch (error) {
        console.error('删除失败:', error);
        Toast.show({ icon: 'fail', content: '删除失败' });
      }
    }
  };

  if (!book) return null;

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
      <div className="account-book-settings">
        {/* 头部 */}
        <div className="settings-header">
          <h2>账本设置</h2>
          <Button
            fill="none"
            onClick={onClose}
            className="close-btn"
          >
            <CloseOutlined fontSize={24} />
          </Button>
        </div>

        <div className="settings-content">
          {/* 编辑表单 */}
          <div className="settings-form">
            <Form
              form={form}
              onFinish={handleUpdate}
              layout="vertical"
              footer={null}
            >
              <Form.Item
                name="name"
                label="账本名称"
                rules={[{ required: true, message: '请输入账本名称' }]}
              >
                <Input placeholder="例如：济州岛之旅" />
              </Form.Item>

              <Form.Item
                name="destination"
                label="目的地"
                rules={[{ required: true, message: '请输入目的地' }]}
              >
                <Input placeholder="例如：济州岛" />
              </Form.Item>

              <Form.Item
                name="startDate"
                label="开始日期"
                rules={[{ required: true, message: '请选择开始日期' }]}
              >
                <DatePicker>
                  {value => (
                    <div className="date-picker-value">
                      {dayjs(value).format('YYYY年MM月DD日')}
                    </div>
                  )}
                </DatePicker>
              </Form.Item>

              <Form.Item
                name="endDate"
                label="结束日期"
                rules={[{ required: true, message: '请选择结束日期' }]}
              >
                <DatePicker>
                  {value => (
                    <div className="date-picker-value">
                      {dayjs(value).format('YYYY年MM月DD日')}
                    </div>
                  )}
                </DatePicker>
              </Form.Item>

              <Form.Item
                name="budget"
                label="人均预算（可选）"
              >
                <Input type="number" placeholder="0" />
              </Form.Item>
            </Form>
          </div>

          {/* 操作按钮区 */}
          <div className="settings-actions">
            <Button
              block
              color="primary"
              size="large"
              loading={loading}
              onClick={() => form.submit()}
              className="update-btn"
            >
              保存修改
            </Button>

            {!book.is_archived && (
              <Button
                block
                fill="outline"
                size="large"
                onClick={handleArchive}
                className="archive-btn"
              >
                <InboxOutlined /> 封存账本
              </Button>
            )}

            <Button
              block
              color="danger"
              fill="outline"
              size="large"
              onClick={handleDelete}
              className="delete-btn"
            >
              <DeleteOutlined /> 删除账本
            </Button>
          </div>
        </div>
      </div>
    </Popup>
  );
}

export default AccountBookSettings;
