import React from 'react';
import { Popup, Button, Dialog, Toast } from 'antd-mobile';
import { CloseOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { transactionAPI } from '../api/transaction';
import dayjs from 'dayjs';
import './TransactionDetail.css';

// 分类图标映射
const CATEGORY_ICONS = {
  '餐饮': '🍜',
  '交通': '✈️',
  '住宿': '🏨',
  '购物': '🛍️',
  '门票': '🎫',
  '其他': '📝'
};

// 支付方式映射
const PAYMENT_METHODS = {
  'cash': '💵 现金',
  'credit': '💳 信用卡',
  'other': '💰 其他'
};

// 币种符号映射
const CURRENCY_SYMBOLS = {
  'CNY': '¥',
  'USD': '$',
  'EUR': '€',
  'JPY': 'JP¥',
  'GBP': '£',
  'THB': '฿',
  'KRW': '₩'
};

function TransactionDetail({ visible, onClose, transaction, bookId, onUpdate, isArchived, onEdit }) {
  const navigate = useNavigate();

  if (!transaction) return null;

  const getCurrencySymbol = (currency) => {
    return CURRENCY_SYMBOLS[currency] || currency;
  };

  const handleEdit = () => {
    onClose();
    if (onEdit) {
      onEdit(transaction.id);
    } else {
      navigate(`/account-books/${bookId}/transactions/${transaction.id}/edit`);
    }
  };

  const handleDelete = async () => {
    const result = await Dialog.confirm({
      content: '确定要删除这条账单吗？',
      confirmText: '删除',
      cancelText: '取消'
    });

    if (result) {
      try {
        await transactionAPI.delete(transaction.id);
        Toast.show({ icon: 'success', content: '删除成功' });
        onClose();
        if (onUpdate) {
          onUpdate();
        }
      } catch (error) {
        console.error('删除失败:', error);
        Toast.show({ icon: 'fail', content: '删除失败' });
      }
    }
  };

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      bodyStyle={{ 
        height: 'auto',
        maxHeight: '85vh',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px'
      }}
    >
      <div className="transaction-detail">
        {/* 头部 */}
        <div className="detail-header">
          <h2>流水详情</h2>
          <Button
            fill="none"
            onClick={onClose}
            className="close-btn"
          >
            <CloseOutlined fontSize={24} />
          </Button>
        </div>

        <div className="detail-content">
          {/* 金额展示区 */}
          <div className="amount-section">
            <div className="category-icon-large">
              {CATEGORY_ICONS[transaction.category] || '📝'}
            </div>
            <div className="amount-display">
              <div className="original-amount">
                {transaction.currency} {transaction.amount}
              </div>
              <div className="local-amount">
                ≈ ¥{transaction.local_amount}
              </div>
            </div>
          </div>

          {/* 详细信息 */}
          <div className="info-section">
            <div className="info-item">
              <span className="info-label">消费日期</span>
              <span className="info-value">
                {dayjs(transaction.transaction_time).format('YYYY-MM-DD')}
              </span>
            </div>

            <div className="info-item">
              <span className="info-label">分类/项目</span>
              <span className="info-value highlight">
                {transaction.category} #{transaction.sub_category || '未分类'}
              </span>
            </div>

            {transaction.type === 'shared' && (
              <>
                <div className="info-item">
                  <span className="info-label">账单类型</span>
                  <span className="info-value badge">共同账单</span>
                </div>

                {transaction.payerName && (
                  <div className="info-item">
                    <span className="info-label">付款人</span>
                    <span className="info-value">{transaction.payerName}</span>
                  </div>
                )}

                {Array.isArray(transaction.participants) && transaction.participants.length > 0 && (
                  <div className="info-item">
                    <span className="info-label">参与人</span>
                    <span className="info-value">
                      {transaction.participants.join('、')}
                    </span>
                  </div>
                )}
              </>
            )}

            {transaction.type === 'personal' && (
              <>
                <div className="info-item">
                  <span className="info-label">账单类型</span>
                  <span className="info-value personal-type-value">个人账单</span>
                </div>
                {transaction.creatorName && (
                  <div className="info-item">
                    <span className="info-label">记账人</span>
                    <span className="info-value">{transaction.creatorName}</span>
                  </div>
                )}
              </>
            )}

            {transaction.location && (
              <div className="info-item">
                <span className="info-label">消费地点</span>
                <span className="info-value">{transaction.location}</span>
              </div>
            )}
          </div>

          {/* 备注 */}
          {transaction.remark && (
            <div className="remark-section">
              <div className="remark-label">备注</div>
              <div className="remark-content">
                "{transaction.remark}"
              </div>
            </div>
          )}
        </div>

        {/* 底部操作按钮 - 仅在未封存时显示 */}
        {!isArchived ? (
          <div className="detail-actions">
            <Button
              block
              color="primary"
              size="large"
              className="edit-btn"
              onClick={handleEdit}
            >
              <EditOutlined /> 修改
            </Button>
            <Button
              block
              color="danger"
              fill="outline"
              size="large"
              className="delete-btn"
              onClick={handleDelete}
            >
              <DeleteOutlined /> 删除
            </Button>
          </div>
        ) : (
          <div className="archived-notice-detail">
            <span className="archived-icon-small">🔒</span>
            <span className="archived-text-small">账本已封存，无法修改或删除账单</span>
          </div>
        )}
      </div>
    </Popup>
  );
}

export default TransactionDetail;
