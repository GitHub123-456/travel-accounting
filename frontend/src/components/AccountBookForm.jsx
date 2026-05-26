import React from 'react';
import { Popup, Form, Input, Button, Toast, TextArea } from 'antd-mobile';
import { CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { accountBookAPI } from '../api/accountBook';
import dayjs from 'dayjs';

function AccountBookForm({ visible, onClose, onSuccess, book }) {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      const data = {
        name: values.name,
        destination: values.destination,
        startDate: values.startDate,
        endDate: values.endDate,
        budget: values.budget,
        remark: values.remark
      };

      if (book) {
        await accountBookAPI.update(book.id, data);
        Toast.show({ icon: 'success', content: '更新成功' });
        onSuccess();
      } else {
        const result = await accountBookAPI.create(data);
        Toast.show({ icon: 'success', content: '创建成功' });
        onClose();
        navigate(`/account-books/${result.id}`);
      }
    } catch (error) {
      console.error('操作失败:', error);
    }
  };

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      bodyStyle={{
        maxHeight: '85vh',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
      }}
    >
      <div className="book-form-popup">
        <div className="book-form-header">
          <h2>{book ? '编辑账本' : '新建账本'}</h2>
          <div onClick={onClose} style={{ cursor: 'pointer', color: '#999' }}>
            <CloseOutlined style={{ fontSize: 22 }} />
          </div>
        </div>

        <div className="book-form-body">
          <Form
            form={form}
            onFinish={onFinish}
            initialValues={book}
            layout="vertical"
            footer={null}
          >
            <Form.Item
              name="name"
              label="旅行名称"
              rules={[{ required: true, message: '请输入旅行名称' }]}
            >
              <Input placeholder="如：日本之旅" />
            </Form.Item>

            <Form.Item
              name="destination"
              label="目的地"
              rules={[{ required: true, message: '请输入目的地' }]}
            >
              <Input placeholder="如：东京" />
            </Form.Item>

            <div className="book-form-row">
              <Form.Item
                name="startDate"
                label="开始日期"
                rules={[{ required: true, message: '请选择' }]}
                className="book-form-half"
              >
                <input type="date" className="book-form-date" />
              </Form.Item>

              <Form.Item
                name="endDate"
                label="结束日期"
                rules={[{ required: true, message: '请选择' }]}
                className="book-form-half"
              >
                <input type="date" className="book-form-date" />
              </Form.Item>
            </div>

            <Form.Item name="budget" label="人均预算（可选）">
              <Input type="number" placeholder="如：3000" />
            </Form.Item>

            <Form.Item name="remark" label="备注">
              <TextArea placeholder="备注信息（可选）" rows={2} />
            </Form.Item>
          </Form>
        </div>

        <div className="book-form-footer">
          <Button block color="primary" size="large" onClick={() => form.submit()}
            style={{ borderRadius: '12px' }}>
            {book ? '保存' : '创建账本'}
          </Button>
        </div>
      </div>
    </Popup>
  );
}

export default AccountBookForm;
