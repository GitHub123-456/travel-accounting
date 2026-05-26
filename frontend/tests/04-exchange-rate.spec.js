// ============================================================
// 汇率管理模块测试 - 设置汇率 / 汇率换算 / 汇率更新
// ============================================================
import { test, expect } from '@playwright/test';
import { loginOnPage, createAccountBook, deleteAccountBook, setExchangeRate, createTransaction, apiRequest } from './helpers.js';

test.describe('汇率管理模块', () => {
  let token, bookId;

  test.beforeEach(async ({ page, request }) => {
    const data = await loginOnPage(page, request);
    token = data.token;
    const book = await createAccountBook(request, token, { name: '汇率测试账本' });
    bookId = book.id;
  });

  test.afterEach(async ({ request }) => {
    if (bookId) await deleteAccountBook(request, token, bookId);
  });

  test('点击汇率管理应弹出管理面板', async ({ page }) => {
    await page.goto(`/account-books/${bookId}`);
    await page.getByText('汇率管理').click();
    await expect(page.getByText('选择操作币种')).toBeVisible();
  });

  test('应显示可选币种列表（排除默认币种CNY）', async ({ page }) => {
    await page.goto(`/account-books/${bookId}`);
    await page.getByText('汇率管理').click();
    await expect(page.getByText('THB')).toBeVisible();
    await expect(page.getByText('USD')).toBeVisible();
    await expect(page.getByText('EUR')).toBeVisible();
    await expect(page.getByText('JPY')).toBeVisible();
    await expect(page.getByText('KRW')).toBeVisible();
  });

  test('无汇率记录时应显示空状态', async ({ page }) => {
    await page.goto(`/account-books/${bookId}`);
    await page.getByText('汇率管理').click();
    await expect(page.getByText('暂无汇率记录')).toBeVisible();
  });

  test('添加汇率后应显示在记录列表中', async ({ page, request }) => {
    await setExchangeRate(request, token, bookId, 'USD', 7.25);
    await page.goto(`/account-books/${bookId}`);
    await page.getByText('汇率管理').click();
    await page.locator('.adm-selector').getByText('USD').click();
    await expect(page.getByText('7.25')).toBeVisible();
  });

  test('封存账本后不应允许修改汇率（API验证）', async ({ request }) => {
    await apiRequest(request, 'PUT', `/account-books/${bookId}/archive`, { isArchived: true }, token);
    const resp = await apiRequest(request, 'POST', `/account-books/${bookId}/exchange-rates`, { currency: 'USD', rate: 7.0 }, token);
    expect(resp.message).toContain('封存');
  });

  test.describe('汇率换算正确性', () => {
    test('设置汇率后创建交易应正确计算本币金额', async ({ request }) => {
      await setExchangeRate(request, token, bookId, 'THB', 0.2);
      await createTransaction(request, token, bookId, { amount: 500, currency: 'THB' });
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/transactions`, null, token);
      expect(parseFloat(resp.data.list[0].local_amount)).toBe(100);
    });

    test('更新汇率应重新计算所有该币种交易的本币金额', async ({ request }) => {
      await setExchangeRate(request, token, bookId, 'USD', 7.0);
      await createTransaction(request, token, bookId, { amount: 100, currency: 'USD' });
      let resp = await apiRequest(request, 'GET', `/account-books/${bookId}/transactions`, null, token);
      expect(parseFloat(resp.data.list[0].local_amount)).toBe(700);

      await setExchangeRate(request, token, bookId, 'USD', 7.25);
      resp = await apiRequest(request, 'GET', `/account-books/${bookId}/transactions`, null, token);
      expect(parseFloat(resp.data.list[0].local_amount)).toBe(725);
    });

    test('不同币种交易应使用各自汇率换算', async ({ request }) => {
      await setExchangeRate(request, token, bookId, 'USD', 7.25);
      await setExchangeRate(request, token, bookId, 'JPY', 0.048);
      await createTransaction(request, token, bookId, { amount: 100, currency: 'USD', remark: 'USD交易' });
      await createTransaction(request, token, bookId, { amount: 5000, currency: 'JPY', remark: 'JPY交易', transactionTime: '2026-04-05 13:00:00' });

      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/transactions`, null, token);
      const usdTx = resp.data.list.find(t => t.remark === 'USD交易');
      const jpyTx = resp.data.list.find(t => t.remark === 'JPY交易');
      expect(parseFloat(usdTx.local_amount)).toBe(725);
      expect(parseFloat(jpyTx.local_amount)).toBe(240);
    });

    test('CNY 交易本币金额应等于原始金额', async ({ request }) => {
      await setExchangeRate(request, token, bookId, 'CNY', 1);
      await createTransaction(request, token, bookId, { amount: 256.78, currency: 'CNY' });
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/transactions`, null, token);
      expect(parseFloat(resp.data.list[0].local_amount)).toBe(256.78);
    });
  });
});
