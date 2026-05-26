import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NavBar, Card, Button, Toast, Switch } from 'antd-mobile';
import { DownOutlined, RightOutlined } from '@ant-design/icons';
import { splitBillAPI } from '../api/splitBill';
import { participantAPI } from '../api/participant';
import './SplitBill.css';

function SplitBill() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);
  const [settledStatus, setSettledStatus] = useState({});
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const result = await splitBillAPI.calculate(id);
      setData(result);
      
      // 从后端加载结清状态
      const status = {};
      result.participants?.forEach(p => {
        status[p.participantId] = p.isSettled || false;
      });
      setSettledStatus(status);
    } catch (error) {
      console.error('加载分账数据失败:', error);
      Toast.show({ icon: 'fail', content: '加载失败' });
    }
  };

  const toggleExpand = (participantId) => {
    setExpandedIds(prev => {
      if (prev.includes(participantId)) {
        return prev.filter(id => id !== participantId);
      } else {
        return [...prev, participantId];
      }
    });
  };

  const toggleSettled = async (participantId) => {
    const newStatus = !settledStatus[participantId];
    
    try {
      // 更新本地状态
      setSettledStatus(prev => ({
        ...prev,
        [participantId]: newStatus
      }));
      
      // 保存到后端
      await splitBillAPI.updateSettledStatus(id, participantId, newStatus);
      Toast.show({ 
        icon: 'success', 
        content: newStatus ? '已标记为结清' : '已取消结清' 
      });
    } catch (error) {
      console.error('更新结清状态失败', error);
      // 恢复原状态
      setSettledStatus(prev => ({
        ...prev,
        [participantId]: !newStatus
      }));
      Toast.show({ icon: 'fail', content: '更新失败' });
    }
  };

  const getBalanceColor = (balance) => {
    if (balance > 0) return '#8BA830'; // 黄绿 - 待收
    if (balance < 0) return '#e74c3c'; // 红色 - 应付
    return '#999'; // 灰色 - 已平衡
  };

  const getBalanceText = (balance) => {
    if (balance > 0) return '待收金额';
    if (balance < 0) return '应付金额';
    return '已平衡';
  };

  // 获取需要支付给谁
  const getPaymentTarget = (participant) => {
    if (participant.balance >= 0) {
      return null;
    }
    const receivers = data.participants?.filter(p => p.balance > 0) || [];
    return receivers;
  };

  // 获取从谁那里收款
  const getReceiveFrom = (participant) => {
    if (participant.balance <= 0) {
      return null;
    }
    const payers = data.participants?.filter(p => p.balance < 0) || [];
    return payers;
  };

  if (!data) return null;

  return (
    <div className="split-bill-page">
      <NavBar onBack={() => navigate(`/account-books/${id}`)}>
        自动分账
      </NavBar>

      <div className="split-content">
        {/* 说明提示 */}
        <div className="split-tip" onClick={() => setShowRules(!showRules)}>
          <span className="tip-icon">💡</span>
          <span className="tip-text">分账规则说明</span>
          {showRules ? (
            <DownOutlined fontSize={18} color="#A8C43A" />
          ) : (
            <RightOutlined fontSize={18} color="#A8C43A" />
          )}
        </div>

        {/* 规则说明内容 */}
        {showRules && (
          <div className="rules-content">
            <div className="rule-item">
              <span className="rule-number">1.</span>
              <span className="rule-text">系统自动计算每个人的实际支付金额和应分摊金额</span>
            </div>
            <div className="rule-item">
              <span className="rule-number">2.</span>
              <span className="rule-text">待收金额：实际支付超过应分摊部分，需要从其他人收回</span>
            </div>
            <div className="rule-item">
              <span className="rule-number">3.</span>
              <span className="rule-text">应付金额：实际支付少于应分摊部分，需要支付给其他人</span>
            </div>
            <div className="rule-item">
              <span className="rule-number">4.</span>
              <span className="rule-text">点击参与人卡片可查看详细的支付流向关系</span>
            </div>
            <div className="rule-item">
              <span className="rule-number">5.</span>
              <span className="rule-text">结算后可标记状态，方便记录已完成的转账</span>
            </div>
          </div>
        )}

        {/* 参与人列表 */}
        <div className="participants-list">
          {data.participants?.map(participant => {
            const isExpanded = expandedIds.includes(participant.participantId);
            const isSettled = settledStatus[participant.participantId];
            const balanceColor = getBalanceColor(participant.balance);
            const balanceText = getBalanceText(participant.balance);

            return (
              <div key={participant.participantId} className="participant-card">
                {/* 主信息 */}
                <div 
                  className="participant-header"
                  onClick={() => toggleExpand(participant.participantId)}
                >
                  <div className="participant-left">
                    {participant.participantAvatar ? (
                      <img src={participant.participantAvatar} alt="" className="participant-avatar-img" />
                    ) : (
                      <div className="participant-avatar">
                        {participant.participantName.charAt(0)}
                      </div>
                    )}
                    <span className="participant-name">{participant.participantName}</span>
                  </div>
                  <div className="participant-right">
                    <span className="balance-label">{balanceText}</span>
                    <span className="balance-amount" style={{ color: balanceColor }}>
                      ¥{Math.abs(participant.balance).toFixed(2)}
                    </span>
                    {isExpanded ? (
                      <DownOutlined fontSize={14} color="#ccc" />
                    ) : (
                      <RightOutlined fontSize={14} color="#ccc" />
                    )}
                  </div>
                </div>

                {/* 结清开关 */}
                {participant.balance !== 0 && (
                  <div className="settled-row">
                    <span className="settled-label">{isSettled ? '✅ 已结清' : '标记为已结清'}</span>
                    <Switch
                      checked={isSettled}
                      onChange={() => toggleSettled(participant.participantId)}
                      style={{ '--checked-color': '#C8E64E', '--height': '24px', '--width': '40px' }}
                    />
                  </div>
                )}

                {/* 展开详情 - 箭头流向 */}
                {isExpanded && (
                  <div className="participant-detail">
                    {participant.paymentDetails?.filter(p => 
                      p.fromId === participant.participantId || p.toId === participant.participantId
                    ).map((payment, index) => {
                      const fromP = data.participants?.find(x => x.participantId === payment.fromId);
                      const toP = data.participants?.find(x => x.participantId === payment.toId);
                      return (
                      <div key={index} className="flow-item">
                        <div className="flow-from">
                          {fromP?.participantAvatar ? <img src={fromP.participantAvatar} className="flow-avatar-img" alt="" /> : <div className="flow-avatar">{payment.fromName.charAt(0)}</div>}
                          <span className="flow-name">{payment.fromName}</span>
                        </div>
                        <div className="flow-arrow">
                          <span className="flow-amount">¥{payment.amount.toFixed(2)}</span>
                          <svg width="60" height="20" viewBox="0 0 60 20"><line x1="0" y1="10" x2="50" y2="10" stroke={payment.fromId === participant.participantId ? '#ff6b6b' : '#C8E64E'} strokeWidth="2"/><polygon points="50,5 60,10 50,15" fill={payment.fromId === participant.participantId ? '#ff6b6b' : '#C8E64E'}/></svg>
                        </div>
                        <div className="flow-to">
                          {toP?.participantAvatar ? <img src={toP.participantAvatar} className="flow-avatar-img" alt="" /> : <div className="flow-avatar">{payment.toName.charAt(0)}</div>}
                          <span className="flow-name">{payment.toName}</span>
                        </div>
                      </div>
                      );
                    })}
                    {participant.balance === 0 && (
                      <div className="flow-balanced">✅ 已平衡，无需结算</div>
                    )}
                    {(!participant.paymentDetails || participant.paymentDetails.filter(p => 
                      p.fromId === participant.participantId || p.toId === participant.participantId
                    ).length === 0) && participant.balance !== 0 && (
                      <div className="flow-balanced">无转账明细</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SplitBill;
