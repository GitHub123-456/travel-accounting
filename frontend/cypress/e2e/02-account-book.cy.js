// ============================================================
// 账本模块测试 - 创建 / 列表 / 详情 / 编辑 / 封存 / 删除
// ============================================================

describe('账本模块', () => {
  beforeEach(() => {
    cy.ensureLoggedIn();
  });

  // ------ 账本列表页 ------
  describe('账本列表页', () => {
    it('应正确渲染列表页元素', () => {
      cy.visit('/account-books');
      cy.contains('我的账本').should('be.visible');
      cy.get('input[placeholder="搜索账本"]').should('be.visible');
      // 浮动添加按钮
      cy.get('.floating-add-btn').should('be.visible');
    });

    it('无账本时应显示空状态', () => {
      // 拦截 API 返回空列表
      cy.intercept('GET', '/api/account-books*', {
        body: { code: 200, message: '成功', data: { list: [], total: 0 } },
      }).as('emptyBooks');

      cy.visit('/account-books');
      cy.wait('@emptyBooks');
      cy.contains('还没有账本').should('be.visible');
    });

    it('点击头像应跳转到个人中心', () => {
      cy.visit('/account-books');
      cy.get('.profile-avatar-btn').click();
      cy.url().should('include', '/profile');
    });

    it('搜索功能应过滤账本', () => {
      // 先创建两个账本
      cy.createAccountBook({ name: '搜索测试_东京游' });
      cy.createAccountBook({ name: '搜索测试_巴黎行' });

      cy.visit('/account-books');
      cy.get('input[placeholder="搜索账本"]').type('东京');
      cy.wait(500);
      // 应只显示包含"东京"的账本
      cy.contains('搜索测试_东京游').should('be.visible');
    });
  });

  // ------ 创建账本 ------
  describe('创建账本', () => {
    it('点击浮动按钮应弹出创建表单', () => {
      cy.visit('/account-books');
      cy.get('.floating-add-btn').click();
      cy.contains('新建账本').should('be.visible');
    });

    it('必填字段为空时应提示验证错误', () => {
      cy.visit('/account-books');
      cy.get('.floating-add-btn').click();
      // 直接点击创建
      cy.get('.adm-popup-body').contains('button', '创建').click();
      cy.contains('请输入旅行名称').should('be.visible');
    });

    it('正确填写应创建成功并跳转到详情页', () => {
      cy.visit('/account-books');
      cy.get('.floating-add-btn').click();

      cy.get('input[placeholder="如：日本之旅"]').type('Cypress自动化旅行');
      cy.get('input[placeholder="如：东京"]').type('大阪');

      // 选择开始日期
      cy.get('.adm-popup-body').contains('开始日期').parent().click();
      cy.get('.adm-picker-popup .adm-picker-view-column').should('be.visible');
      cy.contains('button', '确定').click();

      // 选择结束日期
      cy.get('.adm-popup-body').contains('结束日期').parent().click();
      cy.get('.adm-picker-popup .adm-picker-view-column').should('be.visible');
      cy.contains('button', '确定').click();

      // 预算
      cy.get('input[placeholder="如：5000"]').type('8000');

      cy.get('.adm-popup-body').contains('button', '创建').click();
      cy.contains('创建成功').should('be.visible');
      // 应跳转到详情页
      cy.url().should('match', /\/account-books\/\d+/);
    });

    it('创建的账本应出现在列表中', () => {
      const bookName = `列表验证_${Date.now()}`;
      cy.createAccountBook({ name: bookName });
      cy.visit('/account-books');
      cy.contains(bookName).should('be.visible');
    });
  });

  // ------ 账本详情页 ------
  describe('账本详情页', () => {
    let bookId;

    beforeEach(() => {
      cy.createAccountBook({ name: '详情测试账本', budget: 5000 }).then((data) => {
        bookId = data.id;
      });
    });

    afterEach(() => {
      if (bookId) cy.deleteAccountBook(bookId);
    });

    it('应正确显示账本基本信息', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.contains('详情测试账本').should('be.visible');
      cy.contains('东京').should('be.visible');
    });

    it('应显示四个标签页', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.contains('总览').should('be.visible');
      cy.contains('账单明细').should('be.visible');
      cy.contains('类别统计').should('be.visible');
      cy.contains('成员统计').should('be.visible');
    });

    it('总览页应显示总支出和预算进度', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.contains('总支出').should('be.visible');
      cy.contains('预算').should('be.visible');
    });

    it('无交易时账单明细应显示空状态', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.contains('账单明细').click();
      cy.contains('暂无账单记录').should('be.visible');
    });

    it('应显示管理功能区（汇率管理、成员管理）', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.contains('汇率管理').should('be.visible');
      cy.contains('成员管理').should('be.visible');
    });

    it('点击记账按钮应跳转到记账表单', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.get('.floating-record-btn').click();
      cy.url().should('include', '/transactions/new');
    });

    it('点击自动分账应跳转到分账页面', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.contains('自动分账').click();
      cy.url().should('include', '/split-bill');
    });
  });

  // ------ 账本设置（编辑/封存/删除） ------
  describe('账本设置', () => {
    let bookId;

    beforeEach(() => {
      cy.createAccountBook({ name: '设置测试账本' }).then((data) => {
        bookId = data.id;
      });
    });

    it('应能打开设置菜单', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.get('.settings-btn').click();
      // ActionSheet 应出现
      cy.get('.adm-action-sheet').should('be.visible');
    });

    it('封存账本后应显示只读提示', () => {
      cy.visit(`/account-books/${bookId}`);
      // 通过 API 封存
      cy.apiRequest('PUT', `/account-books/${bookId}/archive`, { isArchived: true });
      cy.visit(`/account-books/${bookId}`);
      cy.contains('账本已封存').should('be.visible');
      // 不应显示记账按钮
      cy.get('.floating-record-btn').should('not.exist');
    });

    it('封存账本后管理功能区不应显示', () => {
      cy.apiRequest('PUT', `/account-books/${bookId}/archive`, { isArchived: true });
      cy.visit(`/account-books/${bookId}`);
      cy.get('.management-section').should('not.exist');
    });

    it('删除账本后应返回列表页', () => {
      cy.apiRequest('DELETE', `/account-books/${bookId}`);
      cy.visit('/account-books');
      cy.contains('设置测试账本').should('not.exist');
      bookId = null; // 已删除，跳过 afterEach 清理
    });
  });

  // ------ 账本列表分类显示 ------
  describe('账本列表分类', () => {
    let activeBookId, archivedBookId;

    before(() => {
      cy.ensureLoggedIn();
      cy.createAccountBook({ name: '进行中旅行' }).then((data) => {
        activeBookId = data.id;
      });
      cy.createAccountBook({ name: '已完成旅行' }).then((data) => {
        archivedBookId = data.id;
        cy.apiRequest('PUT', `/account-books/${archivedBookId}/archive`, { isArchived: true });
      });
    });

    after(() => {
      if (activeBookId) cy.deleteAccountBook(activeBookId);
      if (archivedBookId) cy.deleteAccountBook(archivedBookId);
    });

    it('应分别显示进行中和历史足迹分区', () => {
      cy.visit('/account-books');
      cy.contains('正在进行的旅行').should('be.visible');
      cy.contains('历史足迹').should('be.visible');
    });

    it('进行中账本应显示"进行中"标签', () => {
      cy.visit('/account-books');
      cy.contains('进行中旅行').parent().parent().within(() => {
        cy.contains('进行中').should('be.visible');
      });
    });

    it('已封存账本应显示"已封存"标签', () => {
      cy.visit('/account-books');
      cy.contains('已完成旅行').parent().parent().within(() => {
        cy.contains('已封存').should('be.visible');
      });
    });
  });
});
