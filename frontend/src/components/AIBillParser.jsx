import React, { useState, useRef, useEffect } from 'react';
import { Popup, TextArea, Button, Toast, ImageUploader, Picker, Avatar } from 'antd-mobile';
import { aiAPI } from '../api/ai';
import { transactionAPI } from '../api/transaction';
import { userAPI } from '../api/user';
import './AIBillParser.css';

const AI_ICON = '🤖';

function AIBillParser({ visible, onClose, bookId, onSuccess, participants, chatMessages: parentChatMessages, setChatMessages, inputText: parentInputText, setInputText: setParentInputText, fileList: parentFileList, setFileList: setParentFileList }) {
  const currentUserId = parseInt(localStorage.getItem('userId') || '0');
  const [userAvatar, setUserAvatar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [confirmMsgId, setConfirmMsgId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerField, setPickerField] = useState(null);
  const [pickerColumns, setPickerColumns] = useState([]);
  const [pickerValue, setPickerValue] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (visible && !userAvatar) {
      userAPI.getProfile().then(profile => {
        if (profile?.avatar) setUserAvatar(profile.avatar);
      }).catch(() => {});
    }
  }, [visible]);

  const chatMessages = parentChatMessages || [];
  const setChat = setChatMessages || (() => {});
  const inputText = parentInputText || '';
  const setInputText = setParentInputText || (() => {});
  const fileList = parentFileList || [];
  const setFileList = setParentFileList || (() => {});

  useEffect(() => {
    if (visible) {
      setEditingField(null);
    }
  }, [visible]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const syncConfirmToMessage = (data) => {
    if (!confirmMsgId) return;
    setChat(prev => prev.map(msg =>
      msg.id === confirmMsgId ? { ...msg, parsedData: data } : msg
    ));
  };

  const sendMessage = async (imageBase64 = null, extraText = null) => {
    const textToSend = extraText || inputText.trim();
    if (!textToSend && !imageBase64) {
      Toast.show({ icon: 'fail', content: '请输入账单描述或上传图片' });
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: textToSend || '📷 识别账单图片',
      timestamp: new Date(),
      hasImage: !!imageBase64
    };

    setChat(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const result = await aiAPI.parse(bookId, {
        text: textToSend || '',
        imageBase64
      });

      const aiMsgId = Date.now() + 1;
      const aiMessage = {
        id: aiMsgId,
        type: 'ai',
        content: '解析成功！',
        timestamp: new Date(),
        parsedData: result,
        saved: false
      };

      setChat(prev => [...prev, aiMessage]);
      setConfirmData(result);
      setConfirmMsgId(aiMsgId);
      setShowConfirmModal(true);
    } catch (error) {
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: `解析失败：${error.message}\n请重试或换个方式描述`,
        timestamp: new Date()
      };
      setChat(prev => [...prev, aiMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (file) => {
    const imageUrl = URL.createObjectURL(file);
    setFileList([{ url: imageUrl, file }]);
  };

  const handleSendImage = async () => {
    if (fileList.length === 0 || !fileList[0].file) return;
    const { file } = fileList[0];
    const previewUrl = fileList[0].url;
    const promptText = inputText.trim();

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1];
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: promptText || '📷 识别账单图片',
        timestamp: new Date(),
        hasImage: true,
        imageUrl: previewUrl
      };

      setChat(prev => [...prev, userMessage]);
      setInputText('');
      setFileList([]);
      setLoading(true);

      try {
        const result = await aiAPI.parse(bookId, {
          text: promptText || '识别这张账单图片',
          imageBase64: base64
        });

        const aiMsgId = Date.now() + 1;
        const aiMessage = {
          id: aiMsgId,
          type: 'ai',
          content: '解析成功！',
          timestamp: new Date(),
          parsedData: result,
          saved: false
        };

        setChat(prev => [...prev, aiMessage]);
        setConfirmData(result);
        setConfirmMsgId(aiMsgId);
        setShowConfirmModal(true);
      } catch (error) {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: `解析失败：${error.message}\n请重试或换个方式描述`,
          timestamp: new Date()
        };
        setChat(prev => [...prev, aiMessage]);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSend = () => {
    if (fileList.length > 0) {
      handleSendImage();
      return;
    }
    if (!inputText.trim()) {
      Toast.show({ icon: 'fail', content: '请输入账单描述' });
      return;
    }
    sendMessage();
  };

  const handleViewBill = (msg) => {
    const data = JSON.parse(JSON.stringify(msg.parsedData));
    setConfirmData(data);
    setConfirmMsgId(msg.id);
    setShowConfirmModal(true);
  };

  const handleSave = async () => {
    if (!confirmData) return;

    try {
      const data = {
        amount: parseFloat(confirmData.amount),
        currency: confirmData.currency,
        category: confirmData.category,
        subCategory: confirmData.subCategory || null,
        remark: confirmData.remark || null,
        location: confirmData.location || null,
        type: confirmData.type,
        payerId: confirmData.payerId || null,
        participantIds: confirmData.participantIds || [],
        transactionTime: confirmData.transactionTime
      };

      if (isNaN(data.amount)) {
        Toast.show({ icon: 'fail', content: '金额格式不正确' });
        return;
      }

      console.log('📤 AI保存账单数据:', JSON.stringify(data, null, 2));
      console.log('📚 账本ID:', bookId);
      const result = await transactionAPI.create(bookId, data);
      console.log('✅ 保存返回结果:', JSON.stringify(result, null, 2));

      const amountDisplay = `${data.currency === 'CNY' ? '¥' : data.currency} ${data.amount}`;

      const successMsg = {
        id: Date.now() + 2,
        type: 'ai',
        content: '✅ 账单保存成功！\n金额：' + amountDisplay + '\n分类：' + (data.category + (data.subCategory ? ' / ' + data.subCategory : '')),
        timestamp: new Date(),
        saved: false
      };
      setChat(prev => [...prev, successMsg]);

      setChat(prev => prev.map(msg =>
        msg.id === confirmMsgId ? { ...msg, saved: true } : msg
      ));

      Toast.show({ icon: 'success', content: '记账成功！', duration: 3000 });

      // 延迟关闭确认弹窗，让用户有时间看到成功提示
      setTimeout(() => {
        setShowConfirmModal(false);
      }, 2000);

      // 不再自动清理聊天记录，保留在聊天框中让用户查看
      console.log('🔄 调用 onSuccess 刷新数据...');
      if (typeof onSuccess === 'function') {
        onSuccess(true);
      }
      console.log('✅ onSuccess 调用完成');
    } catch (error) {
      console.error('❌ AI保存账单失败:', error);
      console.error(' 错误详情:', error.response?.data || error.message);
      Toast.show({ icon: 'fail', content: `保存失败：${error.response?.data?.message || error.message || '未知错误'}` });
    }
  };

  const handleContinue = () => {
    setShowConfirmModal(false);
    setConfirmData(null);
    setConfirmMsgId(null);
    setInputText('');
  };

  const handleClearChat = () => {
    setChat([]);
    setConfirmData(null);
    setConfirmMsgId(null);
    setInputText('');
    setFileList([]);
  };

  const updateConfirmField = (field, value) => {
    setConfirmData(prev => {
      const newData = { ...prev, [field]: value };
      
      // 当切换为个人账单时，清空付款人和参与人数据
      if (field === 'type' && value === 'personal') {
        newData.payerId = null;
        newData.payerName = '';
        newData.participantIds = [];
        newData.participantNames = [];
      }
      
      // 当切换为共同账单时，默认设置当前用户为付款人
      if (field === 'type' && value === 'shared') {
        const currentUserParticipant = participants.find(p => p.user_id === currentUserId);
        if (currentUserParticipant) {
          newData.payerId = currentUserParticipant.id;
          newData.payerName = currentUserParticipant.name;
        }
      }
      
      syncConfirmToMessage(newData);
      return newData;
    });
  };

  const finishEditing = () => {
    setEditingField(null);
  };

  const openPicker = (field, columns, value) => {
    setPickerField(field);
    setPickerColumns(columns);
    setPickerValue([value]);
    setPickerVisible(true);
  };

  const handlePickerConfirm = (values) => {
    if (pickerField && values[0] !== undefined && values[0] !== '') {
      if (pickerField === 'payerId') {
        const selectedId = parseInt(values[0]);
        if (isNaN(selectedId)) {
          setPickerVisible(false);
          return;
        }
        const selected = participants.find(p => p.id === selectedId);
        setConfirmData(prev => {
          const newData = {
            ...prev,
            payerId: selectedId,
            payerName: selected ? selected.name : ''
          };
          syncConfirmToMessage(newData);
          return newData;
        });
      } else {
        updateConfirmField(pickerField, values[0]);
      }
    }
    setPickerVisible(false);
  };

  const handlePickerCancel = () => {
    setPickerVisible(false);
  };

  const togglePayer = (participant) => {
    setConfirmData(prev => {
      const newData = {
        ...prev,
        payerId: participant.id,
        payerName: participant.name
      };
      syncConfirmToMessage(newData);
      return newData;
    });
  };

  const toggleParticipant = (participant) => {
    setConfirmData(prev => {
      const ids = prev.participantIds || [];
      const index = ids.indexOf(participant.id);
      let newData;
      if (index >= 0) {
        const newIds = ids.filter(id => id !== participant.id);
        newData = { ...prev, participantIds: newIds };
      } else {
        newData = { ...prev, participantIds: [...ids, participant.id] };
      }
      syncConfirmToMessage(newData);
      return newData;
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}年${parseInt(m)}月${parseInt(day)}日`;
  };

  const toLocalInput = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const fromLocalInput = (localStr) => {
    if (!localStr) return new Date().toISOString();
    return new Date(localStr).toISOString();
  };

  const renderDateTimeField = () => {
    const dateValue = confirmData?.transactionTime;
    const displayValue = formatDate(dateValue);
    const inputValue = toLocalInput(dateValue);

    return (
      <div className="confirm-field-item">
        <span className="confirm-field-label">日期</span>
        {editingField === 'transactionTime' ? (
          <input
            className="confirm-field-input"
            type="date"
            value={inputValue}
            onChange={(e) => {
              const newTime = fromLocalInput(e.target.value);
              updateConfirmField('transactionTime', newTime);
            }}
            onBlur={finishEditing}
            autoFocus
          />
        ) : (
          <span
            className="confirm-field-value"
            onClick={() => setEditingField('transactionTime')}
          >
            {displayValue || '点击编辑'}
          </span>
        )}
      </div>
    );
  };

  const renderWelcomeMessage = () => (
    <div className="welcome-message">
      <div className="welcome-title">你好！我是AI记账助手 🎉</div>
      <div className="welcome-desc">可以帮你快速识别账单，一键记账</div>
      <div className="welcome-section">
        <div className="welcome-section-title">💬 文字描述</div>
        <div className="welcome-example" onClick={() => setInputText('午餐花了80')}>午餐花了80</div>
        <div className="welcome-example" onClick={() => setInputText('张三付的 大家AA 晚餐300')}>张三付的 大家AA 晚餐300</div>
        <div className="welcome-example" onClick={() => setInputText('打车去机场 150日元')}>打车去机场 150日元</div>
      </div>
      <div className="welcome-section">
        <div className="welcome-section-title">📷 拍照识别</div>
        <div className="welcome-desc">点击左下角拍照按钮，上传小票图片即可自动识别</div>
      </div>
    </div>
  );

  const renderParsedPreview = (data) => {
    if (!data) return null;
    const currencySymbol = { CNY: '¥', USD: '$', JPY: '¥', EUR: '€', GBP: '£', THB: '฿', KRW: '₩' };
    const symbol = currencySymbol[data.currency] || data.currency;
    const typeLabel = data.type === 'shared' ? '共同' : '个人';

    return (
      <div className="parsed-preview">
        <div className="parsed-preview-header">
          <span className="parsed-type-tag">{typeLabel}</span>
          <span className="parsed-category">{data.category}</span>
        </div>
        <div className="parsed-preview-amount">{symbol}{data.amount}</div>
        {data.subCategory && <div className="parsed-preview-sub">{data.subCategory}</div>}
        {data.location && <div className="parsed-preview-location">📍 {data.location}</div>}
        <div className="parsed-preview-shared">
          <div className="parsed-detail-row">
            <span className="parsed-detail-label">日期</span>
            <span className="parsed-detail-value">{formatDate(data.transactionTime)}</span>
          </div>
          {data.type === 'shared' && data.payerName && (
            <div className="parsed-detail-row">
              <span className="parsed-detail-label">付款人</span>
              <span className="parsed-detail-value">{data.payerName}</span>
            </div>
          )}
          {data.type === 'shared' && data.participantNames && data.participantNames.length > 0 && (
            <div className="parsed-detail-row">
              <span className="parsed-detail-label">参与人</span>
              <span className="parsed-detail-value">{data.participantNames.join('、')}</span>
            </div>
          )}
          {data.remark && (
            <div className="parsed-detail-row">
              <span className="parsed-detail-label">备注</span>
              <span className="parsed-detail-value">{data.remark}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEditableField = (label, field, value, type = 'text') => {
    const getDisplayValue = () => {
      if (field === 'type') {
        return value === 'shared' ? '共同账单' : '个人账单';
      }
      return value || '点击编辑';
    };

    return (
      <div className="confirm-field-item">
        <span className="confirm-field-label">{label}</span>
        {editingField === field ? (
          type === 'select' ? (
            <div
              className="confirm-field-input picker-trigger"
              onClick={() => {
                if (field === 'currency') {
                  openPicker('currency', [
                    { label: 'CNY', value: 'CNY' },
                    { label: 'USD', value: 'USD' },
                    { label: 'JPY', value: 'JPY' },
                    { label: 'EUR', value: 'EUR' },
                    { label: 'GBP', value: 'GBP' },
                    { label: 'THB', value: 'THB' },
                    { label: 'KRW', value: 'KRW' }
                  ], value);
                } else if (field === 'category') {
                  openPicker('category', [
                    { label: '餐饮', value: '餐饮' },
                    { label: '交通', value: '交通' },
                    { label: '住宿', value: '住宿' },
                    { label: '购物', value: '购物' },
                    { label: '门票', value: '门票' },
                    { label: '其他', value: '其他' }
                  ], value);
                } else if (field === 'type') {
                  openPicker('type', [
                    { label: '个人账单', value: 'personal' },
                    { label: '共同账单', value: 'shared' }
                  ], value);
                }
              }}
            >
              <span>{getDisplayValue()}</span>
              <span className="picker-arrow">▼</span>
            </div>
          ) : (
            <input
              className="confirm-field-input"
              type={type}
              value={value || ''}
              onChange={(e) => updateConfirmField(field, e.target.value)}
              onBlur={finishEditing}
              onKeyDown={(e) => e.key === 'Enter' && finishEditing()}
              autoFocus
            />
          )
        ) : (
          <span
            className="confirm-field-value"
            onClick={() => {
              if (type === 'select') {
                if (field === 'currency') {
                  openPicker('currency', [
                    { label: 'CNY', value: 'CNY' },
                    { label: 'USD', value: 'USD' },
                    { label: 'JPY', value: 'JPY' },
                    { label: 'EUR', value: 'EUR' },
                    { label: 'GBP', value: 'GBP' },
                    { label: 'THB', value: 'THB' },
                    { label: 'KRW', value: 'KRW' }
                  ], value);
                } else if (field === 'category') {
                  openPicker('category', [
                    { label: '餐饮', value: '餐饮' },
                    { label: '交通', value: '交通' },
                    { label: '住宿', value: '住宿' },
                    { label: '购物', value: '购物' },
                    { label: '门票', value: '门票' },
                    { label: '其他', value: '其他' }
                  ], value);
                } else if (field === 'type') {
                  openPicker('type', [
                    { label: '个人账单', value: 'personal' },
                    { label: '共同账单', value: 'shared' }
                  ], value);
                }
              } else {
                setEditingField(field);
              }
            }}
          >
            {getDisplayValue()}
          </span>
        )}
      </div>
    );
  };

  const renderPayerSelector = () => {
    const selectedPayer = participants.find(p => p.id === confirmData?.payerId);

    return (
      <div className="confirm-field-item">
        <span className="confirm-field-label">付款人</span>
        <span
          className="confirm-field-value"
          onClick={() => {
            const payerColumns = participants.map(p => ({
              label: p.name,
              value: p.id
            }));
            openPicker('payerId', payerColumns, confirmData?.payerId || '');
          }}
        >
          {selectedPayer ? selectedPayer.name : '点击选择'}
        </span>
      </div>
    );
  };

  const renderParticipantSelector = () => (
    <div className="confirm-field-item vertical">
      <span className="confirm-field-label" style={{ alignSelf: 'flex-start' }}>参与人</span>
      <div className="participant-tag-group">
        {participants.map(p => {
          const isSelected = (confirmData?.participantIds || []).includes(p.id);
          return (
            <span
              key={p.id}
              className={`participant-tag ${isSelected ? 'active' : ''}`}
              onClick={() => toggleParticipant(p)}
            >
              <span className="tag-check">{isSelected ? '✓' : '+'}</span>
              {p.name}
            </span>
          );
        })}
      </div>
    </div>
  );

  const renderConfirmModal = () => (
    <div className="confirm-modal">
      <div className="confirm-header">
        <h3>确认账单信息</h3>
        <span className="confirm-hint">（点击字段可修改）</span>
      </div>
      <div className="confirm-content">
        <div className="confirm-result-card">
          {renderEditableField('金额', 'amount', confirmData?.amount, 'number')}
          {renderEditableField('币种', 'currency', confirmData?.currency, 'select')}
          {renderEditableField('分类', 'category', confirmData?.category, 'select')}
          {renderEditableField('子分类', 'subCategory', confirmData?.subCategory)}
          {renderEditableField('地点', 'location', confirmData?.location)}
          {renderEditableField('备注', 'remark', confirmData?.remark)}
          {renderEditableField('账单类型', 'type', confirmData?.type, 'select')}
          {renderDateTimeField()}

          {confirmData?.type === 'shared' && participants && participants.length > 0 && (
            <>
              {renderPayerSelector()}
              {renderParticipantSelector()}
            </>
          )}

          {confirmData?.type === 'shared' && !confirmData?.payerName && (
            <div className="confirm-field-item warning">
              <span className="confirm-field-label">⚠️</span>
              <span className="confirm-field-value" style={{ color: '#ff6b6b' }}>请选择付款人</span>
            </div>
          )}
        </div>
      </div>
      <div className="confirm-actions">
        <Button
          block
          color="default"
          size="large"
          onClick={handleContinue}
          style={{ flex: 1, '--background-color': '#f5f5f5' }}
        >
          取消
        </Button>
        <Button
          block
          color="primary"
          size="large"
          onClick={handleSave}
          disabled={confirmData?.type === 'shared' && !confirmData?.payerId}
          style={{
            flex: 2,
            '--background-color': (confirmData?.type === 'shared' && !confirmData?.payerId) ? '#ddd' : '#C8E64E',
            color: '#1A1A2E',
            fontWeight: 600
          }}
        >
          保存账单
        </Button>
      </div>
    </div>
  );

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      bodyStyle={{ borderTopLeftRadius: '20px', borderTopRightRadius: '20px', minHeight: '70vh', height: '85vh', padding: 0 }}
    >
      <div className="ai-chat-parser">
        <div className="ai-chat-header">
          <div className="ai-chat-title">
            <span className="ai-chat-icon">🤖</span>
            <span>AI智能记账</span>
          </div>
          <div className="ai-chat-actions">
            {chatMessages.length > 0 && (
              <Button fill="none" onClick={handleClearChat} className="ai-chat-clear">清空</Button>
            )}
            <Button fill="none" onClick={onClose} className="ai-chat-close">关闭</Button>
          </div>
        </div>

        <div className="ai-chat-messages">
          {chatMessages.length === 0 ? (
            <div className="chat-message ai welcome">
              <div className="chat-avatar">{AI_ICON}</div>
              <div className="chat-bubble welcome-bubble">
                {renderWelcomeMessage()}
              </div>
            </div>
          ) : (
            chatMessages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.type}`}>
                <div className="chat-avatar">
                  {msg.type === 'ai' ? (
                    AI_ICON
                  ) : userAvatar ? (
                    <img src={userAvatar} alt="" className="chat-avatar-img" />
                  ) : (
                    '👤'
                  )}
                </div>
                <div className="chat-bubble">
                  <div className="chat-content">
                    {msg.parsedData ? (
                      renderParsedPreview(msg.parsedData)
                    ) : (
                      <span className="chat-text-plain">{msg.content}</span>
                    )}
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} alt="账单图片" className="chat-image-preview" />
                    )}
                  </div>
                  <div className="chat-time">{formatTime(msg.timestamp)}</div>
                  {msg.parsedData && (
                    <div className="chat-confirm-btn">
                      <Button
                        color="primary"
                        size="mini"
                        onClick={() => handleViewBill(msg)}
                        style={{ '--background-color': '#C8E64E', color: '#1A1A2E', fontWeight: 500 }}
                      >
                        {msg.saved ? '📋 查看编辑' : '📋 查看'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="chat-message ai">
              <div className="chat-avatar">{AI_ICON}</div>
              <div className="chat-bubble typing">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="ai-chat-input-area">
          {fileList.length > 0 && (
            <div className="ai-image-preview-row">
              {fileList.map((file, index) => (
                <div key={index} className="ai-image-preview-item">
                  <img src={file.url} alt="预览" className="ai-image-preview" />
                  <div className="ai-image-delete-badge" onClick={() => setFileList([])}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2L10 10M10 2L2 10" stroke="#666" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="ai-input-row">
            <div className="ai-input-wrapper">
              <div className="upload-btn-inline" onClick={() => document.getElementById('ai-image-input').click()}>
                <span className="upload-icon-inline">📷</span>
                <input
                  id="ai-image-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageSelect(file);
                    }
                    e.target.value = '';
                  }}
                />
              </div>
              <TextArea
                placeholder="描述你的消费..."
                value={inputText}
                onChange={setInputText}
                rows={1}
                maxLength={500}
                autoSize={{ minRows: 1, maxRows: 4 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="ai-input-textarea"
              />
            </div>
            <Button
              color="primary"
              size="small"
              onClick={handleSend}
              disabled={(!inputText.trim() && fileList.length === 0) || loading}
              className="ai-send-btn"
              style={{ '--background-color': '#C8E64E', color: '#1A1A2E', fontWeight: 600 }}
            >
              发送</Button>
          </div>
        </div>
      </div>

      <Popup
        visible={showConfirmModal}
        position="bottom"
        onMaskClick={() => setShowConfirmModal(false)}
        bodyStyle={{ borderTopLeftRadius: '20px', borderTopRightRadius: '20px', maxHeight: '80vh' }}
      >
        {renderConfirmModal()}
      </Popup>

      <Picker
        columns={[pickerColumns]}
        visible={pickerVisible}
        value={pickerValue}
        onConfirm={handlePickerConfirm}
        onCancel={handlePickerCancel}
      />
    </Popup>
  );
}

export default AIBillParser;
