// ============================================================
// Playwright 辅助函数 - 旅行记账系统 UI 自动化测试
// ============================================================

const API_BASE = 'http://localhost:5173/api';

/**
 * 通过 API 注册用户
 */
export async function registerUser(request, userData = {}) {
  const data = {
    nickname: userData.nickname || `测试用户_${Date.now()}`,
    email: userData.email || `test_${Date.now()}@example.com`,
    password: userData.password || 'Test123456',
    ...userData,
  };
  const resp = await request.post(`${API_BASE}/auth/register`, { data });
  const body = await resp.json();
  if (body.code !== 200) throw new Error(body.message);
  return body.data;
}

/**
 * 通过 API 登录
 */
export async function loginAPI(request, account = 'cypress@test.com', password = 'Cypress123') {
  const resp = await request.post(`${API_BASE}/auth/login`, {
    data: { account, password },
  });
  const body = await resp.json();
  if (body.code !== 200) throw new Error(body.message);
  return body.data;
}

/**
 * 确保测试用户存在并返回 token
 */
export async function ensureTestUser(request) {
  try {
    return await loginAPI(request);
  } catch {
    const data = await registerUser(request, {
      nickname: 'Cypress测试',
      email: 'cypress@test.com',
      password: 'Cypress123',
    });
    return data;
  }
}

/**
 * 在页面中设置登录状态
 */
export async function loginOnPage(page, request) {
  const { token, userId } = await ensureTestUser(request);
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ token, userId }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', String(userId));
    },
    { token, userId }
  );
  return { token, userId };
}

/**
 * 带认证的 API 请求
 */
export async function apiRequest(request, method, url, body, token) {
  const opts = {
    headers: { Authorization: `Bearer ${token}` },
  };
  if (body) opts.data = body;

  let resp;
  switch (method) {
    case 'GET':
      resp = await request.get(`${API_BASE}${url}`, opts);
      break;
    case 'POST':
      resp = await request.post(`${API_BASE}${url}`, opts);
      break;
    case 'PUT':
      resp = await request.put(`${API_BASE}${url}`, opts);
      break;
    case 'DELETE':
      resp = await request.delete(`${API_BASE}${url}`, opts);
      break;
  }
  return resp.json();
}

/**
 * 创建账本
 */
export async function createAccountBook(request, token, overrides = {}) {
  const data = {
    name: overrides.name || `测试旅行_${Date.now()}`,
    destination: overrides.destination || '东京',
    startDate: overrides.startDate || '2026-04-01',
    endDate: overrides.endDate || '2026-04-10',
    budget: overrides.budget ?? 10000,
    remark: overrides.remark || '自动化测试账本',
  };
  const body = await apiRequest(request, 'POST', '/account-books', data, token);
  if (body.code !== 200) throw new Error(body.message);
  return body.data;
}

/**
 * 添加参与人
 */
export async function addParticipant(request, token, bookId, name, remark = '') {
  const body = await apiRequest(request, 'POST', `/account-books/${bookId}/participants`, { name, remark }, token);
  if (body.code !== 200) throw new Error(body.message);
  return body.data;
}

/**
 * 设置汇率
 */
export async function setExchangeRate(request, token, bookId, currency, rate) {
  const body = await apiRequest(request, 'POST', `/account-books/${bookId}/exchange-rates`, { currency, rate }, token);
  if (body.code !== 200) throw new Error(body.message);
  return body.data;
}

/**
 * 创建交易
 */
export async function createTransaction(request, token, bookId, overrides = {}) {
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
  const body = await apiRequest(request, 'POST', `/account-books/${bookId}/transactions`, data, token);
  if (body.code !== 200) throw new Error(body.message);
  return body.data;
}

/**
 * 删除账本
 */
export async function deleteAccountBook(request, token, bookId) {
  return apiRequest(request, 'DELETE', `/account-books/${bookId}`, null, token);
}
