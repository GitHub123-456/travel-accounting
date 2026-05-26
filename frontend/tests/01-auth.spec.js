// ============================================================
// 认证模块测试 - 登录 / 注册 / Token 管理
// ============================================================
import { test, expect } from '@playwright/test';
import { ensureTestUser } from './helpers.js';

test.describe('认证模块', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
  });

  test.describe('登录页面', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
    });

    test('应正确渲染登录页面元素', async ({ page }) => {
      await expect(page.getByText('旅行记账')).toBeVisible();
      await expect(page.getByText('记录每一次旅行的美好')).toBeVisible();
      await expect(page.getByPlaceholder('邮箱或手机号')).toBeVisible();
      await expect(page.getByPlaceholder('请输入密码')).toBeVisible();
      await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
      await expect(page.getByText('注册账号')).toBeVisible();
    });

    test('账号为空时应提示必填', async ({ page }) => {
      await page.getByRole('button', { name: '登录' }).click();
      await expect(page.getByText('请输入邮箱或手机号')).toBeVisible();
    });

    test('密码为空时应提示必填', async ({ page }) => {
      await page.getByPlaceholder('邮箱或手机号').fill('test@example.com');
      await page.getByRole('button', { name: '登录' }).click();
      await expect(page.getByText('请输入密码')).toBeVisible();
    });

    test('错误密码应提示登录失败', async ({ page, request }) => {
      await ensureTestUser(request);
      await page.goto('/login');
      await page.getByPlaceholder('邮箱或手机号').fill('cypress@test.com');
      await page.getByPlaceholder('请输入密码').fill('WrongPassword');
      await page.getByRole('button', { name: '登录' }).click();
      await expect(page.locator('.adm-toast-wrap').first()).toBeVisible({ timeout: 5000 });
    });

    test('正确凭据应登录成功并跳转到账本列表', async ({ page, request }) => {
      await ensureTestUser(request);
      await page.goto('/login');
      await page.getByPlaceholder('邮箱或手机号').fill('cypress@test.com');
      await page.getByPlaceholder('请输入密码').fill('Cypress123');
      await page.getByRole('button', { name: '登录' }).click();
      await expect(page).toHaveURL(/\/account-books/, { timeout: 10000 });
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).not.toBeNull();
    });

    test('点击注册账号应跳转到注册页', async ({ page }) => {
      await page.getByText('注册账号').click();
      await expect(page).toHaveURL(/\/register/);
    });
  });

  test.describe('注册页面', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/register');
    });

    test('应正确渲染注册页面元素', async ({ page }) => {
      await expect(page.locator('.adm-nav-bar-title')).toContainText('注册');
      await expect(page.getByPlaceholder('请输入昵称')).toBeVisible();
      await expect(page.getByPlaceholder('请输入邮箱')).toBeVisible();
      await expect(page.getByPlaceholder('请输入手机号')).toBeVisible();
      await expect(page.getByPlaceholder('请输入密码')).toBeVisible();
      await expect(page.getByPlaceholder('请再次输入密码')).toBeVisible();
    });

    test('昵称为空时应提示必填', async ({ page }) => {
      await page.getByRole('button', { name: '注册' }).click();
      await expect(page.getByText('请输入昵称')).toBeVisible();
    });

    test('两次密码不一致应提示错误', async ({ page }) => {
      await page.getByPlaceholder('请输入昵称').fill('测试');
      await page.getByPlaceholder('请输入邮箱').fill(`mismatch_${Date.now()}@test.com`);
      await page.getByPlaceholder('请输入密码').fill('Password1');
      await page.getByPlaceholder('请再次输入密码').fill('Password2');
      await page.getByRole('button', { name: '注册' }).click();
      await expect(page.getByText('两次密码输入不一致')).toBeVisible();
    });

    test('正确填写应注册成功并跳转到账本列表', async ({ page }) => {
      await page.getByPlaceholder('请输入昵称').fill('新用户');
      await page.getByPlaceholder('请输入邮箱').fill(`reg_${Date.now()}@test.com`);
      await page.getByPlaceholder('请输入密码').fill('NewUser123');
      await page.getByPlaceholder('请再次输入密码').fill('NewUser123');
      await page.getByRole('button', { name: '注册' }).click();
      await expect(page.getByText('注册成功')).toBeVisible({ timeout: 5000 });
      await expect(page).toHaveURL(/\/account-books/, { timeout: 10000 });
    });

    test('重复邮箱注册应提示失败', async ({ page, request }) => {
      await ensureTestUser(request);
      await page.goto('/register');
      await page.getByPlaceholder('请输入昵称').fill('重复用户');
      await page.getByPlaceholder('请输入邮箱').fill('cypress@test.com');
      await page.getByPlaceholder('请输入密码').fill('Cypress123');
      await page.getByPlaceholder('请再次输入密码').fill('Cypress123');
      await page.getByRole('button', { name: '注册' }).click();
      await expect(page.locator('.adm-toast-wrap').first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('路由守卫', () => {
    test('未登录访问受保护页面应重定向到登录页', async ({ page }) => {
      await page.goto('/account-books');
      await expect(page).toHaveURL(/\/login/);
    });

    test('未登录访问账本详情应重定向到登录页', async ({ page }) => {
      await page.goto('/account-books/1');
      await expect(page).toHaveURL(/\/login/);
    });

    test('未登录访问个人中心应重定向到登录页', async ({ page }) => {
      await page.goto('/profile');
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
