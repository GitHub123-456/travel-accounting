// ============================================================
// 自定义 Cypress 命令 - 旅行记账系统 UI 自动化测试
// ============================================================

const API_BASE = '/api';

// ---------- 认证相关 ----------

/**
 * 通过 API 登录并将 token 存入 localStorage
 */
Cypress.Commands.add('login', (account = 'cypress@test.com', password = 'Cypress123') => {
  cy.request('POST', `${API_BASE}/auth/login`, { account, password }).then((resp) => {
    expect(resp.body.code).to.eq(200);
    const { token, userId } = resp.body.data;
    window.localStorage.setItem('token', token);
    window.localStorage.setItem('userId', String(userId));
  });
});

/**
 * 通过 API 注册新用户
 */
Cypress.Commands.add('registerUser', (userData) => {
  const data = {
    nickname: userData.nickname || `测试用户_${Date.now()}`,
    email: userData.email || `test_${Date.now()}@example.com`,
    password: userData.password || 'Test123456',
    ...userData,
  };
  return cy.request('POST', `${API_BASE}/auth/register`, data).then((resp) => {
    expect(resp.body.code).to.eq(200);
    return resp.body.data;
  });
});

/**
 * 确保测试用户存在并登录
 */
Cypress.Commands.add('ensureLoggedIn', () => {
  cy.request({
    method: 'POST',
    url: `${API_BASE}/auth/login`,
    body: { account: 'cypress@test.com', password: 'Cypress123' },
    failOnStatusCode: false,
  }).then((resp) => {
    if (resp.body.code === 200) {
      const { token, userId } = resp.body.data;
      window.localStorage.setItem('token', token);
      window.localStorage.setItem('userId', String(userId));
    } else {
      cy.registerUser({
        nickname: 'Cypress测试',
        email: 'cypress@test.com',
        password: 'Cypress123',
      }).then(({ token, userId }) => {
        window.localStorage.setItem('token', token);
        window.localStorage.setItem('userId', String(userId));
      });
    }
  });
});

// ---------- API 辅助 ----------

/**
 * 带认证的 API 请求
 */
Cypress.Commands.add('apiRequest', (method, url, body) => {
  const token = window.localStorage.getItem('token');
  return cy.request({
    method,
    url: `${API_BASE}${url}`,
    body,
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });
});

/**
 * 通过 API 创建账本
 */
Cypress.Commands.add('createAccountBook', (overrides = {}) => {
  const data = {
    name: overrides.name || `测试旅行_${Date.now()}`,
    destination: overrides.destination || '东京',
    startDate: overrides.startDate || '2026-04-01',
    endDate: overrides.endDate || '2026-04-10',
    budget: overrides.budget || 10000,
    remark: overrides.remark || '自动化测试账本',
  };
  return cy.apiRequest('POST', '/account-books', data).then((resp) => {
    expect(resp.body.code).to.eq(200);
    return resp.body.data;
  });
});

/**
 * 通过 API 添加参与人
 */
Cypress.Commands.add('addParticipant', (bookId, name, remark = '') => {
  return cy.apiRequest('POST', `/account-books/${bookId}/participants`, { name, remark }).then((resp) => {
    expect(resp.body.code).to.eq(200);
    return resp.body.data;
  });
});

/**
 * 通过 API 设置汇率
 */
Cypress.Commands.add('setExchangeRate', (bookId, currency, rate) => {
  return cy.apiRequest('POST', `/account-books/${bookId}/exchange-rates`, { currency, rate }).then((resp) => {
    expect(resp.body.code).to.eq(200);
    return resp.body.data;
  });
});

/**
 * 通过 API 创建交易
 */
Cypress.Commands.add('createTransaction', (bookId, overrides = {}) => {
  const data = {
    amount: overrides.amount || 100,
    currency: overrides.currency || 'CNY',
    category: overrides.category || '餐饮',
    subCategory: overrides.subCategory || '午餐',
    paymentMethod: overrides.paymentMethod || 'cash',
    transactionTime: overrides.transactionTime || '2026-04-05 12:00:00',
    location: overrides.location || '东京站',
    remark: overrides.remark || '测试交易',
    type: overrides.type || 'personal',
    payerId: overrides.payerId || null,
    participantIds: overrides.participantIds || [],
  };
  return cy.apiRequest('POST', `/account-books/${bookId}/transactions`, data).then((resp) => {
    expect(resp.body.code).to.eq(200);
    return resp.body.data;
  });
});

/**
 * 清理：删除账本
 */
Cypress.Commands.add('deleteAccountBook', (bookId) => {
  return cy.apiRequest('DELETE', `/account-books/${bookId}`);
});
