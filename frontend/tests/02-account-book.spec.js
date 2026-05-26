// ============================================================
// 账本模块测试 - 创建 / 列表 / 详情 / 封存 / 删除
// ============================================================
import { test, expect } from '@playwright/test';
import { loginOnPage, createAccountBook, deleteAccountBook, apiRequest } from './helpers.js';

test.describe('账本模块', () => {
  let token;

  test.beforeEach(async ({ page, request }) => {
    const data = await loginOnPage(page, request);
    token = data.token;
  });

  test.describe('账本列表页', () => {
    test('应正确渲染列表页元素', async ({ page }) => {
      await page.goto('/account-books');
      await expect(page.getByText('我的账本')).toBeVisible();
      await expect(page.getByPlaceholder('搜索账本')).toBeVisible();
      await expect(page.locator('.floating-add-btn')).toBeVisible();
    });

    test('无账本时应显示空状态', async ({ page }) => {
      await page.route('**/api/account-books*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 200, message: '成功', data: { list: [], total: 0 } }),
        })
      );
      await page.goto('/account-books');
      await expect(page.getByText('还没有账本')).toBeVisible();
    });

    test('点击头像应跳转到个人中心', async ({ page }) => {
      await page.goto('/account-books');
      await page.locator('.profile-avatar-btn').click();
      await expect(page).toHaveURL(/\/profile/);
    });
  });

  test.describe('创建账本', () => {
    test('点击浮动按钮应弹出创建表单', async ({ page }) => {
      await page.goto('/account-books');
      await page.locator('.floating-add-btn').click();
      await expect(page.getByText('新建账本')).toBeVisible();
    });

    test('必填字段为空时应提示验证错误', async ({ page }) => {
      await page.goto('/account-books');
      await page.locator('.floating-add-btn').click();
      await page.locator('.adm-popup-body').getByRole('button', { name: '创建' }).click();
      await expect(page.getByText('请输入旅行名称')).toBeVisible();
    });

    test('创建的账本应出现在列表中', async ({ page, request }) => {
      const bookName = `列表验证_${Date.now()}`;
      const book = await createAccountBook(request, token, { name: bookName });
      await page.goto('/account-books');
      await expect(page.getByText(bookName)).toBeVisible();
      await deleteAccountBook(request, token, book.id);
    });
  });

  test.describe('账本详情页', () => {
    let bookId;

    test.beforeEach(async ({ request }) => {
      const book = await createAccountBook(request, token, { name: '详情测试账本', budget: 5000 });
      bookId = book.id;
    });

    test.afterEach(async ({ request }) => {
      if (bookId) await deleteAccountBook(request, token, bookId);
    });

    test('应正确显示账本基本信息', async ({ page }) => {
      await page.goto(`/account-books/${bookId}`);
      await expect(page.getByText('详情测试账本')).toBeVisible();
      await expect(page.getByText('东京')).toBeVisible();
    });

    test('应显示四个标签页', async ({ page }) => {
      await page.goto(`/account-books/${bookId}`);
      await expect(page.getByText('总览')).toBeVisible();
      await expect(page.getByText('账单明细')).toBeVisible();
      await expect(page.getByText('类别统计')).toBeVisible();
      await expect(page.getByText('成员统计')).toBeVisible();
    });

    test('总览页应显示总支出和预算进度', async ({ page }) => {
      await page.goto(`/account-books/${bookId}`);
      await expect(page.getByText('总支出')).toBeVisible();
      await expect(page.getByText('预算')).toBeVisible();
    });

    test('无交易时账单明细应显示空状态', async ({ page }) => {
      await page.goto(`/account-books/${bookId}`);
      await page.getByText('账单明细').click();
      await expect(page.getByText('暂无账单记录')).toBeVisible();
    });

    test('应显示管理功能区', async ({ page }) => {
      await page.goto(`/account-books/${bookId}`);
      await expect(page.getByText('汇率管理')).toBeVisible();
      await expect(page.getByText('成员管理')).toBeVisible();
    });

    test('点击记账按钮应跳转到记账表单', async ({ page }) => {
      await page.goto(`/account-books/${bookId}`);
      await page.locator('.floating-record-btn').click();
      await expect(page).toHaveURL(/\/transactions\/new/);
    });

    test('点击自动分账应跳转到分账页面', async ({ page }) => {
      await page.goto(`/account-books/${bookId}`);
      await page.getByText('自动分账').click();
      await expect(page).toHaveURL(/\/split-bill/);
    });
  });

  test.describe('账本封存', () => {
    let bookId;

    test.beforeEach(async ({ request }) => {
      const book = await createAccountBook(request, token, { name: '封存测试账本' });
      bookId = book.id;
    });

    test.afterEach(async ({ request }) => {
      if (bookId) await deleteAccountBook(request, token, bookId);
    });

    test('封存账本后应显示只读提示', async ({ page, request }) => {
      await apiRequest(request, 'PUT', `/account-books/${bookId}/archive`, { isArchived: true }, token);
      await page.goto(`/account-books/${bookId}`);
      await expect(page.getByText('账本已封存')).toBeVisible();
      await expect(page.locator('.floating-record-btn')).toHaveCount(0);
    });

    test('封存账本后管理功能区不应显示', async ({ page, request }) => {
      await apiRequest(request, 'PUT', `/account-books/${bookId}/archive`, { isArchived: true }, token);
      await page.goto(`/account-books/${bookId}`);
      await expect(page.locator('.management-section')).toHaveCount(0);
    });
  });

  test.describe('账本列表分类', () => {
    let activeBookId, archivedBookId;

    test.beforeEach(async ({ request }) => {
      const ab = await createAccountBook(request, token, { name: '进行中旅行' });
      activeBookId = ab.id;
      const ar = await createAccountBook(request, token, { name: '已完成旅行' });
      archivedBookId = ar.id;
      await apiRequest(request, 'PUT', `/account-books/${archivedBookId}/archive`, { isArchived: true }, token);
    });

    test.afterEach(async ({ request }) => {
      if (activeBookId) await deleteAccountBook(request, token, activeBookId);
      if (archivedBookId) await deleteAccountBook(request, token, archivedBookId);
    });

    test('应分别显示进行中和历史足迹分区', async ({ page }) => {
      await page.goto('/account-books');
      await expect(page.getByText('正在进行的旅行')).toBeVisible();
      await expect(page.getByText('历史足迹')).toBeVisible();
    });
  });
});
