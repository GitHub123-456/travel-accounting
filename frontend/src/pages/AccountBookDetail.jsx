import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NavBar, Tabs, Card, Button, FloatingBubble, ProgressBar, Empty, Toast, Dialog, ActionSheet, Popup, Form, Input, DatePicker } from 'antd-mobile';
import { LeftOutlined, PlusOutlined, MoreOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { accountBookAPI } from '../api/accountBook';
import { transactionAPI } from '../api/transaction';
import { participantAPI } from '../api/participant';
import { userAPI } from '../api/user';
import ExchangeRateManager from '../components/ExchangeRateManager';
import ParticipantManager from '../components/ParticipantManager';
import TransactionDetail from '../components/TransactionDetail';
import TransactionForm from './TransactionForm';
import AIBillParser from '../components/AIBillParser';
import dayjs from 'dayjs';
import './AccountBookDetail.css';

// 分类图标映射
const CATEGORY_ICONS = {
  '餐饮': '🍪',
  '交通': '✈️',
  '住宿': '🏨',
  '购物': '🛍️',
  '门票': '🎿',
  '其他': '📝'
};

// 分类颜色映射 - 马卡龙色系
const CATEGORY_COLORS = {
  '餐饮': '#FF8A80',
  '交通': '#69DB7C',
  '住宿': '#FFB74D',
  '购物': '#CE93D8',
  '门票': '#64B5F6',
  '其他': '#B0BEC5'
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

function AccountBookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [showRateManager, setShowRateManager] = useState(false);
  const [showParticipantManager, setShowParticipantManager] = useState(false);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [transFilter, setTransFilter] = useState('all');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [defaultCurrency, setDefaultCurrency] = useState('CNY');
  const [editForm] = Form.useForm();
  const [showAIBillParser, setShowAIBillParser] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [aiInputText, setAiInputText] = useState('');
  const [aiFileList, setAiFileList] = useState([]);
  const [statsActiveTab, setStatsActiveTab] = useState('category');

  useEffect(() => {
    loadData();
    loadUserProfile();
  }, [id]);

  const loadUserProfile = async () => {
    try {
      const profile = await userAPI.getProfile();
      setDefaultCurrency(profile.defaultCurrency || 'CNY');
    } catch (error) {
      console.error('加载用户信息失败:', error);
      setDefaultCurrency('CNY');
    }
  };

  const handleUploadCover = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('cover', file);
      try {
        await accountBookAPI.uploadCover(id, fd);
        Toast.show({ icon: 'success', content: '封面已更新' });
        loadData();
      } catch {
        Toast.show({ icon: 'fail', content: '上传失败' });
      }
    };
    input.click();
  };

  const loadData = async (switchToTransactions = false) => {
    setLoading(true);
    try {
      const bookData = await accountBookAPI.getDetail(id);
      setBook(bookData);

      const transData = await transactionAPI.getList(id, {});
      console.log('加载账单列表:', transData);
      setTransactions(Array.isArray(transData.list) ? transData.list : []);

      try {
        const partData = await participantAPI.getList(id);
        setParticipants(Array.isArray(partData) ? partData : []);
      } catch (error) {
        console.log('加载参与人失败，使用空数组', error);
        setParticipants([]);
      }

      if (switchToTransactions) {
        setActiveTab('transactions');
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      Toast.show({ icon: 'fail', content: '加载数据失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    editForm.setFieldsValue({
      name: book.name,
      destination: book.destination,
      start_date: new Date(book.start_date),
      end_date: new Date(book.end_date),
      budget: book.budget ? book.budget.toString() : ''
    });
    setShowEditPopup(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      const updateData = {
        name: values.name,
        destination: values.destination,
        startDate: dayjs(values.start_date).format('YYYY-MM-DD'),
        endDate: dayjs(values.end_date).format('YYYY-MM-DD'),
        budget: values.budget ? parseFloat(values.budget) : null
      };

      await accountBookAPI.update(id, updateData);
      Toast.show({ icon: 'success', content: '修改成功' });
      setShowEditPopup(false);
      loadData();
    } catch (error) {
      console.error('修改失败:', error);
      Toast.show({ icon: 'fail', content: error.message || '修改失败' });
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
        await accountBookAPI.archive(id, true);
        Toast.show({ icon: 'success', content: '封存成功' });
        await loadData();
        setTimeout(() => {
          navigate('/account-books');
        }, 1000);
      } catch (error) {
        console.error('封存失败:', error);
        Toast.show({ icon: 'fail', content: error.message || '封存失败' });
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
        await accountBookAPI.delete(id);
        Toast.show({ icon: 'success', content: '删除成功' });
        navigate('/account-books');
      } catch (error) {
        console.error('删除失败:', error);
        Toast.show({ icon: 'fail', content: '删除失败' });
      }
    }
  };

  if (loading || !book) {
    return (
      <div className="account-book-detail-page">
        <NavBar onBack={() => navigate('/account-books')}>
          {loading ? '加载中...' : '账本不存在'}
        </NavBar>
      </div>
    );
  }

  // 获取币种符号
  const getCurrencySymbol = (currency) => {
    return CURRENCY_SYMBOLS[currency] || currency;
  };

  // 处理点击交易
  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetail(true);
  };

  // 计算统计数据
  const startDate = dayjs(book.start_date);
  const endDate = dayjs(book.end_date);
  const days = endDate.diff(startDate, 'day') + 1;
  const totalExpense = parseFloat(book.totalExpense || 0);
  const budget = parseFloat(book.budget || 0);
  const budgetUsage = budget > 0 ? (totalExpense / budget) * 100 : 0;
  const dailyAverage = days > 0 ? totalExpense / days : 0;

  // 按分类统计
  const categoryStats = {};
  (transactions || []).forEach(trans => {
    const category = trans.category || '其他';
    if (!categoryStats[category]) {
      categoryStats[category] = { amount: 0, count: 0 };
    }
    categoryStats[category].amount += parseFloat(trans.local_amount || 0);
    categoryStats[category].count += 1;
  });

  // 按成员统计 - 增强版
  const memberStats = {};
  (participants || []).forEach(p => {
    memberStats[p.id] = { 
      name: p.name,
      avatar: p.userAvatar || null,
      isSettled: p.is_settled === 1,
      paid: 0,
      shouldPay: 0,
      count: 0,
      participatedCount: 0
    };
  });

  const sharedTransactions = (transactions || []).filter(t => t.type === 'shared');
  
  // 计算每个成员的实际支付金额和参与笔数
  sharedTransactions.forEach(trans => {
    const amount = parseFloat(trans.local_amount || 0);
    
    if (trans.payer_id && memberStats[trans.payer_id]) {
      memberStats[trans.payer_id].paid += amount;
      memberStats[trans.payer_id].count += 1;
    }
    
    if (trans.participant_ids && Array.isArray(trans.participant_ids) && trans.participant_ids.length > 0) {
      const perPersonAmount = amount / trans.participant_ids.length;
      trans.participant_ids.forEach(pid => {
        if (memberStats[pid]) {
          memberStats[pid].participatedCount += 1;
          memberStats[pid].shouldPay += perPersonAmount;
        }
      });
    }
  });

  // 按日期分组
  const transactionsByDate = {};
  (transactions || []).forEach(trans => {
    const date = dayjs(trans.transaction_time).format('YYYY-MM-DD');
    if (!transactionsByDate[date]) {
      transactionsByDate[date] = [];
    }
    transactionsByDate[date].push(trans);
  });

  // 渲染总览标签页
  const renderSummaryTab = () => (
    <div className="tab-content">
      {/* 总支出卡片 + 自动分账按钮 */}
      <div className="expense-card-wrapper">
        <Card className="expense-card">
          <div className="expense-header">
            <span className="expense-label">全员总支出</span>
            <div
              className="auto-calculate-btn"
              onClick={() => navigate(`/account-books/${id}/split-bill`)}
            >
              <span>+ 自动分账</span>
            </div>
          </div>
          <div className="expense-amount">
            <span className="currency">{getCurrencySymbol(defaultCurrency)}</span>
            <span className="amount">{totalExpense.toFixed(2)}</span>
          </div>
        
        {/* 我的预算进度条 */}
        {budget > 0 ? (
          (() => {
            const perPersonBudget = budget;
            // 计算当前用户的实际个人花费（个人支出 + 共同分摊）
            const userId = parseInt(localStorage.getItem('userId'));
            const myPersonalExpense = (transactions || []).filter(t => 
              t.type === 'personal' && t.created_by === userId
            ).reduce((sum, t) => sum + parseFloat(t.local_amount || 0), 0);
            const myParticipantIds = (participants || [])
              .filter(p => p.user_id === userId || p.user_id === String(userId))
              .map(p => p.id);
            let mySharedExpense = 0;
            (transactions || []).filter(t => t.type === 'shared').forEach(t => {
              const amount = parseFloat(t.local_amount || 0);
              if (t.participant_ids && Array.isArray(t.participant_ids) && t.participant_ids.length > 0) {
                const perPerson = amount / t.participant_ids.length;
                t.participant_ids.forEach(pid => {
                  if (myParticipantIds.includes(pid)) mySharedExpense += perPerson;
                });
              }
            });
            const myTotalExpense = myPersonalExpense + mySharedExpense;
            const myUsage = (myTotalExpense / perPersonBudget) * 100;
            const myRemaining = perPersonBudget - myTotalExpense;
            return (
          <div className="budget-progress">
            <div className="budget-info">
              <span className="budget-text">我的预算 {getCurrencySymbol(defaultCurrency)}{perPersonBudget.toFixed(2)}</span>
              <span className={`budget-percentage ${myUsage >= 80 ? 'warning' : ''}`}>
                已用{myUsage.toFixed(0)}%
              </span>
            </div>
            <ProgressBar 
              percent={Math.min(myUsage, 100)} 
              style={{
                '--fill-color': myUsage >= 80 ? '#ffc53d' : '#C8E64E',
                '--track-color': 'rgba(255, 255, 255, 0.25)',
                '--track-width': '8px'
              }}
            />
            {myRemaining < 0 ? (
              <div className="budget-status over">
                <span className="over-icon">⚠️</span> 超支 {getCurrencySymbol(defaultCurrency)}{Math.abs(myRemaining).toFixed(2)}
              </div>
            ) : myUsage >= 80 ? (
              <div className="budget-status warning">剩余 {getCurrencySymbol(defaultCurrency)}{myRemaining.toFixed(2)}</div>
            ) : (
              <div className="budget-status normal">剩余 {getCurrencySymbol(defaultCurrency)}{myRemaining.toFixed(2)}</div>
            )}
          </div>
            );
          })()
        ) : null}
      </Card>
      </div>

      {/* 管理功能区 - 仅在未封存时显示 */}
      {!book.is_archived ? (
        <div className="management-section">
          <div className="management-item" onClick={() => setShowRateManager(true)}>
            <div className="management-icon rate-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1V23" stroke="#2d8659" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="#2d8659" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="management-label">汇率管理</div>
          </div>
          <div className="management-item" onClick={() => setShowParticipantManager(true)}>
            <div className="management-icon member-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="#2d8659" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="#2d8659" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 8V14" stroke="#2d8659" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M23 11H17" stroke="#2d8659" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="management-label">成员管理</div>
          </div>
        </div>
      ) : null}

      {/* 封存提示卡片 */}
      {book.is_archived ? (
        <Card className="archived-notice-card">
          <div className="archived-notice">
            <span className="archived-icon">🔒</span>
            <div className="archived-text">
              <div className="archived-title">账本已封存</div>
              <div className="archived-desc">此账本为只读状态，无法进行任何修改</div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* 个人合计统计 */}
      <div className="personal-stats-section">
        <div className="stats-row">
          <div className="stat-card personal-card">
            <div className="stat-content">
              <div className="stat-label">个人支出</div>
              <div className="stat-value">
                {(() => {
                  const userId = parseInt(localStorage.getItem('userId'));
                  const amount = (transactions || []).filter(t => 
                    t.type === 'personal' && t.created_by === userId
                  ).reduce((sum, t) => sum + parseFloat(t.local_amount || 0), 0);
                  const formatted = amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2);
                  return `${getCurrencySymbol(defaultCurrency)}${formatted}`;
                })()}
              </div>
            </div>
          </div>
          
          <div className="stat-card shared-card">
            <div className="stat-content">
              <div className="stat-label">共同支出</div>
              <div className="stat-value">
                {(() => {
                  const sharedTransactions = (transactions || []).filter(t => t.type === 'shared');
                  const totalShared = sharedTransactions.reduce((sum, t) => sum + parseFloat(t.local_amount || 0), 0);
                  const formatted = totalShared % 1 === 0 ? totalShared.toFixed(0) : totalShared.toFixed(2);
                  return `${getCurrencySymbol(defaultCurrency)}${formatted}`;
                })()}
              </div>
            </div>
          </div>
        </div>
        
        <div className="stat-card-full total-card">
          <div className="stat-content-full">
            <div className="stat-label-large">个人总计</div>
            <div className="stat-value-large">
              {(() => {
                const userId = parseInt(localStorage.getItem('userId'));
                const myParticipantIds = (participants || [])
                  .filter(p => p.user_id === userId || p.user_id === String(userId))
                  .map(p => p.id);
                const personalTotal = (transactions || []).filter(t => 
                  t.type === 'personal' && t.created_by === userId
                ).reduce((sum, t) => sum + parseFloat(t.local_amount || 0), 0);
                
                let userShouldPay = 0;
                myParticipantIds.forEach(pid => {
                  if (memberStats[pid]) {
                    userShouldPay += memberStats[pid].shouldPay || 0;
                  }
                });
                
                const total = personalTotal + userShouldPay;
                const formatted = total % 1 === 0 ? total.toFixed(0) : total.toFixed(2);
                return `${getCurrencySymbol(defaultCurrency)}${formatted}`;
              })()}
            </div>
            <div className="stat-hint-large">个人支出 + 共同分摊</div>
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染账单明细标签页
  const renderTransactionsTab = () => {
    const currentUserId = parseInt(localStorage.getItem('userId'));

    let filteredTransactions = transactions || [];
    if (transFilter === 'personal') {
      filteredTransactions = filteredTransactions.filter(t => t.type === 'personal' && t.created_by === currentUserId);
    } else if (transFilter === 'shared') {
      filteredTransactions = filteredTransactions.filter(t => t.type === 'shared');
    }

    const filteredByDate = {};
    filteredTransactions.forEach(trans => {
      const date = dayjs(trans.transaction_time).format('YYYY-MM-DD');
      if (!filteredByDate[date]) filteredByDate[date] = [];
      filteredByDate[date].push(trans);
    });

    return (
      <div className="tab-content">
        <div className="trans-filter-bar">
          {[
            { key: 'all', label: '全部' },
            { key: 'personal', label: '我的个人' },
            { key: 'shared', label: '共同账单' },
          ].map(item => (
            <div
              key={item.key}
              className={`trans-filter-item ${transFilter === item.key ? 'active' : ''}`}
              onClick={() => setTransFilter(item.key)}
            >
              {item.label}
            </div>
          ))}
        </div>

        {filteredTransactions.length === 0 ? (
          <Empty description={transFilter === 'personal' ? '暂无个人账单' : transFilter === 'shared' ? '暂无共同账单' : '暂无账单记录'} />
        ) : (
          <div className="transactions-list">
            {Object.entries(filteredByDate)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([date, trans]) => (
                <div key={date} className="date-group">
                  <div className="date-header">
                    <span className="date-label">{dayjs(date).format('MM月DD日')}</span>
                    <span className="date-total">
                      {getCurrencySymbol(defaultCurrency)}{(trans || []).reduce((sum, t) => sum + parseFloat(t.local_amount || 0), 0).toFixed(2)}
                    </span>
                  </div>
                  {(trans || []).map(transaction => {
                    const participantNames = transaction.participants || [];
                    const participantCount = participantNames.length;

                    return (
                      <div
                        key={transaction.id}
                        className="transaction-item"
                        onClick={() => handleTransactionClick(transaction)}
                      >
                        <div
                          className="trans-icon"
                          style={{ background: `${CATEGORY_COLORS[transaction.category] || '#B0BEC5'}20` }}
                        >
                          {CATEGORY_ICONS[transaction.category] || '📝'}
                        </div>
                        <div className="trans-info">
                          <div className="trans-category">
                            {transaction.category}
                          </div>
                          <div className="trans-meta">
                            {transaction.type === 'shared' && transaction.payerName && (
                              <span>【{transaction.payerName}】付款</span>
                            )}
                            {transaction.type === 'shared' && participantCount > 0 && (
                              <span>参与人{participantCount}</span>
                            )}
                            {transaction.type === 'personal' && transaction.creatorName && (
                              <span>{transaction.creatorName}</span>
                            )}
                          </div>
                        </div>
                        <div className="trans-amount-group">
                          <div className="trans-amount">{getCurrencySymbol(defaultCurrency)}{transaction.local_amount}</div>
                          {transaction.currency !== defaultCurrency && (
                            <div className="trans-original">
                              {getCurrencySymbol(transaction.currency)} {transaction.amount}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        )}
      </div>
    );
  };

  // 渲染统计标签页（包含多个子tab）
  const renderCategoryStatsTab = () => {
    const subTabs = [
      { key: 'category', title: '分类统计' },
      { key: 'trend', title: '趋势分析' },
      { key: 'payer', title: '消费排行' },
      { key: 'my', title: '我的统计' }
    ];

    const renderCategoryContent = () => {
      const sortedCategories = Object.entries(categoryStats)
        .sort((a, b) => b[1].amount - a[1].amount);

      if (sortedCategories.length === 0) {
        return (
          <div className="tab-content">
            <Empty description="暂无消费数据" />
          </div>
        );
      }

      const pieData = sortedCategories.map(([category, stats]) => ({
        name: category,
        value: stats.amount,
        count: stats.count,
        color: CATEGORY_COLORS[category] || '#95a5a6'
      }));

      const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
        const RADIAN = Math.PI / 180;
        const radius = outerRadius * 0.65;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        if (percent < 0.03) return null;

        return (
          <text
            x={x}
            y={y}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: '12px', fontWeight: '600', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            {`${name} ${(percent * 100).toFixed(0)}%`}
          </text>
        );
      };

      return (
        <div className="tab-content">
          <Card className="pie-chart-card">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderLabel}
                  outerRadius={110}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <div className="category-detail-list">
            {sortedCategories.map(([category, stats]) => {
              const percentage = totalExpense > 0 ? (stats.amount / totalExpense) * 100 : 0;
              return (
                <div key={category} className="category-detail-item">
                  <div className="category-detail-left">
                    <span 
                      className="category-color-dot" 
                      style={{ backgroundColor: CATEGORY_COLORS[category] || '#95a5a6' }}
                    />
                    <span className="category-detail-icon">{CATEGORY_ICONS[category] || '📝'}</span>
                    <span className="category-detail-name">{category}</span>
                    <span className="category-detail-count">{stats.count}笔</span>
                  </div>
                  <div className="category-detail-right">
                    <span className="category-detail-amount">{getCurrencySymbol(defaultCurrency)}{stats.amount.toFixed(0)}</span>
                    <span className="category-detail-percent">{percentage.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    const renderTrendContent = () => {
      const dailyStats = {};
      (transactions || []).forEach(trans => {
        const date = dayjs(trans.transaction_time).format('MM.DD');
        if (!dailyStats[date]) dailyStats[date] = 0;
        dailyStats[date] += parseFloat(trans.local_amount || 0);
      });

      const trendData = Object.entries(dailyStats)
        .sort((a, b) => a[0].localeCompare(b[0]));

      if (trendData.length === 0) {
        return (
          <div className="tab-content">
            <Empty description="暂无趋势数据" />
          </div>
        );
      }

      const maxAmount = Math.max(...trendData.map(([_, amount]) => amount));

      return (
        <div className="tab-content">
          <Card className="trend-card">
            <div className="trend-summary">
              <div className="trend-info">
                <span className="trend-label">日均消费</span>
                <span className="trend-value">{getCurrencySymbol(defaultCurrency)}{dailyAverage.toFixed(0)}</span>
              </div>
              <div className="trend-info">
                <span className="trend-label">最高单日</span>
                <span className="trend-value">{getCurrencySymbol(defaultCurrency)}{maxAmount.toFixed(0)}</span>
              </div>
            </div>
          </Card>

          <div className="trend-bar-list">
            {trendData.map(([date, amount]) => {
              const heightPercent = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
              return (
                <div key={date} className="trend-bar-item">
                  <div className="trend-bar-value">{getCurrencySymbol(defaultCurrency)}{amount.toFixed(0)}</div>
                  <div className="trend-bar-track">
                    <div 
                      className="trend-bar-fill" 
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <div className="trend-bar-date">{date}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    const renderPayerContent = () => {
      const payerStats = {};
      const currentUserId = parseInt(localStorage.getItem('userId'));
      const budgetPerPerson = budget > 0 ? budget / (participants || []).length : 0;

      (transactions || []).forEach(trans => {
        let payerName = trans.payerName || trans.creatorName || '未知';
        const amount = parseFloat(trans.local_amount || 0);

        if (!payerStats[payerName]) {
          payerStats[payerName] = { total: 0, count: 0, categories: {} };
        }
        payerStats[payerName].total += amount;
        payerStats[payerName].count += 1;

        const cat = trans.category || '其他';
        if (!payerStats[payerName].categories[cat]) {
          payerStats[payerName].categories[cat] = 0;
        }
        payerStats[payerName].categories[cat] += amount;
      });

      const sortedPayers = Object.entries(payerStats).sort((a, b) => b[1].total - a[1].total);

      if (sortedPayers.length === 0) {
        return (
          <div className="tab-content">
            <Empty description="暂无消费数据" />
          </div>
        );
      }

      return (
        <div className="tab-content">
          {budgetPerPerson > 0 && (
            <div className="payer-budget-header">
              <span>人均预算</span>
              <span className="payer-budget-value">{getCurrencySymbol(defaultCurrency)}{budgetPerPerson.toFixed(0)}</span>
            </div>
          )}
          <div className="payer-rank-list">
            {sortedPayers.map(([name, stats], index) => {
              const budgetUsage = budgetPerPerson > 0 ? (stats.total / budgetPerPerson) * 100 : 0;
              const barWidth = Math.min(budgetUsage, 100);
              const isOverBudget = budgetUsage > 100;
              const remaining = budgetPerPerson - stats.total;
              const isCurrentUser = name === (participants || []).find(p => p.user_id === currentUserId)?.name;

              return (
                <div key={name} className={`payer-rank-item ${isCurrentUser ? 'payer-rank-me' : ''}`}>
                  <div className="payer-rank-top">
                    <div className="payer-rank-left">
                      <div className={`payer-rank-badge ${index < 3 ? 'top' : ''}`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '' : `${index + 1}`}
                      </div>
                      <div className="payer-rank-info">
                        <div className="payer-rank-name">
                          {name}
                          {isCurrentUser && <span className="payer-badge-me">我</span>}
                        </div>
                        <div className="payer-rank-meta">{stats.count}笔 · {Object.keys(stats.categories).length}个分类</div>
                      </div>
                    </div>
                    <div className="payer-rank-right">
                      <div className="payer-rank-amount">{getCurrencySymbol(defaultCurrency)}{stats.total.toFixed(0)}</div>
                      <div className={`payer-rank-percent ${isOverBudget ? 'over' : ''}`}>
                        {isOverBudget ? `超${getCurrencySymbol(defaultCurrency)}${Math.abs(remaining).toFixed(0)}` : `剩${getCurrencySymbol(defaultCurrency)}${remaining.toFixed(0)}`}
                      </div>
                    </div>
                  </div>
                  <div className="payer-rank-bar-track">
                    <div className={`payer-rank-bar-fill ${isOverBudget ? 'over' : ''}`} style={{ width: `${barWidth}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    const renderMyContent = () => {
      const currentUserId = parseInt(localStorage.getItem('userId'));

      const myPersonalTrans = (transactions || []).filter(t => 
        t.type === 'personal' && t.created_by === currentUserId
      );
      const myPersonalTotal = myPersonalTrans.reduce((sum, t) => sum + parseFloat(t.local_amount || 0), 0);
      const myPersonalCount = myPersonalTrans.length;

      const mySharedTrans = (transactions || []).filter(t => 
        t.type === 'shared' && t.created_by === currentUserId
      );
      const mySharedTotal = mySharedTrans.reduce((sum, t) => sum + parseFloat(t.local_amount || 0), 0);
      const mySharedCount = mySharedTrans.length;

      const myCategoryStats = {};
      myPersonalTrans.concat(mySharedTrans).forEach(trans => {
        const cat = trans.category || '其他';
        if (!myCategoryStats[cat]) myCategoryStats[cat] = { amount: 0, count: 0 };
        myCategoryStats[cat].amount += parseFloat(trans.local_amount || 0);
        myCategoryStats[cat].count += 1;
      });
      const sortedMyCats = Object.entries(myCategoryStats).sort((a, b) => b[1].amount - a[1].amount);
      const myTotal = myPersonalTotal + mySharedTotal;

      let myShouldPay = 0;
      const myParticipantIds = (participants || [])
        .filter(p => p.user_id === currentUserId || p.user_id === String(currentUserId))
        .map(p => p.id);
      myParticipantIds.forEach(pid => {
        if (memberStats[pid]) myShouldPay += memberStats[pid].shouldPay || 0;
      });

      if (myPersonalCount === 0 && mySharedCount === 0) {
        return (
          <div className="tab-content">
            <Empty description="暂无个人消费数据" />
          </div>
        );
      }

      return (
        <div className="tab-content">
          <div className="my-stats-overview">
            <div className="my-main-card">
              <div className="my-main-label">我的总支出</div>
              <div className="my-main-amount">{getCurrencySymbol(defaultCurrency)}{myTotal.toFixed(2)}</div>
            </div>
            <div className="my-sub-cards">
              <div className="my-sub-card">
                <div className="my-sub-icon">📝</div>
                <div className="my-sub-label">个人账单</div>
                <div className="my-sub-value">{myPersonalCount}笔</div>
                <div className="my-sub-detail">{getCurrencySymbol(defaultCurrency)}{myPersonalTotal.toFixed(0)}</div>
              </div>
              <div className="my-sub-card">
                <div className="my-sub-icon">👥</div>
                <div className="my-sub-label">共同账单</div>
                <div className="my-sub-value">{mySharedCount}笔</div>
                <div className="my-sub-detail">{getCurrencySymbol(defaultCurrency)}{mySharedTotal.toFixed(0)}</div>
              </div>
              <div className="my-sub-card">
                <div className="my-sub-icon">💰</div>
                <div className="my-sub-label">应付分摊</div>
                <div className="my-sub-value">{getCurrencySymbol(defaultCurrency)}{myShouldPay.toFixed(2)}</div>
                <div className="my-sub-detail">共同支出份额</div>
              </div>
            </div>
          </div>

          {sortedMyCats.length > 0 && (
            <div className="my-category-list">
              <div className="my-category-title">我的消费分类</div>
              {sortedMyCats.map(([category, stats]) => {
                const percentage = myTotal > 0 ? (stats.amount / myTotal) * 100 : 0;
                const barWidth = stats.amount > 0 ? (stats.amount / sortedMyCats[0][1].amount) * 100 : 0;
                return (
                  <div key={category} className="my-category-item">
                    <div className="my-category-left">
                      <span className="category-color-dot" style={{ backgroundColor: CATEGORY_COLORS[category] || '#95a5a6' }} />
                      <span className="category-detail-icon">{CATEGORY_ICONS[category] || '📝'}</span>
                      <div className="my-category-info">
                        <div className="my-category-name">{category}</div>
                        <div className="my-category-bar">
                          <div className="my-category-bar-fill" style={{ width: `${barWidth}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="my-category-right">
                      <div className="category-detail-amount">{getCurrencySymbol(defaultCurrency)}{stats.amount.toFixed(0)}</div>
                      <div className="category-detail-percent">{stats.count}笔 · {percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="stats-panel">
        <Tabs
          activeKey={statsActiveTab}
          onChange={setStatsActiveTab}
          style={{
            '--title-font-size': '13px',
            '--active-line-color': '#C8E64E',
            '--fixed-active-line-color': '#C8E64E',
          }}
        >
          {subTabs.map(tab => (
            <Tabs.Tab key={tab.key} title={tab.title} />
          ))}
        </Tabs>

        <div className="stats-sub-content">
          {statsActiveTab === 'category' && renderCategoryContent()}
          {statsActiveTab === 'trend' && renderTrendContent()}
          {statsActiveTab === 'payer' && renderPayerContent()}
          {statsActiveTab === 'my' && renderMyContent()}
        </div>
      </div>
    );
  };

  // 渲染成员统计标签页
  const renderMemberStatsTab = () => {
    const sortedMembers = Object.entries(memberStats)
      .sort((a, b) => {
        const balanceA = b[1].paid - b[1].shouldPay;
        const balanceB = a[1].paid - a[1].shouldPay;
        return Math.abs(balanceB) - Math.abs(balanceA);
      });

    if (sortedMembers.length === 0) {
      return (
        <div className="tab-content">
          <Empty description="暂无成员数据" />
        </div>
      );
    }

    const sharedTransactions = (transactions || []).filter(t => t.type === 'shared');
    const totalShared = sharedTransactions.reduce((sum, t) => sum + parseFloat(t.local_amount || 0), 0);
    const avgPerPerson = participants.length > 0 ? totalShared / participants.length : 0;

    return (
      <div className="tab-content">
        <Card className="shared-expense-card">
          <div className="shared-expense-header">
            <span className="shared-expense-label">共同支出总额</span>
            <span className="shared-expense-amount">
              {getCurrencySymbol(defaultCurrency)}{totalShared.toFixed(2)}
            </span>
          </div>
          <div className="shared-expense-info">
            <span>共{participants.length}人 · 人均{getCurrencySymbol(defaultCurrency)}{avgPerPerson.toFixed(0)}</span>
          </div>
        </Card>

        <div className="member-stats-list">
          {sortedMembers.map(([id, stats]) => {
            const balance = stats.paid - stats.shouldPay;
            const isBalanced = Math.abs(balance) < 0.01;
            const shouldReceive = balance > 0;
            
            return (
              <div key={id} className="member-stat-card">
                <div className="member-stat-header">
                  {stats.avatar ? (
                    <img src={stats.avatar} alt="" className="member-stat-avatar-img" />
                  ) : (
                    <div className="member-stat-avatar">
                      {stats.name.charAt(0)}
                    </div>
                  )}
                  <div className="member-stat-info">
                    <div className="member-stat-name">{stats.name}</div>
                    <div className="member-stat-meta">
                      支付{stats.count}笔 · 参与{stats.participatedCount}笔
                    </div>
                  </div>
                  {!isBalanced && (
                    stats.isSettled ? (
                      <div className="member-balance-badge settled">✅ 已结清</div>
                    ) : (
                      <div className={`member-balance-badge ${shouldReceive ? 'receive' : 'pay'}`}>
                        {shouldReceive ? '待收款' : '需支付'}
                      </div>
                    )
                  )}
                </div>
                
                <div className="member-stat-details">
                  <div className="member-stat-row">
                    <span className="stat-label">实际支付</span>
                    <span className="stat-value paid">{getCurrencySymbol(defaultCurrency)}{stats.paid.toFixed(2)}</span>
                  </div>
                  <div className="member-stat-row">
                    <span className="stat-label">应付金额</span>
                    <span className="stat-value should">{getCurrencySymbol(defaultCurrency)}{stats.shouldPay.toFixed(2)}</span>
                  </div>
                  <div className="member-stat-divider"></div>
                  <div className="member-stat-row balance-row">
                    <span className="stat-label-bold">
                      {isBalanced ? '已平衡' : shouldReceive ? '待收款' : '需支付'}
                    </span>
                    <span className={`stat-value-bold ${isBalanced ? 'balanced' : shouldReceive ? 'receive' : 'pay'}`}>
                      {isBalanced ? '¥0.00' : `${getCurrencySymbol(defaultCurrency)}${Math.abs(balance).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="member-stats-footer">
          <Button
            block
            color="primary"
            size="large"
            onClick={() => navigate(`/account-books/${id}/split-bill`)}
            style={{
              '--background-color': '#C8E64E',
              '--border-radius': '12px'
            }}
          >
            查看详细分账方案
          </Button>
        </div>
      </div>
    );
  };

  // 构建标签页数据
  const tabs = [
    { key: 'summary', title: '总览' },
    { key: 'transactions', title: '账单明细' },
    { key: 'categories', title: '统计' },
    { key: 'members', title: '成员统计' }
  ];

  return (
    <div className="account-book-detail-page">
      {/* 顶部背景区域 */}
      <div className="detail-header-bg" style={book.cover ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.15)), url(${book.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
        <div className="header-nav">
          <Button 
            fill="none" 
            onClick={() => navigate('/account-books')}
            className="back-btn"
          >
            <LeftOutlined fontSize={24} color="white" />
          </Button>
          <div className="header-title">{book.name}</div>
          <Button 
            fill="none" 
            onClick={() => setShowActionSheet(true)}
            className="settings-btn"
          >
            <MoreOutlined fontSize={24} color="white" />
          </Button>
        </div>
        <div className="header-info">
          <div className="header-destination">{book.destination}</div>
          <div className="header-dates">
            {startDate.format('MM.DD')} - {endDate.format('MM.DD')} · {days}天
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="detail-tabs">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          style={{
            '--title-font-size': '15px',
          }}
        >
          {tabs.map(tab => (
            <Tabs.Tab key={tab.key} title={tab.title}>
              {tab.key === 'summary' && renderSummaryTab()}
              {tab.key === 'transactions' && renderTransactionsTab()}
              {tab.key === 'categories' && renderCategoryStatsTab()}
              {tab.key === 'members' && renderMemberStatsTab()}
            </Tabs.Tab>
          ))}
        </Tabs>
      </div>

      {/* 浮动按钮 - 仅在总览页且未封存时显示 */}
      {!book.is_archived && activeTab === 'summary' && (
        <>
          <div 
            className="floating-record-btn ai-btn-left"
            onClick={() => setShowAIBillParser(true)}
          >
            <span className="ai-btn-icon">🤖</span>
          </div>
          <div 
            className="floating-record-btn"
            onClick={() => { setEditingTransactionId(null); setShowTransactionForm(true); }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#fff"/>
            </svg>
          </div>
        </>
      )}

      {/* 汇率管理弹窗 */}
      <ExchangeRateManager
        visible={showRateManager}
        onClose={() => setShowRateManager(false)}
        bookId={id}
        isArchived={book?.is_archived}
        bookDefaultCurrency={book?.default_currency}
        onUpdate={loadData}
      />

      {/* 成员管理弹窗 */}
      <ParticipantManager
        visible={showParticipantManager}
        onClose={() => setShowParticipantManager(false)}
        bookId={id}
        isArchived={book?.is_archived}
        onUpdate={loadData}
        bookOwnerId={book?.user_id}
      />

      {/* 交易详情弹窗 */}
      <TransactionDetail
        visible={showTransactionDetail}
        onClose={() => setShowTransactionDetail(false)}
        transaction={selectedTransaction}
        bookId={id}
        onUpdate={loadData}
        isArchived={book?.is_archived}
        onEdit={(txId) => { setEditingTransactionId(txId); setShowTransactionForm(true); }}
      />

      {/* 记账弹窗 */}
      <TransactionForm
        visible={showTransactionForm}
        onClose={() => setShowTransactionForm(false)}
        bookId={id}
        transactionId={editingTransactionId}
        onSuccess={loadData}
      />

      {/* AI智能记账弹窗 */}
      <AIBillParser
        visible={showAIBillParser}
        onClose={() => setShowAIBillParser(false)}
        bookId={id}
        participants={participants}
        onSuccess={loadData}
        chatMessages={aiChatMessages}
        setChatMessages={setAiChatMessages}
        inputText={aiInputText}
        setInputText={setAiInputText}
        fileList={aiFileList}
        setFileList={setAiFileList}
      />

      {/* 操作菜单 */}
      <ActionSheet
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        actions={[
          ...(!book.is_archived ? [
            {
              text: '更换封面',
              key: 'cover',
              description: '上传自定义封面图片'
            },
            {
              text: '编辑账本',
              key: 'edit',
              description: '修改账本信息'
            },
            {
              text: '封存账本',
              key: 'archive',
              description: '封存后将无法修改'
            }
          ] : []),
          {
            text: '删除账本',
            key: 'delete',
            description: '删除后无法恢复',
            danger: true
          }
        ]}
        onAction={(action) => {
          setShowActionSheet(false);
          if (action.key === 'cover') {
            handleUploadCover();
          } else if (action.key === 'edit') {
            handleEdit();
          } else if (action.key === 'archive') {
            handleArchive();
          } else if (action.key === 'delete') {
            handleDelete();
          }
        }}
        cancelText="取消"
      />

      {/* 编辑账本弹窗 */}
      <Popup
        visible={showEditPopup}
        onMaskClick={() => setShowEditPopup(false)}
        bodyStyle={{ 
          borderTopLeftRadius: '16px', 
          borderTopRightRadius: '16px',
          minHeight: '60vh',
          padding: '20px'
        }}
      >
        <div className="edit-popup-header">
          <h3>编辑账本</h3>
        </div>
        <Form
          form={editForm}
          layout="horizontal"
          footer={
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button 
                block 
                onClick={() => setShowEditPopup(false)}
                style={{ flex: 1 }}
              >
                取消
              </Button>
              <Button 
                block 
                type="submit" 
                color="primary"
                onClick={handleEditSubmit}
                style={{ flex: 1 }}
              >
                保存
              </Button>
            </div>
          }
        >
          <Form.Item
            name="name"
            label="账本名称"
            rules={[{ required: true, message: '请输入账本名称' }]}
          >
            <Input placeholder="请输入账本名称" />
          </Form.Item>
          <Form.Item
            name="destination"
            label="目的地"
            rules={[{ required: true, message: '请输入目的地' }]}
          >
            <Input placeholder="请输入目的地" />
          </Form.Item>
          <Form.Item
            name="start_date"
            label="开始日期"
            rules={[{ required: true, message: '请选择开始日期' }]}
            trigger="onConfirm"
            onClick={(e, datePickerRef) => {
              datePickerRef.current?.open();
            }}
          >
            <DatePicker precision="day">
              {value => (
                <div style={{ 
                  padding: '8px 12px', 
                  background: '#f5f5f5', 
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  {value ? dayjs(value).format('YYYY-MM-DD') : '请选择日期'}
                </div>
              )}
            </DatePicker>
          </Form.Item>
          <Form.Item
            name="end_date"
            label="结束日期"
            rules={[{ required: true, message: '请选择结束日期' }]}
            trigger="onConfirm"
            onClick={(e, datePickerRef) => {
              datePickerRef.current?.open();
            }}
          >
            <DatePicker precision="day">
              {value => (
                <div style={{ 
                  padding: '8px 12px', 
                  background: '#f5f5f5', 
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  {value ? dayjs(value).format('YYYY-MM-DD') : '请选择日期'}
                </div>
              )}
            </DatePicker>
          </Form.Item>
          <Form.Item
            name="budget"
            label="人均预算"
          >
            <Input type="number" placeholder="请输入人均预算（可选）" />
          </Form.Item>
        </Form>
      </Popup>
    </div>
  );
}

export default AccountBookDetail;
