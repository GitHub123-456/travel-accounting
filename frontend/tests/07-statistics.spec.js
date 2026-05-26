// ============================================================
// 统计模块测试 - 类别统计 / 成员统计 / 预算 / 总支出
// ============================================================
import { test, expect } from '@playwright/test';
import { loginOnPage, createAccountBook, deleteAccountBook, setExchangeRate, createTransaction, addParticipant, apiRequest } from './helpers.js';

test.describe('统计模块', () => {
  let token, bookId;

  test.beforeEach(async ({ page, request }) => {
    const data = await loginOnPage(page, request);
    token = data.token;
    const book = await createAccountBook(request, token, { name: '统计测试账本', budget: 5000 });
    bookId = book.id;
    await setExchangeRate(request, token, bookId, 'CNY', 1);
  });

  test.afterEach(async ({ request }) => {
    if (bookId) await deleteAccountBook(request, token, bookId);
  });

  test.describe('总支出统计', () => {
    test('无交易时总支出应为 0', async ({ page }) => {
      await page.goto(`/account-books/${bookId}`);
      await expect(page.locator('.expense-amount')).toContainText('0.00');
    });

    test('添加交易后总支出应更新', async ({ page, request }) => {
      await createTransaction(request, token, bookId, { amount: 100, transactionTime: '2026-04-05 12:00:00' });
      await createTransaction(request, token, bookId, { amount: 250.50, transactionTime: '2026-04-06 12:00:00' });
      await page.goto(`/account-books/${bookId}`);
      await expect(page.locator('.expense-amount')).toContainText('350.50');
    });
  });

  test.describe('预算进度', () => {
    test('应显示预算金额和使用百分比', async ({ page, request }) => {
      await createTransaction(request, token, bookId, { amount: 1000, transactionTime: '2026-04-05 12:00:00' });
      await page.goto(`/account-books/${bookId}`);
      await expect(page.getByText('预算')).toBeVisible();
      await expect(page.getByText('20%')).toBeVisible();
    });

    test('超过80%预算应显示警告', async ({ page, request }) => {
      await createTransaction(request, token, bookId, { amount: 4200, transactionTime: '2026-04-05 12:00:00' });
      await page.goto(`/account-books/${bookId}`);
      await expect(page.locator('.budget-percentage.warning')).toBeVisible();
    });

    test('超过100%预算应显示超支提示', async ({ page, request }) => {
      await createTransaction(request, token, bookId, { amount: 5500, transactionTime: '2026-04-05 12:00:00' });
      await page.goto(`/account-books/${bookId}`);
      await expect(page.getByText('超支')).toBeVisible();
    });
  });

  test.describe('类别统计', () => {
    test.beforeEach(async ({ request }) => {
      await createTransaction(request, token, bookId, { amount: 300, category: '餐饮', transactionTime: '2026-04-05 12:00:00' });
      await createTransaction(request, token, bookId, { amount: 500, category: '住宿', transactionTime: '2026-04-06 12:00:00' });
      await createTransaction(request, token, bookId, { amount: 200, category: '交通', transactionTime: '2026-04-07 12:00:00' });
    });

    test('应显示饼状图', async ({ page }) => {
      await page.goto(`/account-books/${bookId}`);
      await page.getByText('类别统计').click();
      await expect(page.locator('.recharts-pie')).toBeVisible();
    });

    test('应显示各分类金额', async ({ page }) => {
      await page.goto(`/account-books/${bookId}`);
      await page.getByText('类别统计').click();
      const list = page.locator('.category-detail-list');
      await expect(list.getByText('餐饮')).toBeVisible();
      await expect(list.getByText('住宿')).toBeVisible();
      await expect(list.getByText('交通')).toBeVisible();
    });

    test('分类应按金额降序排列', async ({ page }) => {
      await page.goto(`/account-books/${bookId}`);
      await page.getByText('类别统计').click();
      const items = page.locator('.category-detail-item');
      await expect(items.nth(0)).toContainText('住宿');
      await expect(items.nth(1)).toContainText('餐饮');
      await expect(items.nth(2)).toContainText('交通');
    });
  });

  test.describe('成员统计', () => {
    test('应显示共同支出总额和人均', async ({ page, request }) => {
      const pA = await addParticipant(request, token, bookId, '张三');
      const pB = await addParticipant(request, token, bookId, '李四');
      await createTransaction(request, token, bookId, {
        amount: 600, type: 'shared', payerId: pA.id, participantIds: [pA.id, pB.id],
      });
      await page.goto(`/account-books/${bookId}`);
      await page.getByText('成员统计').click();
      await expect(page.getByText('共同支出总额')).toBeVisible();
      await expect(page.getByText('600.00')).toBeVisible();
      await expect(page.getByText('人均')).toBeVisible();
    });

    test('应有跳转到详细分账方案的按钮', async ({ page, request }) => {
      await addParticipant(request, token, bookId, '张三');
      await page.goto(`/account-books/${bookId}`);
      await page.getByText('成员统计').click();
      await page.getByText('查看详细分账方案').click();
      await expect(page).toHaveURL(/\/split-bill/);
    });
  });

  test.describe('账单明细按日期分组', () => {
    test('同一天的交易应分在同一组', async ({ page, request }) => {
      await createTransaction(request, token, bookId, { amount: 50, transactionTime: '2026-04-05 08:00:00' });
      await createTransaction(request, token, bookId, { amount: 80, transactionTime: '2026-04-05 12:00:00' });
      await page.goto(`/account-books/${bookId}`);
      await page.getByText('账单明细').click();
      await expect(page.locator('.date-group')).toHaveCount(1);
      await expect(page.locator('.date-total')).toContainText('130.00');
    });

    test('不同天的交易应分在不同组', async ({ page, request }) => {
      await createTransaction(request, token, bookId, { amount: 100, transactionTime: '2026-04-05 12:00:00' });
      await createTransaction(request, token, bookId, { amount: 200, transactionTime: '2026-04-06 12:00:00' });
      await page.goto(`/account-books/${bookId}`);
      await page.getByText('账单明细').click();
      await expect(page.locator('.date-group')).toHaveCount(2);
    });
  });
});
