# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 01-auth.spec.js >> 认证模块 >> 注册页面 >> 重复邮箱注册应提示失败
- Location: tests\01-auth.spec.js:102:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.adm-toast-mask, .adm-toast-wrap, .adm-toast')
Expected: visible
Error: strict mode violation: locator('.adm-toast-mask, .adm-toast-wrap, .adm-toast') resolved to 2 elements:
    1) <div aria-hidden="true" class="adm-mask adm-toast-mask">…</div> aka locator('div').filter({ hasText: '该邮箱或手机号已被注册' }).nth(1)
    2) <div class="adm-toast-wrap">…</div> aka locator('div').filter({ hasText: '该邮箱或手机号已被注册' }).nth(3)

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.adm-toast-mask, .adm-toast-wrap, .adm-toast')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - button [ref=e5]:
        - img [ref=e8] [cursor=pointer]
      - generic [ref=e13]: 注册
    - generic [ref=e15]:
      - generic [ref=e18]:
        - generic [ref=e21]:
          - generic [ref=e23]:
            - text: 昵称
            - generic [ref=e24]: "*"
          - textbox "昵称 *" [ref=e28]:
            - /placeholder: 请输入昵称
            - text: 重复用户
        - generic [ref=e31]:
          - generic [ref=e33]: 邮箱
          - textbox "邮箱" [ref=e37]:
            - /placeholder: 请输入邮箱
            - text: cypress@test.com
        - generic [ref=e40]:
          - generic [ref=e42]: 手机号
          - textbox "手机号" [ref=e46]:
            - /placeholder: 请输入手机号
        - generic [ref=e49]:
          - generic [ref=e51]:
            - text: 密码
            - generic [ref=e52]: "*"
          - textbox "密码 *" [ref=e56]:
            - /placeholder: 请输入密码
            - text: Cypress123
        - generic [ref=e59]:
          - generic [ref=e61]:
            - text: 确认密码
            - generic [ref=e62]: "*"
          - textbox "确认密码 *" [ref=e66]:
            - /placeholder: 请再次输入密码
            - text: Cypress123
      - button "注册" [ref=e68] [cursor=pointer]
  - generic [ref=e69]:
    - img [ref=e71]
    - generic [ref=e77]: 该邮箱或手机号已被注册
