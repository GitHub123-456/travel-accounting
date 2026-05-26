// ============================================================
// 个人中心模块测试 - 个人信息 / 头像 / 退出登录
// ============================================================

describe('个人中心模块', () => {
  beforeEach(() => {
    cy.ensureLoggedIn();
  });

  it('应正确渲染个人中心页面', () => {
    cy.visit('/profile');
    cy.contains('个人中心').should('be.visible');
    cy.contains('Cypress测试').should('be.visible');
    cy.contains('cypress@test.com').should('be.visible');
  });

  it('应显示统计信息（账本数、默认币种、加入年份）', () => {
    cy.visit('/profile');
    cy.contains('账本').should('be.visible');
    cy.contains('默认币种').should('be.visible');
    cy.contains('加入年份').should('be.visible');
  });

  it('应显示我的账本入口', () => {
    cy.visit('/profile');
    cy.contains('我的账本').should('be.visible');
  });

  it('点击我的账本应跳转到账本列表', () => {
    cy.visit('/profile');
    cy.contains('我的账本').click();
    cy.url().should('include', '/account-books');
  });

  it('点击返回按钮应回到账本列表', () => {
    cy.visit('/profile');
    cy.get('.profile-back').click();
    cy.url().should('include', '/account-books');
  });

  it('退出登录应清除 token 并跳转到登录页', () => {
    cy.visit('/profile');
    cy.contains('退出登录').click();
    // 确认对话框
    cy.get('.adm-dialog').should('be.visible');
    cy.get('.adm-dialog').contains('确定').click();

    cy.url().should('include', '/login');
    cy.window().its('localStorage').invoke('getItem', 'token').should('be.null');
    cy.window().its('localStorage').invoke('getItem', 'userId').should('be.null');
  });

  it('取消退出登录应留在当前页面', () => {
    cy.visit('/profile');
    cy.contains('退出登录').click();
    cy.get('.adm-dialog').contains('取消').click();
    cy.url().should('include', '/profile');
  });

  it('应显示默认币种为 CNY', () => {
    cy.visit('/profile');
    cy.contains('CNY').should('be.visible');
  });
});
