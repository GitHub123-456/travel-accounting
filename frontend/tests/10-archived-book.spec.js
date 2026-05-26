// ============================================================
// 封存账本测试 - 只读限制 / 各模块封存行为验证
// ============================================================
import { test, expect } from '@playwright/test';
import { loginOnPage, createAccountBook, deleteAccountBook, setExchangeRate, createTransaction, addParticipant, apiRequest } from './helpers.js';

test.describe('封存账本限制测试', () => {
  let token, bookId;

  test.beforeEach(async ({ page, request }) => {
    const data = await loginOnPage(page, request);
    token = data.token;
    const book = await createAccountBook(request, token, { name: '封存限制测试' });
    bookId = book.id;
    await setExchangeRate(request, token, bookId, 'CNY', 1);
    await setExchangeRate(request, token, bookId, 'USD', 7.25);
    await addParticipant(request, token, bookId, '成员A');
    await addParticipant(request, token, bookId, '成员B');
    await createTransaction(request, token, bookId, { amount: 500, category: '餐饮' });
    await apiRequest(request, 'PUT', `/account-books/${bookId}/archive`, { isArchived: true }, token);
  });

  test.afterEach(async ({ request }) => {
    if (bookId) await deleteAccountBook(request, token, bookId);
  });

  test.describe('API 层封存限制', () => {
    test('不应允许创建新交易', async ({ request }) => {
      const resp = await apiRequest(request, 'POST', `/account-books/${bookId}/transactions`, {
        amount: 100, currency: 'CNY', category: '餐饮', transactionTime: '2026-04-05 12:00:00', type: 'personal',
      }, token);
      expect(resp.code).not.toBe(200);
      expect(resp.message).toContain('封存');
    });

    test('不应允许修改汇率', async ({ request }) => {
      const resp = await apiRequest(request, 'POST', `/account-books/${bookId}/exchange-rates`, { currency: 'USD', rate: 8.0 }, token);
      expect(resp.code).not.toBe(200);
      expect(resp.message).toContain('封存');
    });

    test('不应允许修改已有交易', async ({ request }) => {
      const txResp = await apiRequest(request, 'GET', `/account-books/${bookId}/transactions`, null, token);
      const txId = txResp.data.list[0].id;
      const resp = await apiRequest(request, 'PUT', `/transactions/${txId}`, {
        amount: 999, currency: 'CNY', category: '餐饮', transactionTime: '2026-04-05 12:00:00', type: 'personal',
      }, token);
      expect(resp.code).not.toBe(200);
      expect(resp.message).toContain('封存');
    });

    test('不应允许删除已有交易', async ({ request }) => {
      const txResp = await apiRequest(request, 'GET', `/account-books/${bookId}/transactions`, null, token);
      const txId = txResp.data.list[0].id;
      const resp = await apiRequest(request, 'DELETE', `/transactions/${txId}`, null, token);
      expect(resp.code).not.toBe(200);
      expect(resp.message).toContain('封存');
    });

    test('应仍然允许查看交易列表', async ({ request }) => {
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/transactions`, null, token);
      expect(resp.code).toBe(200);
      expect(resp.data.list.length).toBeGreaterThanOrEqual(1);
    });

    test('应仍然允许查看分账计算', async ({ request }) => {
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/split-bills/calculate`, null, token);
      expect(resp.code).toBe(200);
    });
  });

  test.describe('UI 层封存限制', () => {
    test('应显示封存提示卡片', async ({ page }) => {
      await page.goto(`/account-books/${bookId}`);
      await expect(page.getByText('账本已封存')).toBeVisible();
      await expect(page.getByText('只读状态')).toBeVisible();
    });

    test('不应显示记账浮动按钮', async ({ page }) => {
      await page.goto(`/account-books/${bookId}`);
      await expect(page.locator('.floating-record-btn')).toHaveCount(0);
    });

    test('不应显示管理功能区', async ({ page }) => {
      await page.goto(`/account-books/${bookId}`);
      await expect(page.locator('.management-section')).toHaveCount(0);
    });

    test('交易详情不应显示编辑删除按钮', async ({ page }) => {
      await page.goto(`/account-books/${bookId}`);
      await page.getByText('账单明细').click();
      await page.locator('.transaction-item').first().click();
      await expect(page.getByText('账本已封存，无法修改或删除账单')).toBeVisible();
    });

    test('已有数据应仍然可以正常浏览', async ({ page }) => {
      await page.goto(`/account-books/${bookId}`);
      await expect(page.getByText('总支出')).toBeVisible();
      await page.getByText('账单明细').click();
      await expect(page.getByText('餐饮')).toBeVisible();
      await page.getByText('成员统计').click();
      await expect(page.getByText('成员A')).toBeVisible();
    });
  });

  test.describe('封存后金额不变性', () => {
    test('封存后总支出和交易金额应保持不变', async ({ request }) => {
      const bookResp = await apiRequest(request, 'GET', `/account-books/${bookId}`, null, token);
      expect(parseFloat(bookResp.data.totalExpense)).toBe(500);

      const txResp = await apiRequest(request, 'GET', `/account-books/${bookId}/transactions`, null, token);
      expect(parseFloat(txResp.data.list[0].amount)).toBe(500);
      expect(parseFloat(txResp.data.list[0].local_amount)).toBe(500);
    });
  });
});
