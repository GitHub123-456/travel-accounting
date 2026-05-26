// ============================================================
// 汇率管理模块测试 - 设置汇率 / 汇率换算 / 汇率更新
// ============================================================

describe('汇率管理模块', () => {
  let bookId;

  beforeEach(() => {
    cy.ensureLoggedIn();
    cy.createAccountBook({ name: '汇率测试账本' }).then((data) => {
      bookId = data.id;
    });
  });

  afterEach(() => {
    if (bookId) cy.deleteAccountBook(bookId);
  });

  it('点击汇率管理应弹出管理面板', () => {
    cy.visit(`/account-books/${bookId}`);
    cy.contains('汇率管理').click();
    cy.contains('汇率管理').should('be.visible');
    cy.contains('选择操作币种').should('be.visible');
  });

  it('应显示可选币种列表（排除默认币种CNY）', () => {
    cy.visit(`/account-books/${bookId}`);
    cy.contains('汇率管理').click();
    // 应显示 THB, USD, EUR, JPY, KRW（不含 CNY）
    cy.contains('THB').should('be.visible');
    cy.contains('USD').should('be.visible');
    cy.contains('EUR').should('be.visible');
    cy.contains('JPY').should('be.visible');
    cy.contains('KRW').should('be.visible');
  });

  it('无汇率记录时应显示空状态', () => {
    cy.visit(`/account-books/${bookId}`);
    cy.contains('汇率管理').click();
    cy.contains('暂无汇率记录').should('be.visible');
  });

  it('应能添加汇率记录', () => {
    cy.visit(`/account-books/${bookId}`);
    cy.contains('汇率管理').click();

    // 选择 THB
    cy.get('.adm-selector').contains('THB').click();
    // 点击新增
    cy.contains('新增兑换记录').click();
    // 输入汇率
    cy.get('.add-rate-form input[type="number"]').type('0.2');
    // 保存
    cy.get('.action-buttons').contains('button', '保存').click();

    cy.contains('汇率设置成功').should('be.visible');
  });

  it('添加汇率后应显示在记录列表中', () => {
    cy.setExchangeRate(bookId, 'USD', 7.25);

    cy.visit(`/account-books/${bookId}`);
    cy.contains('汇率管理').click();
    cy.get('.adm-selector').contains('USD').click();

    // 应显示记录
    cy.contains('共').should('be.visible');
    cy.contains('7.25').should('be.visible');
  });

  it('汇率输入验证 - 空值应提示必填', () => {
    cy.visit(`/account-books/${bookId}`);
    cy.contains('汇率管理').click();
    cy.contains('新增兑换记录').click();
    cy.get('.action-buttons').contains('button', '保存').click();
    cy.contains('请输入汇率').should('be.visible');
  });

  it('应显示当前汇率换算公式', () => {
    cy.setExchangeRate(bookId, 'THB', 0.2);

    cy.visit(`/account-books/${bookId}`);
    cy.contains('汇率管理').click();
    cy.get('.adm-selector').contains('THB').click();

    // 应显示 1 THB = 0.2 CNY
    cy.contains('1 THB').should('be.visible');
    cy.contains('0.2').should('be.visible');
  });

  it('更新汇率应覆盖旧值', () => {
    cy.setExchangeRate(bookId, 'EUR', 7.8);

    cy.visit(`/account-books/${bookId}`);
    cy.contains('汇率管理').click();
    cy.get('.adm-selector').contains('EUR').click();

    // 修改汇率
    cy.contains('修改汇率').click();
    cy.get('.add-rate-form input[type="number"]').clear().type('7.95');
    cy.get('.action-buttons').contains('button', '保存').click();

    cy.contains('汇率设置成功').should('be.visible');
  });

  it('封存账本后不应允许修改汇率', () => {
    cy.apiRequest('PUT', `/account-books/${bookId}/archive`, { isArchived: true });

    cy.visit(`/account-books/${bookId}`);
    // 封存后管理区不显示
    cy.get('.management-section').should('not.exist');

    // 通过 API 验证
    cy.apiRequest('POST', `/account-books/${bookId}/exchange-rates`, {
      currency: 'USD',
      rate: 7.0,
    }).then((resp) => {
      expect(resp.body.message).to.contain('封存');
    });
  });

  // ------ 汇率换算正确性（重点金钱测试） ------
  describe('汇率换算正确性', () => {
    it('设置汇率后创建交易应正确计算本币金额', () => {
      // 设置 1 THB = 0.2 CNY
      cy.setExchangeRate(bookId, 'THB', 0.2);

      // 创建 500 THB 的交易
      cy.createTransaction(bookId, {
        amount: 500,
        currency: 'THB',
        category: '餐饮',
        transactionTime: '2026-04-05 12:00:00',
      });

      // 验证本币金额 = 500 * 0.2 = 100 CNY
      cy.apiRequest('GET', `/account-books/${bookId}/transactions`).then((resp) => {
        const transaction = resp.body.data.list[0];
        expect(parseFloat(transaction.local_amount)).to.eq(100);
      });
    });

    it('更新汇率应重新计算所有该币种交易的本币金额', () => {
      cy.setExchangeRate(bookId, 'USD', 7.0);
      cy.createTransaction(bookId, {
        amount: 100,
        currency: 'USD',
        transactionTime: '2026-04-05 12:00:00',
      });

      // 验证初始本币金额 = 100 * 7.0 = 700
      cy.apiRequest('GET', `/account-books/${bookId}/transactions`).then((resp) => {
        expect(parseFloat(resp.body.data.list[0].local_amount)).to.eq(700);
      });

      // 更新汇率为 7.25
      cy.setExchangeRate(bookId, 'USD', 7.25);

      // 验证更新后本币金额 = 100 * 7.25 = 725
      cy.apiRequest('GET', `/account-books/${bookId}/transactions`).then((resp) => {
        expect(parseFloat(resp.body.data.list[0].local_amount)).to.eq(725);
      });
    });

    it('不同币种交易应使用各自汇率换算', () => {
      cy.setExchangeRate(bookId, 'USD', 7.25);
      cy.setExchangeRate(bookId, 'JPY', 0.048);

      cy.createTransaction(bookId, {
        amount: 100,
        currency: 'USD',
        transactionTime: '2026-04-05 12:00:00',
        remark: 'USD交易',
      });
      cy.createTransaction(bookId, {
        amount: 5000,
        currency: 'JPY',
        transactionTime: '2026-04-05 13:00:00',
        remark: 'JPY交易',
      });

      cy.apiRequest('GET', `/account-books/${bookId}/transactions`).then((resp) => {
        const list = resp.body.data.list;
        const usdTx = list.find((t) => t.remark === 'USD交易');
        const jpyTx = list.find((t) => t.remark === 'JPY交易');

        // USD: 100 * 7.25 = 725
        expect(parseFloat(usdTx.local_amount)).to.eq(725);
        // JPY: 5000 * 0.048 = 240
        expect(parseFloat(jpyTx.local_amount)).to.eq(240);
      });
    });

    it('CNY 交易本币金额应等于原始金额（汇率=1）', () => {
      cy.setExchangeRate(bookId, 'CNY', 1);
      cy.createTransaction(bookId, {
        amount: 256.78,
        currency: 'CNY',
        transactionTime: '2026-04-05 12:00:00',
      });

      cy.apiRequest('GET', `/account-books/${bookId}/transactions`).then((resp) => {
        expect(parseFloat(resp.body.data.list[0].local_amount)).to.eq(256.78);
      });
    });
  });
});
