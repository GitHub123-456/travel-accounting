import React, { useState, useEffect } from 'react';
import { Popup, Button, Toast } from 'antd-mobile';
import { CloseOutlined } from '@ant-design/icons';
import { exchangeRateAPI } from '../api/exchangeRate';
import { accountBookAPI } from '../api/accountBook';
import dayjs from 'dayjs';
import './ExchangeRateManager.css';

const CURRENCY_INFO = {
  'CNY': { name: '人民币', symbol: '¥', color: '#FF4D4F' },
  'USD': { name: '美元', symbol: '$', color: '#1890FF' },
  'EUR': { name: '欧元', symbol: '€', color: '#722ED1' },
  'JPY': { name: '日元', symbol: '¥', color: '#FA541C' },
  'THB': { name: '泰铢', symbol: '฿', color: '#13C2C2' },
  'KRW': { name: '韩元', symbol: '₩', color: '#EB2F96' },
};

const ALL_CURRENCIES = ['CNY', 'USD', 'EUR', 'JPY', 'THB', 'KRW'];

function ExchangeRateManager({ visible, onClose, bookId, isArchived, bookDefaultCurrency, onUpdate }) {
  const [rates, setRates] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState(bookDefaultCurrency || 'JPY');

  useEffect(() => {
    if (visible && bookId) {
      loadRates();
      if (bookDefaultCurrency) setDefaultCurrency(bookDefaultCurrency);
    }
  }, [visible, bookId, bookDefaultCurrency]);

  const loadRates = async () => {
    try {
      const data = await exchangeRateAPI.getList(bookId);
      setRates(data || []);
    } catch (error) {
      console.error('加载汇率失败:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await exchangeRateAPI.refreshAll(bookId);
      Toast.show({ icon: 'success', content: '汇率已更新为最新' });
      loadRates();
    } catch (error) {
      Toast.show({ icon: 'fail', content: '刷新失败' });
    } finally {
      setRefreshing(false);
    }
  };

  const handleSetDefault = async (currency) => {
    setDefaultCurrency(currency);
    try {
      await accountBookAPI.update(bookId, { defaultCurrency: currency });
      Toast.show({ icon: 'success', content: `默认币种已设为 ${currency}` });
      if (onUpdate) onUpdate();
    } catch (error) {
      Toast.show({ icon: 'fail', content: '设置失败' });
    }
  };

  const foreignRates = rates.filter(r => r.currency !== 'CNY');

  return (
    <Popup visible={visible} onMaskClick={onClose} position="bottom"
      bodyStyle={{ height: '80vh' }}>
      <div className="exchange-rate-manager">
        <div className="manager-header">
          <h2>汇率管理</h2>
          <Button fill="none" onClick={onClose}><CloseOutlined fontSize={24} /></Button>
        </div>

        <div className="manager-content">
          {/* 默认币种选择 */}
          <div className="default-currency-section">
            <div className="section-title">账本默认币种</div>
            <div className="currency-chips">
              {ALL_CURRENCIES.filter(c => c !== 'CNY').map(c => {
                const info = CURRENCY_INFO[c];
                return (
                  <div key={c}
                    className={`currency-chip ${defaultCurrency === c ? 'active' : ''}`}
                    onClick={() => !isArchived && handleSetDefault(c)}
                  >
                    <div className="chip-icon" style={{ background: info.color }}>{info.symbol}</div>
                    <span>{c}</span>
                  </div>
                );
              })}
            </div>
            <div className="default-hint">记账时将默认使用 {defaultCurrency} 币种</div>
          </div>

          <div className="rate-tip">
            💡 汇率数据来自欧洲央行，创建账本时自动设置。
          </div>

          {foreignRates.length === 0 ? (
            <div className="empty-rates"><p>暂无汇率数据</p></div>
          ) : (
            <div className="rate-list">
              {foreignRates.map(rate => {
                const info = CURRENCY_INFO[rate.currency] || { name: rate.currency, symbol: '?', color: '#999' };
                return (
                  <div key={rate.id} className="rate-item-card">
                    <div className="rate-left">
                      <div className="rate-icon" style={{ background: info.color }}>{info.symbol}</div>
                      <div className="rate-info">
                        <span className="rate-currency">{rate.currency}</span>
                        <span className="rate-name">{info.name}</span>
                      </div>
                    </div>
                    <div className="rate-right">
                      <span className="rate-value">{rate.rate}</span>
                      <span className="rate-unit">CNY</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {foreignRates.length > 0 && (
            <div className="rate-update-time">
              最后更新: {dayjs(foreignRates[0]?.updated_at).format('YYYY/MM/DD HH:mm')}
            </div>
          )}

          {!isArchived && (
            <Button block color="primary" size="large" loading={refreshing} onClick={handleRefresh}
              style={{ borderRadius: '12px', marginTop: '16px' }}>
              🔄 刷新为最新汇率
            </Button>
          )}
        </div>
      </div>
    </Popup>
  );
}

export default ExchangeRateManager;