```

# Test source

```ts
  10  |     await page.evaluate(() => localStorage.clear());
  11  |   });
  12  | 
  13  |   test.describe('登录页面', () => {
  14  |     test.beforeEach(async ({ page }) => {
  15  |       await page.goto('/login');
  16  |     });
  17  | 
  18  |     test('应正确渲染登录页面元素', async ({ page }) => {
  19  |       await expect(page.getByText('旅行记账')).toBeVisible();
  20  |       await expect(page.getByText('记录每一次旅行的美好')).toBeVisible();
  21  |       await expect(page.getByPlaceholder('邮箱或手机号')).toBeVisible();
  22  |       await expect(page.getByPlaceholder('请输入密码')).toBeVisible();
  23  |       await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
  24  |       await expect(page.getByText('注册账号')).toBeVisible();
  25  |     });
  26  | 
  27  |     test('账号为空时应提示必填', async ({ page }) => {
  28  |       await page.getByRole('button', { name: '登录' }).click();
  29  |       await expect(page.getByText('请输入邮箱或手机号')).toBeVisible();
  30  |     });
  31  | 
  32  |     test('密码为空时应提示必填', async ({ page }) => {
  33  |       await page.getByPlaceholder('邮箱或手机号').fill('test@example.com');
  34  |       await page.getByRole('button', { name: '登录' }).click();
  35  |       await expect(page.getByText('请输入密码')).toBeVisible();
  36  |     });
  37  | 
  38  |     test('错误密码应提示登录失败', async ({ page, request }) => {
  39  |       await ensureTestUser(request);
  40  |       await page.goto('/login');
  41  |       await page.getByPlaceholder('邮箱或手机号').fill('cypress@test.com');
  42  |       await page.getByPlaceholder('请输入密码').fill('WrongPassword');
  43  |       await page.getByRole('button', { name: '登录' }).click();
  44  |       await expect(page.locator('.adm-toast-mask, .adm-toast-wrap, .adm-toast')).toBeVisible({ timeout: 5000 });
  45  |     });
  46  | 
  47  |     test('正确凭据应登录成功并跳转到账本列表', async ({ page, request }) => {
  48  |       await ensureTestUser(request);
  49  |       await page.goto('/login');
  50  |       await page.getByPlaceholder('邮箱或手机号').fill('cypress@test.com');
  51  |       await page.getByPlaceholder('请输入密码').fill('Cypress123');
  52  |       await page.getByRole('button', { name: '登录' }).click();
  53  |       await expect(page).toHaveURL(/\/account-books/, { timeout: 10000 });
  54  |       const token = await page.evaluate(() => localStorage.getItem('token'));
  55  |       expect(token).not.toBeNull();
  56  |     });
  57  | 
  58  |     test('点击注册账号应跳转到注册页', async ({ page }) => {
  59  |       await page.getByText('注册账号').click();
  60  |       await expect(page).toHaveURL(/\/register/);
  61  |     });
  62  |   });
  63  | 
  64  |   test.describe('注册页面', () => {
  65  |     test.beforeEach(async ({ page }) => {
  66  |       await page.goto('/register');
  67  |     });
  68  | 
  69  |     test('应正确渲染注册页面元素', async ({ page }) => {
  70  |       await expect(page.getByText('注册', { exact: false })).toBeVisible();
  71  |       await expect(page.getByPlaceholder('请输入昵称')).toBeVisible();
  72  |       await expect(page.getByPlaceholder('请输入邮箱')).toBeVisible();
  73  |       await expect(page.getByPlaceholder('请输入手机号')).toBeVisible();
  74  |       await expect(page.getByPlaceholder('请输入密码')).toBeVisible();
  75  |       await expect(page.getByPlaceholder('请再次输入密码')).toBeVisible();
  76  |     });
  77  | 
  78  |     test('昵称为空时应提示必填', async ({ page }) => {
  79  |       await page.getByRole('button', { name: '注册' }).click();
  80  |       await expect(page.getByText('请输入昵称')).toBeVisible();
  81  |     });
  82  | 
  83  |     test('两次密码不一致应提示错误', async ({ page }) => {
  84  |       await page.getByPlaceholder('请输入昵称').fill('测试');
  85  |       await page.getByPlaceholder('请输入邮箱').fill(`mismatch_${Date.now()}@test.com`);
  86  |       await page.getByPlaceholder('请输入密码').fill('Password1');
  87  |       await page.getByPlaceholder('请再次输入密码').fill('Password2');
  88  |       await page.getByRole('button', { name: '注册' }).click();
  89  |       await expect(page.getByText('两次密码输入不一致')).toBeVisible();
  90  |     });
  91  | 
  92  |     test('正确填写应注册成功并跳转到账本列表', async ({ page }) => {
  93  |       await page.getByPlaceholder('请输入昵称').fill('新用户');
  94  |       await page.getByPlaceholder('请输入邮箱').fill(`reg_${Date.now()}@test.com`);
  95  |       await page.getByPlaceholder('请输入密码').fill('NewUser123');
  96  |       await page.getByPlaceholder('请再次输入密码').fill('NewUser123');
  97  |       await page.getByRole('button', { name: '注册' }).click();
  98  |       await expect(page.getByText('注册成功')).toBeVisible({ timeout: 5000 });
  99  |       await expect(page).toHaveURL(/\/account-books/, { timeout: 10000 });
  100 |     });
  101 | 
  102 |     test('重复邮箱注册应提示失败', async ({ page, request }) => {
  103 |       await ensureTestUser(request);
  104 |       await page.goto('/register');
  105 |       await page.getByPlaceholder('请输入昵称').fill('重复用户');
  106 |       await page.getByPlaceholder('请输入邮箱').fill('cypress@test.com');
  107 |       await page.getByPlaceholder('请输入密码').fill('Cypress123');
  108 |       await page.getByPlaceholder('请再次输入密码').fill('Cypress123');
  109 |       await page.getByRole('button', { name: '注册' }).click();
> 110 |       await expect(page.locator('.adm-toast-mask, .adm-toast-wrap, .adm-toast')).toBeVisible({ timeout: 5000 });
      |                                                                                  ^ Error: expect(locator).toBeVisible() failed
  111 |     });
  112 |   });
  113 | 
  114 |   test.describe('路由守卫', () => {
  115 |     test('未登录访问受保护页面应重定向到登录页', async ({ page }) => {
  116 |       await page.goto('/account-books');
  117 |       await expect(page).toHaveURL(/\/login/);
  118 |     });
  119 | 
  120 |     test('未登录访问账本详情应重定向到登录页', async ({ page }) => {
  121 |       await page.goto('/account-books/1');
  122 |       await expect(page).toHaveURL(/\/login/);
  123 |     });
  124 | 
  125 |     test('未登录访问个人中心应重定向到登录页', async ({ page }) => {
  126 |       await page.goto('/profile');
  127 |       await expect(page).toHaveURL(/\/login/);
  128 |     });
  129 |   });
  130 | });
  131 | 
```