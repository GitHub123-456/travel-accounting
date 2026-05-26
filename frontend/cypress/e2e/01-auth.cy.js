// ============================================================
// 认证模块测试 - 登录 / 注册 / Token 管理
// ============================================================

describe('认证模块', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  // ------ 登录页面 ------
  describe('登录页面', () => {
    beforeEach(() => {
      cy.visit('/login');
    });

    it('应正确渲染登录页面元素', () => {
      cy.contains('旅行记账').should('be.visible');
      cy.contains('记录每一次旅行的美好').should('be.visible');
      cy.get('input[placeholder="邮箱或手机号"]').should('be.visible');
      cy.get('input[placeholder="请输入密码"]').should('be.visible');
      cy.contains('button', '登录').should('be.visible');
      cy.contains('注册账号').should('be.visible');
    });

    it('账号为空时应提示必填', () => {
      cy.contains('button', '登录').click();
      cy.contains('请输入邮箱或手机号').should('be.visible');
    });

    it('密码为空时应提示必填', () => {
      cy.get('input[placeholder="邮箱或手机号"]').type('test@example.com');
      cy.contains('button', '登录').click();
      cy.contains('请输入密码').should('be.visible');
    });

    it('错误密码应提示登录失败', () => {
      cy.ensureLoggedIn();
      cy.clearLocalStorage();
      cy.visit('/login');

      cy.get('input[placeholder="邮箱或手机号"]').type('cypress@test.com');
      cy.get('input[placeholder="请输入密码"]').type('WrongPassword');
      cy.contains('button', '登录').click();
      // 应显示错误 Toast（adm-toast-mask 是 antd-mobile Toast 的外层容器）
      cy.get('.adm-toast-mask, .adm-toast-wrap, .adm-toast', { timeout: 5000 })
        .should('exist');
    });

    it('正确凭据应登录成功并跳转到账本列表', () => {
      // 先确保用户存在
      cy.ensureLoggedIn();
      cy.clearLocalStorage();
      cy.visit('/login');

      cy.get('input[placeholder="邮箱或手机号"]').type('cypress@test.com');
      cy.get('input[placeholder="请输入密码"]').type('Cypress123');
      cy.contains('button', '登录').click();

      cy.url().should('include', '/account-books');
      cy.window().its('localStorage').invoke('getItem', 'token').should('not.be.null');
      cy.window().its('localStorage').invoke('getItem', 'userId').should('not.be.null');
    });

    it('点击注册账号应跳转到注册页', () => {
      cy.contains('注册账号').click();
      cy.url().should('include', '/register');
    });
  });

  // ------ 注册页面 ------
  describe('注册页面', () => {
    beforeEach(() => {
      cy.visit('/register');
    });

    it('应正确渲染注册页面元素', () => {
      cy.contains('注册').should('be.visible');
      cy.get('input[placeholder="请输入昵称"]').should('be.visible');
      cy.get('input[placeholder="请输入邮箱"]').should('be.visible');
      cy.get('input[placeholder="请输入手机号"]').should('be.visible');
      cy.get('input[placeholder="请输入密码"]').should('be.visible');
      cy.get('input[placeholder="请再次输入密码"]').should('be.visible');
      cy.contains('button', '注册').should('be.visible');
    });

    it('昵称为空时应提示必填', () => {
      cy.contains('button', '注册').click();
      cy.contains('请输入昵称').should('be.visible');
    });

    it('两次密码不一致应提示错误', () => {
      const email = `reg_mismatch_${Date.now()}@test.com`;
      cy.get('input[placeholder="请输入昵称"]').type('测试');
      cy.get('input[placeholder="请输入邮箱"]').type(email);
      cy.get('input[placeholder="请输入密码"]').type('Password1');
      cy.get('input[placeholder="请再次输入密码"]').type('Password2');
      cy.contains('button', '注册').click();
      cy.contains('两次密码输入不一致').should('be.visible');
    });

    it('正确填写应注册成功并跳转到账本列表', () => {
      const email = `reg_ok_${Date.now()}@test.com`;
      cy.get('input[placeholder="请输入昵称"]').type('新用户');
      cy.get('input[placeholder="请输入邮箱"]').type(email);
      cy.get('input[placeholder="请输入密码"]').type('NewUser123');
      cy.get('input[placeholder="请再次输入密码"]').type('NewUser123');
      cy.contains('button', '注册').click();

      cy.contains('注册成功').should('be.visible');
      cy.url().should('include', '/account-books');
      cy.window().its('localStorage').invoke('getItem', 'token').should('not.be.null');
    });

    it('重复邮箱注册应提示失败', () => {
      cy.ensureLoggedIn(); // 确保 cypress@test.com 已存在
      cy.clearLocalStorage();
      cy.visit('/register');

      cy.get('input[placeholder="请输入昵称"]').type('重复用户');
      cy.get('input[placeholder="请输入邮箱"]').type('cypress@test.com');
      cy.get('input[placeholder="请输入密码"]').type('Cypress123');
      cy.get('input[placeholder="请再次输入密码"]').type('Cypress123');
      cy.contains('button', '注册').click();

      cy.get('.adm-toast-mask, .adm-toast-wrap, .adm-toast', { timeout: 5000 })
        .should('exist');
    });
  });

  // ------ Token / 路由守卫 ------
  describe('路由守卫', () => {
    it('未登录访问受保护页面应重定向到登录页', () => {
      cy.visit('/account-books');
      cy.url().should('include', '/login');
    });

    it('未登录访问账本详情应重定向到登录页', () => {
      cy.visit('/account-books/1');
      cy.url().should('include', '/login');
    });

    it('未登录访问个人中心应重定向到登录页', () => {
      cy.visit('/profile');
      cy.url().should('include', '/login');
    });

    it('Token 过期后 API 请求应跳转到登录页', () => {
      // 设置一个无效 token
      window.localStorage.setItem('token', 'invalid_expired_token');
      cy.visit('/account-books');
      cy.url().should('include', '/login');
    });
  });
});
