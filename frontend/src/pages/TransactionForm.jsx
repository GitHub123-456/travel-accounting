import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Popup, Form, Input, DatePicker, Picker, Button, Toast, Checkbox, TextArea, Selector } from 'antd-mobile';
import { CloseOutline } from 'antd-mobile-icons';
import { transactionAPI } from '../api/transaction';
import { participantAPI } from '../api/participant';
import { exchangeRateAPI } from '../api/exchangeRate';
import { accountBookAPI } from '../api/accountBook';
import dayjs from 'dayjs';
import './TransactionForm.css';

const CATEGORIES = [
  { name: '餐饮', icon: '🍜', color: '#1677ff' },
  { name: '交通', icon: '✈️', color: '#52c41a' },
  { name: '住宿', icon: '🏨', color: '#fa8c16' },
  { name: '购物', icon: '🛍️', color: '#eb2f96' },
  { name: '门票', icon: '🎫', color: '#722ed1' },
  { name: '其他', icon: '📝', color: '#13c2c2' }
];

const SUB_CATEGORIES = {
  '餐饮': ['早餐', '午餐', '晚餐', '零食饮料', '夜宵', '其他'],
  '交通': ['飞机', '火车', '出租车', '公交地铁', '租车', '其他'],
  '住宿': ['酒店', '民宿', '青旅', '其他'],
  '购物': ['服饰', '化妆品', '纪念品', '电子产品', '其他'],
  '门票': ['景点', '演出', '博物馆', '其他'],
  '其他': ['通讯', '保险', '签证', '其他']
};

const PAYMENT_METHODS = [
  { label: '现金', value: 'cash', icon: '💵' },
  { label: '信用卡', value: 'credit', icon: '💳' },
  { label: '其他', value: 'other', icon: '💰' }
];

const CURRENCIES = [
  { label: 'CNY 人民币', value: 'CNY' },
  { label: 'THB 泰铢', value: 'THB' },
  { label: 'USD 美元', value: 'USD' },
  { label: 'EUR 欧元', value: 'EUR' },
  { label: 'JPY 日元', value: 'JPY' },
  { label: 'KRW 韩元', value: 'KRW' }
];

