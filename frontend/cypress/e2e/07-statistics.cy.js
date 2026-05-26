// ============================================================
// 统计模块测试 - 类别统计 / 成员统计 / 预算 / 总支出
// ============================================================

describe('统计模块', () => {
  let bookId;

  beforeEach(() => {
    cy.ensureLoggedIn();
    cy.createAccountBook({ name: '统计测试账本', budget: 5000 }).then((data) => {
      bookId = data.id;
      cy.setExchangeRate(bookId, 'CNY', 1);
    });
  });

  afterEach(() => {
    if (bookId) cy.deleteAccountBook(bookId);
  });

  // ------ 总支出统计 ------
  describe('总支出统计', () => {
    it('无交易时总支出应为 0', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.contains('总支出').should('be.visible');
      cy.get('.expense-amount').should('contain', '0.00');
    });

    it('添加交易后总支出应更新', () => {
      cy.createTransaction(bookId, { amount: 100, transactionTime: '2026-04-05 12:00:00' });
      cy.createTransaction(bookId, { amount: 250.50, transactionTime: '2026-04-06 12:00:00' });

      cy.visit(`/account-books/${bookId}`);
      // 总支出应为 350.50
      cy.get('.expense-amount').should('contain', '350.50');
    });

    it('删除交易后总支出应减少', () => {
      cy.createTransaction(bookId, { amount: 200, transactionTime: '2026-04-05 12:00:00' }).then((d1) => {
        cy.createTransaction(bookId, { amount: 300, transactionTime: '2026-04-06 12:00:00' });
        cy.apiRequest('DELETE', `/transactions/${d1.id}`);
      });

      cy.visit(`/account-books/${bookId}`);
      cy.get('.expense-amount').should('contain', '300.00');
    });
  });

  // ------ 预算进度 ------
  describe('预算进度', () => {
    it('应显示预算金额和使用百分比', () => {
      cy.createTransaction(bookId, { amount: 1000, transactionTime: '2026-04-05 12:00:00' });

      cy.visit(`/account-books/${bookId}`);
      cy.contains('预算').should('be.visible');
      cy.contains('5000').should('be.visible');
      // 1000/5000 = 20%
      cy.contains('20%').should('be.visible');
    });

    it('超过80%预算应显示警告', () => {
      cy.createTransaction(bookId, { amount: 4200, transactionTime: '2026-04-05 12:00:00' });

      cy.visit(`/account-books/${bookId}`);
      // 4200/5000 = 84%
      cy.get('.budget-percentage.warning').should('exist');
    });

    it('超过100%预算应显示超支提示', () => {
      cy.createTransaction(bookId, { amount: 5500, transactionTime: '2026-04-05 12:00:00' });

      cy.visit(`/account-books/${bookId}`);
      cy.contains('超支').should('be.visible');
      cy.contains('500').should('be.visible'); // 超支 500
    });

    it('无预算时不应显示进度条', () => {
      cy.createAccountBook({ name: '无预算账本', budget: null }).then((data) => {
        cy.visit(`/account-books/${data.id}`);
        cy.get('.budget-progress').should('not.exist');
        cy.deleteAccountBook(data.id);
      });
    });
  });

  // ------ 类别统计 ------
  describe('类别统计', () => {
    beforeEach(() => {
      cy.createTransaction(bookId, { amount: 300, category: '餐饮', transactionTime: '2026-04-05 12:00:00' });
      cy.createTransaction(bookId, { amount: 500, category: '住宿', transactionTime: '2026-04-06 12:00:00' });
      cy.createTransaction(bookId, { amount: 200, category: '交通', transactionTime: '2026-04-07 12:00:00' });
    });

    it('应显示饼状图', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.contains('类别统计').click();
      cy.get('.recharts-pie').should('exist');
    });

    it('应显示各分类金额和占比', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.contains('类别统计').click();

      cy.get('.category-detail-list').within(() => {
        cy.contains('餐饮').should('be.visible');
        cy.contains('住宿').should('be.visible');
        cy.contains('交通').should('be.visible');
      });
    });

    it('分类应按金额降序排列', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.contains('类别统计').click();

      cy.get('.category-detail-item').then(($items) => {
        // 第一个应该是住宿（500），第二个餐饮（300），第三个交通（200）
        expect($items.eq(0).text()).to.contain('住宿');
        expect($items.eq(1).text()).to.contain('餐饮');
        expect($items.eq(2).text()).to.contain('交通');
      });
    });

    it('各分类占比之和应为100%', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.contains('类别统计').click();

      cy.get('.category-detail-percent').then(($percents) => {
        let total = 0;
        $percents.each((_, el) => {
          total += parseFloat(el.textContent);
        });
        expect(total).to.be.closeTo(100, 0.5);
      });
    });

    it('无交易时应显示空状态', () => {
      cy.createAccountBook({ name: '空统计账本' }).then((data) => {
        cy.visit(`/account-books/${data.id}`);
        cy.contains('类别统计').click();
        cy.contains('暂无消费数据').should('be.visible');
        cy.deleteAccountBook(data.id);
      });
    });
  });

  // ------ 成员统计 ------
  describe('成员统计', () => {
    let pA, pB;

    beforeEach(() => {
      cy.addParticipant(bookId, '张三', '').then((d) => (pA = d));
      cy.addParticipant(bookId, '李四', '').then((d) => (pB = d));

      // 张三付 600，两人分
      cy.createTransaction(bookId, {
        amount: 600,
        currency: 'CNY',
        type: 'shared',
        payerId: pA.id,
        participantIds: [pA.id, pB.id],
        transactionTime: '2026-04-05 12:00:00',
      });
    });

    it('应显示共同支出总额', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.contains('成员统计').click();
      cy.contains('共同支出总额').should('be.visible');
      cy.contains('600.00').should('be.visible');
    });

    it('应显示人均金额', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.contains('成员统计').click();
      // 600 / 2 = 300
      cy.contains('人均').should('be.visible');
      cy.contains('300').should('be.visible');
    });

    it('应显示每个成员的实际支付和应付金额', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.contains('成员统计').click();

      cy.contains('张三').should('be.visible');
      cy.contains('李四').should('be.visible');
      cy.contains('实际支付').should('be.visible');
      cy.contains('应付金额').should('be.visible');
    });

    it('应显示待收款/需支付标签', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.contains('成员统计').click();
      cy.contains('待收款').should('be.visible');
      cy.contains('需支付').should('be.visible');
    });

    it('应有跳转到详细分账方案的按钮', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.contains('成员统计').click();
      cy.contains('查看详细分账方案').should('be.visible');
      cy.contains('查看详细分账方案').click();
      cy.url().should('include', '/split-bill');
    });
  });

  // ------ 按日期分组 ------
  describe('账单明细按日期分组', () => {
    it('同一天的交易应分在同一组', () => {
      cy.createTransaction(bookId, {
        amount: 50,
        category: '餐饮',
        remark: '早餐',
        transactionTime: '2026-04-05 08:00:00',
      });
      cy.createTransaction(bookId, {
        amount: 80,
        category: '餐饮',
        remark: '午餐',
        transactionTime: '2026-04-05 12:00:00',
      });

      cy.visit(`/account-books/${bookId}`);
      cy.contains('账单明细').click();

      // 应只有一个日期分组
      cy.get('.date-group').should('have.length', 1);
      // 日期小计应为 130
      cy.get('.date-total').should('contain', '130.00');
    });

    it('不同天的交易应分在不同组', () => {
      cy.createTransaction(bookId, {
        amount: 100,
        transactionTime: '2026-04-05 12:00:00',
      });
      cy.createTransaction(bookId, {
        amount: 200,
        transactionTime: '2026-04-06 12:00:00',
      });

      cy.visit(`/account-books/${bookId}`);
      cy.contains('账单明细').click();

      cy.get('.date-group').should('have.length', 2);
    });
  });
});
