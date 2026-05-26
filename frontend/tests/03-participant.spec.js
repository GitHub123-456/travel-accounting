// ============================================================
// 成员管理模块测试
// ============================================================
import { test, expect } from '@playwright/test';
import { loginOnPage, createAccountBook, deleteAccountBook, addParticipant, apiRequest } from './helpers.js';

test.describe('成员管理模块', () => {
  let token, bookId;

  test.beforeEach(async ({ page, request }) => {
    const data = await loginOnPage(page, request);
    token = data.token;
    const book = await createAccountBook(request, token, { name: '成员测试账本' });
    bookId = book.id;
  });

  test.afterEach(async ({ request }) => {
    if (bookId) await deleteAccountBook(request, token, bookId);
  });

  test('点击成员管理应弹出管理面板', async ({ page }) => {
    await page.goto(`/account-books/${bookId}`);
    await page.getByText('成员管理').click();
    await expect(page.getByText('账本成员')).toBeVisible();
  });

  test('应能添加新成员', async ({ page }) => {
    await page.goto(`/account-books/${bookId}`);
    await page.getByText('成员管理').click();
    await page.waitForTimeout(1000);
    await page.getByText('添加成员').click();
    await page.getByPlaceholder('如：张三').fill('李四');
    await page.getByPlaceholder('如：朋友、同事（可选）').fill('同事');
    await page.locator('.add-participant-form').getByRole('button', { name: '添加' }).click();
    await expect(page.getByText('添加成功')).toBeVisible();
    await expect(page.getByText('李四')).toBeVisible();
  });

  test('成员姓名为空时应提示必填', async ({ page }) => {
    await page.goto(`/account-books/${bookId}`);
    await page.getByText('成员管理').click();
    await page.waitForTimeout(1000);
    await page.getByText('添加成员').click();
    await page.locator('.add-participant-form').getByRole('button', { name: '添加' }).click();
    await expect(page.getByText('请输入姓名')).toBeVisible();
  });

  test('应显示成员总数', async ({ page, request }) => {
    await addParticipant(request, token, bookId, '成员A', '');
    await addParticipant(request, token, bookId, '成员B', '');
    await page.goto(`/account-books/${bookId}`);
    await page.getByText('成员管理').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('.count-badge')).toContainText('2');
  });

  test('取消按钮应关闭添加表单', async ({ page }) => {
    await page.goto(`/account-books/${bookId}`);
    await page.getByText('成员管理').click();
    await page.waitForTimeout(1000);
    await page.getByText('添加成员').click();
    await expect(page.locator('.add-participant-form')).toBeVisible();
    await page.locator('.add-participant-form').getByRole('button', { name: '取消' }).click();
    await expect(page.locator('.add-participant-form')).toHaveCount(0);
  });

  test('封存账本后不应允许添加成员（API验证）', async ({ request }) => {
    await apiRequest(request, 'PUT', `/account-books/${bookId}/archive`, { isArchived: true }, token);
    const resp = await apiRequest(request, 'POST', `/account-books/${bookId}/participants`, { name: '新成员' }, token);
    expect(resp.code).not.toBe(200);
  });
});