function TransactionForm({ visible: propVisible, onClose, bookId: propBookId, transactionId: propTransactionId, onSuccess }) {
  const params = useParams();
  const navigate = useNavigate();
  const bookId = propBookId || params.id;
  const transactionId = propTransactionId || params.transactionId;
  const isEmbedded = !!propBookId;
  const [form] = Form.useForm();
  const [participants, setParticipants] = useState([]);
  const [type, setType] = useState('personal');
  const [selectedCategory, setSelectedCategory] = useState('餐饮');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('CNY');
  const [selectedPayment, setSelectedPayment] = useState('cash');
  const [currentRate, setCurrentRate] = useState(null);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [excludeFromTotal, setExcludeFromTotal] = useState(false);
  const [amount, setAmount] = useState('');
  const [visible, setVisible] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accountBook, setAccountBook] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

  const isPopupVisible = isEmbedded ? propVisible : visible;

  useEffect(() => {
    if (isEmbedded && propVisible) {
      // 嵌入模式打开时重置表单并重新加载数据
      setAmount('');
      setType('personal');
      setSelectedCategory('餐饮');
      setSelectedSubCategory('');
      setSelectedCurrency('CNY');
      setIsEditMode(!!transactionId);
      form.resetFields();
      loadAccountBook();
      loadParticipants();
      loadExchangeRate();
      if (transactionId) {
        loadTransactionData();
      }
    }
  }, [propVisible]);

  useEffect(() => {
    if (!isEmbedded) {
      loadAccountBook();
      loadParticipants();
      if (transactionId) {
        setIsEditMode(true);
        loadTransactionData();
      }
    }
  }, [bookId, transactionId]);

  useEffect(() => {
    if (bookId) loadExchangeRate();
  }, [bookId, selectedCurrency]);

  const loadAccountBook = async () => {
    try {
      const data = await accountBookAPI.getDetail(bookId);
      setAccountBook(data);
    } catch (error) {
      console.error('加载账本信息失败:', error);
    }
  };

  const loadTransactionData = async () => {
    setLoading(true);
    try {
      const data = await transactionAPI.getDetail(transactionId);
      
      // 设置表单数据
      setAmount(data.amount.toString());
      setSelectedCurrency(data.currency);
      setSelectedCategory(data.category);
      setSelectedSubCategory(data.sub_category || '');
      setSelectedPayment(data.payment_method);
      setType(data.type);
      setSelectedDate(dayjs(data.transaction_time).format('YYYY-MM-DD'));
      
      form.setFieldsValue({
        location: data.location || '',
        remark: data.remark || '',
        payerId: data.payer_id ? [data.payer_id] : undefined,
        participantIds: data.participant_ids || []
      });
    } catch (error) {
      console.error('加载交易数据失败:', error);
      Toast.show({ icon: 'fail', content: '加载数据失败' });
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    try {
      const data = await participantAPI.getList(bookId);
      setParticipants(data || []);
    } catch (error) {
      console.error('加载参与人失败:', error);
    }
  };

  const loadExchangeRate = async () => {
    try {
      const rates = await exchangeRateAPI.getList(bookId);
      setExchangeRates(rates || []);
      
      // 每次都重新获取账本信息以拿到最新的 default_currency
      let bookDefaultCurrency = accountBook?.default_currency;
      try {
        const freshBook = await accountBookAPI.getDetail(bookId);
        setAccountBook(freshBook);
        bookDefaultCurrency = freshBook?.default_currency;
      } catch (e) {}
      
      // 如果当前选的是 CNY，优先选账本默认币种，否则选第一个外币
      if (selectedCurrency === 'CNY' && rates && rates.length > 0) {
        const preferredRate = bookDefaultCurrency ? rates.find(r => r.currency === bookDefaultCurrency) : null;
        const foreignRate = preferredRate || rates.find(r => r.currency !== 'CNY');
        if (foreignRate) {
          setSelectedCurrency(foreignRate.currency);
          setCurrentRate(foreignRate);
          return;
        }
      }
      
      const rate = rates.find(r => r.currency === selectedCurrency);
      setCurrentRate(rate);
    } catch (error) {
      console.error('加载汇率失败:', error);
      setExchangeRates([]);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim()) {
      Toast.show({ icon: 'fail', content: '请输入成员姓名' });
      return;
    }

    try {
      await participantAPI.create(bookId, {
        name: newMemberName.trim(),
        email: newMemberEmail.trim() || '',
      });
      Toast.show({ icon: 'success', content: '添加成功' });
      setNewMemberName('');
      setNewMemberEmail('');
      setShowAddMember(false);
      loadParticipants();
    } catch (error) {
      console.error('添加成员失败:', error);
      Toast.show({ icon: 'fail', content: '添加失败' });
    }
  };

  const onFinish = async (values) => {
    try {
      // 验证共同账单必填字段
      if (type === 'shared') {
        if (!values.payerId || values.payerId.length === 0) {
          Toast.show({ icon: 'fail', content: '请选择付款人' });
          return;
        }
        if (!values.participantIds || values.participantIds.length === 0) {
          Toast.show({ icon: 'fail', content: '请选择参与人' });
          return;
        }
      }

      const transactionData = {
        amount: parseFloat(amount),
        currency: selectedCurrency,
        category: selectedCategory,
        subCategory: selectedSubCategory,
        paymentMethod: selectedPayment,
        transactionTime: dayjs(selectedDate + ' 12:00:00').format('YYYY-MM-DD HH:mm:ss'),
        location: values.location || '',
        remark: values.remark || '',
        type: type,
        payerId: type === 'shared' && values.payerId ? values.payerId[0] : 
                 type === 'personal' ? getMyParticipantId() : null,
        participantIds: type === 'shared' ? values.participantIds : []
      };

      if (isEditMode) {
        await transactionAPI.update(transactionId, transactionData);
        Toast.show({ icon: 'success', content: '修改成功' });
      } else {
        await transactionAPI.create(bookId, transactionData);
        Toast.show({ icon: 'success', content: '记账成功' });
      }

      if (isEmbedded) {
        onSuccess && onSuccess();
        onClose && onClose();
      } else {
        navigate(`/account-books/${bookId}`);
      }
    } catch (error) {
      console.error('操作失败:', error);
      Toast.show({ icon: 'fail', content: error.message || '操作失败' });
    }
  };

  const handleClose = () => {
    if (isEmbedded) {
      onClose && onClose();
    } else {
      navigate(-1);
    }
  };

  const convertedAmount = amount && currentRate 
    ? (parseFloat(amount) * currentRate.rate).toFixed(2)
    : '0.00';

  // 获取当前用户在该账本中的参与人ID
  const getMyParticipantId = () => {
    const userId = parseInt(localStorage.getItem('userId'));
    const myParticipant = participants.find(p => p.user_id === userId);
    return myParticipant ? myParticipant.id : null;
  };

  return (
    <Popup
      visible={isPopupVisible}
      onMaskClick={handleClose}
      position="bottom"
      stopPropagation={[]}
      bodyStyle={{ 
        height: '90vh',
      }}
    >
      <div className="transaction-form">
        {/* 头部 */}
        <div className="form-header">
          <h2>{isEditMode ? '编辑支出' : '记录支出'}</h2>
          <div
            onClick={handleClose}
            onTouchEnd={(e) => { e.preventDefault(); handleClose(); }}
            className="close-btn"
          >
            <CloseOutline fontSize={24} />
          </div>
        </div>

        <div className="form-content">
          <Form
            form={form}
            onFinish={onFinish}
            initialValues={{
              date: new Date(),
              paymentMethod: 'cash'
            }}
            layout="horizontal"
          >
            {/* 日期 */}
            <div className="form-row">
              <div className="form-col">
                <label className="form-label">日期</label>
                <div className="date-picker-wrapper" onClick={() => document.getElementById('tx-date-input')?.showPicker?.()}>
                  <span className="date-picker-icon">📅</span>
                  <span className="date-picker-value">{dayjs(selectedDate).format('YYYY年MM月DD日')}</span>
                  <span className="date-picker-arrow">›</span>
                  <input
                    id="tx-date-input"
                    type="date"
                    className="hidden-date-input"
                    value={selectedDate}
                    max={dayjs().format('YYYY-MM-DD')}
                    min={accountBook ? dayjs(accountBook.start_date).format('YYYY-MM-DD') : undefined}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 币种和金额 */}
            <div className="form-row">
              <div className="form-col small">
                <label className="form-label">币种</label>
                <Picker
                  columns={[CURRENCIES.map(currency => {
                    const hasRate = exchangeRates.some(rate => rate.currency === currency.value);
                    return {
                      ...currency,
                      disabled: !hasRate,
                      label: hasRate ? currency.label : `${currency.label} (未设置汇率)`
                    };
                  })]}
                  value={[selectedCurrency]}
                  onConfirm={(val) => {
                    const hasRate = exchangeRates.some(rate => rate.currency === val[0]);
                    if (!hasRate) {
                      Toast.show({ 
                        icon: 'fail', 
                        content: '该币种未设置汇率，请先在汇率管理中添加' 
                      });
                      return;
                    }
                    setSelectedCurrency(val[0]);
                  }}
                >
                  {(items, actions) => (
                    <div 
                      className="currency-picker-trigger"
                      onClick={() => actions.open()}
                    >
                      <span>{selectedCurrency}</span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M6 8L2 4h8z"/>
                      </svg>
                    </div>
                  )}
                </Picker>
              </div>

              <div className="form-col large">
                <label className="form-label">金额</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={setAmount}
                  style={{
                    '--font-size': '20px',
                    '--text-align': 'right'
                  }}
                />
              </div>
            </div>

            {/* 汇率提示 */}
            {currentRate && amount && (
              <div className="rate-hint">
                <span>1 {selectedCurrency} = {currentRate.rate} CNY</span>
                <span className="rate-converted">≈ ¥{(parseFloat(amount) * currentRate.rate).toFixed(2)}</span>
              </div>
            )}

            {/* 主分类 */}
            <div className="form-section">
              <label className="form-label">主分类</label>
              <div className="category-grid">
                {CATEGORIES.map(cat => (
                  <div
                    key={cat.name}
                    className={`category-item ${selectedCategory === cat.name ? 'active' : ''}`}
                    style={{ 
                      '--category-color': cat.color,
                      backgroundColor: selectedCategory === cat.name ? `${cat.color}20` : 'transparent',
                      borderColor: selectedCategory === cat.name ? cat.color : undefined
                    }}
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setSelectedSubCategory('');
                    }}
                  >
                    <span className="category-icon">{cat.icon}</span>
                    <span className="category-name">{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 子项 */}
            <div className="form-section">
              <label className="form-label">子项</label>
              <div className="sub-category-list">
                {SUB_CATEGORIES[selectedCategory]?.map(sub => (
                  <div
                    key={sub}
                    className={`sub-category-item ${selectedSubCategory === sub ? 'active' : ''}`}
                    onClick={() => setSelectedSubCategory(sub)}
                  >
                    {sub}
                  </div>
                ))}
              </div>
            </div>

            {/* 备注 */}
            <div className="form-section">
              <label className="form-label">备注</label>
              <Form.Item name="remark" noStyle>
                <TextArea
                  placeholder="补充一点说明..."
                  rows={3}
                  style={{
                    '--font-size': '14px',
                    borderRadius: '8px'
                  }}
                />
              </Form.Item>
            </div>

            {/* 地点 */}
            <div className="form-section">
              <label className="form-label">地点</label>
              <Form.Item name="location" noStyle>
                <Input
                  placeholder="消费地点（可选）"
                  style={{
                    '--font-size': '14px',
                    borderRadius: '8px'
                  }}
                />
              </Form.Item>
            </div>

            {/* 分账设置 */}
            <div className="form-section">
              <label className="form-label">分账设置</label>
              <div className="split-type">
                <div
                  className={`split-option ${type === 'personal' ? 'active' : ''}`}
                  onClick={() => setType('personal')}
                >
                  个人账单
                </div>
                <div
                  className={`split-option ${type === 'shared' ? 'active' : ''}`}
                  onClick={() => setType('shared')}
                >
                  共同账单
                </div>
              </div>

              {type === 'shared' && (
                <div className="split-settings">
                  {participants.length === 0 ? (
                    <div className="no-participants">
                      <p>暂无成员，请先添加账本成员</p>
                      <Button
                        size="small"
                        color="primary"
                        onClick={() => setShowAddMember(true)}
                      >
                        快速添加成员
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="form-field">
                        <div className="field-header">
                          <label className="field-label">付款人 *</label>
                          <Button
                            size="mini"
                            fill="none"
                            color="primary"
                            onClick={() => setShowAddMember(true)}
                          >
                            + 添加成员
                          </Button>
                        </div>
                        <Form.Item name="payerId" noStyle>
                          <Selector
                            options={participants.map(p => ({ 
                              label: p.name, 
                              value: p.id 
                            }))}
                            style={{
                              '--border-radius': '8px',
                              '--padding': '12px'
                            }}
                          />
                        </Form.Item>
                      </div>

                      <div className="form-field">
                        <label className="field-label">参与人 *</label>
                        <Form.Item name="participantIds" noStyle>
                          <Selector
                            multiple
                            options={participants.map(p => ({ 
                              label: p.name, 
                              value: p.id 
                            }))}
                            style={{
                              '--border-radius': '8px',
                              '--padding': '12px'
                            }}
                          />
                        </Form.Item>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </Form>
        </div>

        {/* 底部保存按钮 */}
        <div className="form-footer">
          <Button
            block
            color="primary"
            size="large"
            onClick={() => form.submit()}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            保存
          </Button>
        </div>
      </div>

      {/* 快速添加成员弹窗 */}
      <Popup
        visible={showAddMember}
        onMaskClick={() => setShowAddMember(false)}
        bodyStyle={{
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          padding: '24px'
        }}
      >
        <div className="add-member-popup">
          <h3>添加成员</h3>
          <Input
            placeholder="请输入成员姓名"
            value={newMemberName}
            onChange={setNewMemberName}
            style={{
              '--font-size': '16px',
              marginBottom: '12px'
            }}
          />
          <Input
            placeholder="对方邮箱（可选，方便对方登录查看）"
            value={newMemberEmail}
            onChange={setNewMemberEmail}
            type="email"
            style={{
              '--font-size': '14px',
              marginBottom: '16px'
            }}
          />
          <div className="popup-buttons">
            <Button
              block
              color="primary"
              onClick={handleAddMember}
            >
              确定
            </Button>
            <Button
              block
              fill="outline"
              onClick={() => {
                setShowAddMember(false);
                setNewMemberName('');
                setNewMemberEmail('');
              }}
              style={{ marginTop: '12px' }}
            >
              取消
            </Button>
          </div>
        </div>
      </Popup>
    </Popup>
  );
}

export default TransactionForm;
