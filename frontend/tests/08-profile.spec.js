// ============================================================
// 个人中心模块测试
// ============================================================
import { test, expect } from '@playwright/test';
import { loginOnPage } from './helpers.js';

test.describe('个人中心模块', () => {
  test.beforeEach(async ({ page, request }) => {
    await loginOnPage(page, request);
  });

  test('应正确渲染个人中心页面', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('个人中心')).toBeVisible();
    await expect(page.getByText('Cypress测试')).toBeVisible();
    await expect(page.getByText('cypress@test.com')).toBeVisible();
  });

  test('应显示统计信息', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('账本')).toBeVisible();
    await expect(page.getByText('默认币种')).toBeVisible();
    await expect(page.getByText('加入年份')).toBeVisible();
  });

  test('点击我的账本应跳转到账本列表', async ({ page }) => {
    await page.goto('/profile');
    await page.getByText('我的账本').click();
    await expect(page).toHaveURL(/\/account-books/);
  });

  test('点击返回按钮应回到账本列表', async ({ page }) => {
    await page.goto('/profile');
    await page.locator('.profile-back').click();
    await expect(page).toHaveURL(/\/account-books/);
  });

  test('退出登录应清除 token 并跳转到登录页', async ({ page }) => {
    await page.goto('/profile');
    await page.getByText('退出登录').click();
    await page.locator('.adm-dialog').getByText('确定').click();
    await expect(page).toHaveURL(/\/login/);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });

  test('取消退出登录应留在当前页面', async ({ page }) => {
    await page.goto('/profile');
    await page.getByText('退出登录').click();
    await page.locator('.adm-dialog').getByText('取消').click();
    await expect(page).toHaveURL(/\/profile/);
  });

  test('应显示默认币种为 CNY', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('CNY')).toBeVisible();
  });
});
