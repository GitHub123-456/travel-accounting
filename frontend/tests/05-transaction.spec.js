// ============================================================
// 交易/记账模块测试
// ============================================================
import { test, expect } from '@playwright/test';
import { loginOnPage, createAccountBook, deleteAccountBook, setExchangeRate, createTransaction, addParticipant, apiRequest } from './helpers.js';

test.describe('交易记账模块', () => {
  let token, bookId;

  test.beforeEach(async ({ page, request }) => {
    const data = await loginOnPage(page, request);
    token = data.token;
    const book = await createAccountBook(request, token, { name: '交易测试账本' });
    bookId = book.id;
    await setExchangeRate(request, token, bookId, 'CNY', 1);
  });

  test.afterEach(async ({ request }) => {
    if (bookId) await deleteAccountBook(request, token, bookId);
  });

  test.describe('记账表单 UI', () => {
    test('应正确渲染记账表单元素', async ({ page }) => {
      await page.goto(`/account-books/${bookId}/transactions/new`);
      await expect(page.getByText('记录支出')).toBeVisible();
      await expect(page.getByText('日期')).toBeVisible();
      await expect(page.getByText('币种')).toBeVisible();
      await expect(page.getByText('金额')).toBeVisible();
      await expect(page.getByText('主分类')).toBeVisible();
      await expect(page.getByText('分账设置')).toBeVisible();
    });

    test('应显示6个主分类', async ({ page }) => {
      await page.goto(`/account-books/${bookId}/transactions/new`);
      for (const icon of ['🍜', '✈️', '🏨', '🛍️', '🎫', '📝']) {
        await expect(page.getByText(icon)).toBeVisible();
      }
    });

    test('切换主分类应更新子项列表', async ({ page }) => {
      await page.goto(`/account-books/${bookId}/transactions/new`);
      await expect(page.getByText('早餐')).toBeVisible();
      await page.getByText('✈️').click();
      await expect(page.getByText('飞机')).toBeVisible();
      await expect(page.getByText('火车')).toBeVisible();
    });

    test('金额为空时保存按钮应禁用', async ({ page }) => {
      await page.goto(`/account-books/${bookId}/transactions/new`);
      await expect(page.getByRole('button', { name: '保存' })).toBeDisabled();
    });

    test('分账设置默认应为个人账单', async ({ page }) => {
      await page.goto(`/account-books/${bookId}/transactions/new`);
      await expect(page.locator('.split-option.active')).toContainText('个人账单');
    });

    test('无成员时共同账单应提示先添加成员', async ({ page }) => {
      await page.goto(`/account-books/${bookId}/transactions/new`);
      await page.getByText('共同账单').click();
      await expect(page.getByText('暂无成员')).toBeVisible();
    });
  });

  test.describe('创建个人交易', () => {
    test('应能创建个人交易并跳转回详情页', async ({ page }) => {
      await page.goto(`/account-books/${bookId}/transactions/new`);
      await page.getByPlaceholder('0.00').fill('128.50');
      await page.getByText('午餐').click();
      await page.getByRole('button', { name: '保存' }).click();
      await expect(page.getByText('记账成功')).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/account-books/${bookId}$`), { timeout: 10000 });
    });

    test('创建的交易应出现在账单明细中', async ({ page, request }) => {
      await createTransaction(request, token, bookId, { amount: 200, category: '住宿', remark: '明细验证' });
      await page.goto(`/account-books/${bookId}`);
      await page.getByText('账单明细').click();
      await expect(page.getByText('住宿')).toBeVisible();
    });
  });

  test.describe('交易详情', () => {
    test('点击交易应弹出详情面板', async ({ page, request }) => {
      await createTransaction(request, token, bookId, { amount: 150, category: '交通', remark: '详情测试' });
      await page.goto(`/account-books/${bookId}`);
      await page.getByText('账单明细').click();
      await page.getByText('交通').click();
      await expect(page.getByText('流水详情')).toBeVisible();
    });

    test('封存账本的交易详情不应显示编辑删除按钮', async ({ page, request }) => {
      await createTransaction(request, token, bookId, { amount: 80, category: '购物' });
      await apiRequest(request, 'PUT', `/account-books/${bookId}/archive`, { isArchived: true }, token);
      await page.goto(`/account-books/${bookId}`);
      await page.getByText('账单明细').click();
      await page.getByText('购物').click();
      await expect(page.getByText('账本已封存')).toBeVisible();
    });
  });

  test.describe('编辑和删除交易', () => {
    test('修改金额后应更新', async ({ request }) => {
      const tx = await createTransaction(request, token, bookId, { amount: 100, category: '餐饮' });
      await apiRequest(request, 'PUT', `/transactions/${tx.id}`, {
        amount: 200, currency: 'CNY', category: '餐饮', transactionTime: '2026-04-05 12:00:00', type: 'personal',
      }, token);
      const resp = await apiRequest(request, 'GET', `/transactions/${tx.id}`, null, token);
      expect(parseFloat(resp.data.amount)).toBe(200);
    });

    test('删除交易后应从列表中消失', async ({ page, request }) => {
      const tx = await createTransaction(request, token, bookId, { amount: 99, category: '其他', remark: '待删除' });
      await apiRequest(request, 'DELETE', `/transactions/${tx.id}`, null, token);
      await page.goto(`/account-books/${bookId}`);
      await page.getByText('账单明细').click();
      await expect(page.getByText('待删除')).toHaveCount(0);
    });

    test('封存账本不应允许删除交易', async ({ request }) => {
      const tx = await createTransaction(request, token, bookId, { amount: 50, category: '餐饮' });
      await apiRequest(request, 'PUT', `/account-books/${bookId}/archive`, { isArchived: true }, token);
      const resp = await apiRequest(request, 'DELETE', `/transactions/${tx.id}`, null, token);
      expect(resp.code).not.toBe(200);
      expect(resp.message).toContain('封存');
    });
  });

  test.describe('金额精度测试', () => {
    test('小数金额应正确存储', async ({ request }) => {
      const tx = await createTransaction(request, token, bookId, { amount: 99.99, currency: 'CNY' });
      const resp = await apiRequest(request, 'GET', `/transactions/${tx.id}`, null, token);
      expect(parseFloat(resp.data.amount)).toBe(99.99);
      expect(parseFloat(resp.data.local_amount)).toBe(99.99);
    });

    test('大金额应正确存储', async ({ request }) => {
      const tx = await createTransaction(request, token, bookId, { amount: 99999.99, currency: 'CNY' });
      const resp = await apiRequest(request, 'GET', `/transactions/${tx.id}`, null, token);
      expect(parseFloat(resp.data.amount)).toBe(99999.99);
    });

    test('外币小数金额换算应精确', async ({ request }) => {
      await setExchangeRate(request, token, bookId, 'THB', 0.198765);
      const tx = await createTransaction(request, token, bookId, { amount: 1234.56, currency: 'THB' });
      const resp = await apiRequest(request, 'GET', `/transactions/${tx.id}`, null, token);
      const expected = 1234.56 * 0.198765;
      expect(parseFloat(resp.data.local_amount)).toBeCloseTo(expected, 0);
    });

    test('总支出应等于所有交易本币金额之和', async ({ request }) => {
      await createTransaction(request, token, bookId, { amount: 100, transactionTime: '2026-04-03 12:00:00' });
      await createTransaction(request, token, bookId, { amount: 200.50, transactionTime: '2026-04-04 12:00:00' });
      await createTransaction(request, token, bookId, { amount: 50.25, transactionTime: '2026-04-05 12:00:00' });
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}`, null, token);
      expect(parseFloat(resp.data.totalExpense)).toBeCloseTo(350.75, 1);
    });
  });
});
