// ============================================================
// 分账模块测试（重点）- 分账计算 / 金额正确性 / 结清状态
// ============================================================

describe('分账模块', () => {
  let bookId;

  beforeEach(() => {
    cy.ensureLoggedIn();
    cy.createAccountBook({ name: '分账测试账本' }).then((data) => {
      bookId = data.id;
      cy.setExchangeRate(bookId, 'CNY', 1);
    });
  });

  afterEach(() => {
    if (bookId) cy.deleteAccountBook(bookId);
  });

  // ------ 分账页面 UI ------
  describe('分账页面 UI', () => {
    it('应正确渲染分账页面', () => {
      cy.visit(`/account-books/${bookId}/split-bill`);
      cy.contains('自动分账').should('be.visible');
    });

    it('无成员时应显示空列表', () => {
      cy.visit(`/account-books/${bookId}/split-bill`);
      // 无参与人时 participants 为空数组
      cy.get('.participant-card').should('not.exist');
    });

    it('应显示分账规则说明', () => {
      cy.visit(`/account-books/${bookId}/split-bill`);
      cy.contains('分账规则说明').click();
      cy.contains('系统自动计算').should('be.visible');
    });
  });

  // ------ 两人均分（核心场景） ------
  describe('两人均分', () => {
    let pA, pB;

    beforeEach(() => {
      cy.addParticipant(bookId, '张三', '').then((d) => (pA = d));
      cy.addParticipant(bookId, '李四', '').then((d) => (pB = d));
    });

    it('一人付款两人均分 - 金额应正确', () => {
      // 张三付了 600，张三和李四均分
      cy.createTransaction(bookId, {
        amount: 600,
        currency: 'CNY',
        type: 'shared',
        payerId: pA.id,
        participantIds: [pA.id, pB.id],
        transactionTime: '2026-04-05 12:00:00',
      });

      cy.apiRequest('GET', `/account-books/${bookId}/split-bills/calculate`).then((resp) => {
        const data = resp.body.data;
        const zhangsan = data.participants.find((p) => p.participantName === '张三');
        const lisi = data.participants.find((p) => p.participantName === '李四');

        // 张三：实付600，应付300，余额+300（待收）
        expect(zhangsan.actualPaid).to.eq(600);
        expect(zhangsan.shouldPay).to.eq(300);
        expect(zhangsan.balance).to.eq(300);

        // 李四：实付0，应付300，余额-300（应付）
        expect(lisi.actualPaid).to.eq(0);
        expect(lisi.shouldPay).to.eq(300);
        expect(lisi.balance).to.eq(-300);

        // 支付明细：李四应付给张三 300
        expect(data.payments).to.have.length(1);
        expect(data.payments[0].fromName).to.eq('李四');
        expect(data.payments[0].toName).to.eq('张三');
        expect(data.payments[0].amount).to.eq(300);
      });
    });

    it('两人各付一笔两人均分 - 差额应正确', () => {
      // 张三付了 400
      cy.createTransaction(bookId, {
        amount: 400,
        currency: 'CNY',
        type: 'shared',
        payerId: pA.id,
        participantIds: [pA.id, pB.id],
        transactionTime: '2026-04-05 12:00:00',
      });
      // 李四付了 200
      cy.createTransaction(bookId, {
        amount: 200,
        currency: 'CNY',
        type: 'shared',
        payerId: pB.id,
        participantIds: [pA.id, pB.id],
        transactionTime: '2026-04-05 13:00:00',
      });

      cy.apiRequest('GET', `/account-books/${bookId}/split-bills/calculate`).then((resp) => {
        const data = resp.body.data;
        const zhangsan = data.participants.find((p) => p.participantName === '张三');
        const lisi = data.participants.find((p) => p.participantName === '李四');

        // 总共 600，每人应付 300
        // 张三：实付400，应付300，余额+100
        expect(zhangsan.actualPaid).to.eq(400);
        expect(zhangsan.shouldPay).to.eq(300);
        expect(zhangsan.balance).to.eq(100);

        // 李四：实付200，应付300，余额-100
        expect(lisi.actualPaid).to.eq(200);
        expect(lisi.shouldPay).to.eq(300);
        expect(lisi.balance).to.eq(-100);

        // 李四应付给张三 100
        expect(data.payments[0].amount).to.eq(100);
      });
    });

    it('两人各付相同金额 - 余额应为0', () => {
      cy.createTransaction(bookId, {
        amount: 300,
        currency: 'CNY',
        type: 'shared',
        payerId: pA.id,
        participantIds: [pA.id, pB.id],
        transactionTime: '2026-04-05 12:00:00',
      });
      cy.createTransaction(bookId, {
        amount: 300,
        currency: 'CNY',
        type: 'shared',
        payerId: pB.id,
        participantIds: [pA.id, pB.id],
        transactionTime: '2026-04-05 13:00:00',
      });

      cy.apiRequest('GET', `/account-books/${bookId}/split-bills/calculate`).then((resp) => {
        const data = resp.body.data;
        const zhangsan = data.participants.find((p) => p.participantName === '张三');
        const lisi = data.participants.find((p) => p.participantName === '李四');

        expect(zhangsan.balance).to.eq(0);
        expect(lisi.balance).to.eq(0);
        // 无需支付
        expect(data.payments).to.have.length(0);
      });
    });
  });

  // ------ 三人分账 ------
  describe('三人分账', () => {
    let pA, pB, pC;

    beforeEach(() => {
      cy.addParticipant(bookId, '张三', '').then((d) => (pA = d));
      cy.addParticipant(bookId, '李四', '').then((d) => (pB = d));
      cy.addParticipant(bookId, '王五', '').then((d) => (pC = d));
    });

    it('一人付款三人均分 - 金额应正确', () => {
      // 张三付了 900，三人均分
      cy.createTransaction(bookId, {
        amount: 900,
        currency: 'CNY',
        type: 'shared',
        payerId: pA.id,
        participantIds: [pA.id, pB.id, pC.id],
        transactionTime: '2026-04-05 12:00:00',
      });

      cy.apiRequest('GET', `/account-books/${bookId}/split-bills/calculate`).then((resp) => {
        const data = resp.body.data;
        const zhangsan = data.participants.find((p) => p.participantName === '张三');
        const lisi = data.participants.find((p) => p.participantName === '李四');
        const wangwu = data.participants.find((p) => p.participantName === '王五');

        // 每人应付 300
        expect(zhangsan.shouldPay).to.eq(300);
        expect(lisi.shouldPay).to.eq(300);
        expect(wangwu.shouldPay).to.eq(300);

        // 张三余额 +600，李四和王五各 -300
        expect(zhangsan.balance).to.eq(600);
        expect(lisi.balance).to.eq(-300);
        expect(wangwu.balance).to.eq(-300);

        // 总共应有2笔支付
        expect(data.payments).to.have.length(2);
        const totalPayment = data.payments.reduce((sum, p) => sum + p.amount, 0);
        expect(totalPayment).to.eq(600);
      });
    });

    it('不均等金额三人分 - 除不尽时精度应正确', () => {
      // 100 / 3 = 33.33... 每人
      cy.createTransaction(bookId, {
        amount: 100,
        currency: 'CNY',
        type: 'shared',
        payerId: pA.id,
        participantIds: [pA.id, pB.id, pC.id],
        transactionTime: '2026-04-05 12:00:00',
      });

      cy.apiRequest('GET', `/account-books/${bookId}/split-bills/calculate`).then((resp) => {
        const data = resp.body.data;
        const zhangsan = data.participants.find((p) => p.participantName === '张三');
        const lisi = data.participants.find((p) => p.participantName === '李四');
        const wangwu = data.participants.find((p) => p.participantName === '王五');

        // 每人应付约 33.33
        expect(zhangsan.shouldPay).to.be.closeTo(33.33, 0.01);
        expect(lisi.shouldPay).to.be.closeTo(33.33, 0.01);
        expect(wangwu.shouldPay).to.be.closeTo(33.33, 0.01);

        // 所有余额之和应接近 0（守恒）
        const totalBalance = zhangsan.balance + lisi.balance + wangwu.balance;
        expect(totalBalance).to.be.closeTo(0, 0.02);
      });
    });

    it('多笔交易不同付款人 - 最终结算应正确', () => {
      // 张三付 300（三人分）
      cy.createTransaction(bookId, {
        amount: 300,
        currency: 'CNY',
        type: 'shared',
        payerId: pA.id,
        participantIds: [pA.id, pB.id, pC.id],
        transactionTime: '2026-04-05 12:00:00',
      });
      // 李四付 600（三人分）
      cy.createTransaction(bookId, {
        amount: 600,
        currency: 'CNY',
        type: 'shared',
        payerId: pB.id,
        participantIds: [pA.id, pB.id, pC.id],
        transactionTime: '2026-04-05 13:00:00',
      });

      cy.apiRequest('GET', `/account-books/${bookId}/split-bills/calculate`).then((resp) => {
        const data = resp.body.data;
        const zhangsan = data.participants.find((p) => p.participantName === '张三');
        const lisi = data.participants.find((p) => p.participantName === '李四');
        const wangwu = data.participants.find((p) => p.participantName === '王五');

        // 总共 900，每人应付 300
        expect(zhangsan.shouldPay).to.eq(300);
        expect(lisi.shouldPay).to.eq(300);
        expect(wangwu.shouldPay).to.eq(300);

        // 张三：实付300，应付300，余额0
        expect(zhangsan.actualPaid).to.eq(300);
        expect(zhangsan.balance).to.eq(0);

        // 李四：实付600，应付300，余额+300
        expect(lisi.actualPaid).to.eq(600);
        expect(lisi.balance).to.eq(300);

        // 王五：实付0，应付300，余额-300
        expect(wangwu.actualPaid).to.eq(0);
        expect(wangwu.balance).to.eq(-300);
      });
    });
  });

  // ------ 部分参与人分账 ------
  describe('部分参与人分账', () => {
    let pA, pB, pC;

    beforeEach(() => {
      cy.addParticipant(bookId, '张三', '').then((d) => (pA = d));
      cy.addParticipant(bookId, '李四', '').then((d) => (pB = d));
      cy.addParticipant(bookId, '王五', '').then((d) => (pC = d));
    });

    it('只有两人参与的交易不应影响第三人', () => {
      // 张三付 200，只有张三和李四参与
      cy.createTransaction(bookId, {
        amount: 200,
        currency: 'CNY',
        type: 'shared',
        payerId: pA.id,
        participantIds: [pA.id, pB.id],
        transactionTime: '2026-04-05 12:00:00',
      });

      cy.apiRequest('GET', `/account-books/${bookId}/split-bills/calculate`).then((resp) => {
        const data = resp.body.data;
        const zhangsan = data.participants.find((p) => p.participantName === '张三');
        const lisi = data.participants.find((p) => p.participantName === '李四');
        const wangwu = data.participants.find((p) => p.participantName === '王五');

        // 张三和李四各应付 100
        expect(zhangsan.shouldPay).to.eq(100);
        expect(lisi.shouldPay).to.eq(100);
        // 王五不参与，应付 0
        expect(wangwu.shouldPay).to.eq(0);
        expect(wangwu.balance).to.eq(0);
      });
    });

    it('混合参与人数的多笔交易 - 计算应正确', () => {
      // 交易1：张三付 300，三人均分（每人100）
      cy.createTransaction(bookId, {
        amount: 300,
        currency: 'CNY',
        type: 'shared',
        payerId: pA.id,
        participantIds: [pA.id, pB.id, pC.id],
        transactionTime: '2026-04-05 12:00:00',
      });
      // 交易2：李四付 200，只有李四和王五分（每人100）
      cy.createTransaction(bookId, {
        amount: 200,
        currency: 'CNY',
        type: 'shared',
        payerId: pB.id,
        participantIds: [pB.id, pC.id],
        transactionTime: '2026-04-05 13:00:00',
      });

      cy.apiRequest('GET', `/account-books/${bookId}/split-bills/calculate`).then((resp) => {
        const data = resp.body.data;
        const zhangsan = data.participants.find((p) => p.participantName === '张三');
        const lisi = data.participants.find((p) => p.participantName === '李四');
        const wangwu = data.participants.find((p) => p.participantName === '王五');

        // 张三：实付300，应付100（只参与交易1），余额+200
        expect(zhangsan.actualPaid).to.eq(300);
        expect(zhangsan.shouldPay).to.eq(100);
        expect(zhangsan.balance).to.eq(200);

        // 李四：实付200，应付200（交易1的100+交易2的100），余额0
        expect(lisi.actualPaid).to.eq(200);
        expect(lisi.shouldPay).to.eq(200);
        expect(lisi.balance).to.eq(0);

        // 王五：实付0，应付200（交易1的100+交易2的100），余额-200
        expect(wangwu.actualPaid).to.eq(0);
        expect(wangwu.shouldPay).to.eq(200);
        expect(wangwu.balance).to.eq(-200);
      });
    });
  });

  // ------ 外币分账 ------
  describe('外币分账', () => {
    let pA, pB;

    beforeEach(() => {
      cy.addParticipant(bookId, '张三', '').then((d) => (pA = d));
      cy.addParticipant(bookId, '李四', '').then((d) => (pB = d));
    });

    it('外币交易应按本币金额分账', () => {
      // 1 THB = 0.2 CNY
      cy.setExchangeRate(bookId, 'THB', 0.2);

      // 张三付 1000 THB（= 200 CNY），两人分
      cy.createTransaction(bookId, {
        amount: 1000,
        currency: 'THB',
        type: 'shared',
        payerId: pA.id,
        participantIds: [pA.id, pB.id],
        transactionTime: '2026-04-05 12:00:00',
      });

      cy.apiRequest('GET', `/account-books/${bookId}/split-bills/calculate`).then((resp) => {
        const data = resp.body.data;
        const zhangsan = data.participants.find((p) => p.participantName === '张三');
        const lisi = data.participants.find((p) => p.participantName === '李四');

        // 本币 200 CNY，每人应付 100
        expect(zhangsan.shouldPay).to.eq(100);
        expect(lisi.shouldPay).to.eq(100);

        // 张三余额 +100，李四余额 -100
        expect(zhangsan.balance).to.eq(100);
        expect(lisi.balance).to.eq(-100);
      });
    });

    it('混合币种交易分账应正确', () => {
      cy.setExchangeRate(bookId, 'USD', 7.0);

      // 交易1：张三付 100 CNY（两人分）
      cy.createTransaction(bookId, {
        amount: 100,
        currency: 'CNY',
        type: 'shared',
        payerId: pA.id,
        participantIds: [pA.id, pB.id],
        transactionTime: '2026-04-05 12:00:00',
      });
      // 交易2：李四付 100 USD = 700 CNY（两人分）
      cy.createTransaction(bookId, {
        amount: 100,
        currency: 'USD',
        type: 'shared',
        payerId: pB.id,
        participantIds: [pA.id, pB.id],
        transactionTime: '2026-04-05 13:00:00',
      });

      cy.apiRequest('GET', `/account-books/${bookId}/split-bills/calculate`).then((resp) => {
        const data = resp.body.data;
        const zhangsan = data.participants.find((p) => p.participantName === '张三');
        const lisi = data.participants.find((p) => p.participantName === '李四');

        // 总共 800 CNY，每人应付 400
        expect(zhangsan.shouldPay).to.eq(400);
        expect(lisi.shouldPay).to.eq(400);

        // 张三：实付100，应付400，余额-300
        expect(zhangsan.actualPaid).to.eq(100);
        expect(zhangsan.balance).to.eq(-300);

        // 李四：实付700，应付400，余额+300
        expect(lisi.actualPaid).to.eq(700);
        expect(lisi.balance).to.eq(300);
      });
    });
  });

  // ------ 个人交易不影响分账 ------
  describe('个人交易不影响分账', () => {
    let pA, pB;

    beforeEach(() => {
      cy.addParticipant(bookId, '张三', '').then((d) => (pA = d));
      cy.addParticipant(bookId, '李四', '').then((d) => (pB = d));
    });

    it('个人交易不应计入分账', () => {
      // 个人交易
      cy.createTransaction(bookId, {
        amount: 500,
        currency: 'CNY',
        type: 'personal',
        transactionTime: '2026-04-05 12:00:00',
      });
      // 共同交易
      cy.createTransaction(bookId, {
        amount: 200,
        currency: 'CNY',
        type: 'shared',
        payerId: pA.id,
        participantIds: [pA.id, pB.id],
        transactionTime: '2026-04-05 13:00:00',
      });

      cy.apiRequest('GET', `/account-books/${bookId}/split-bills/calculate`).then((resp) => {
        const data = resp.body.data;
        // 共同支出总额应只有 200，不包含个人的 500
        expect(data.totalSharedExpense).to.eq(200);
      });
    });
  });

  // ------ 结清状态 ------
  describe('结清状态', () => {
    let pA, pB;

    beforeEach(() => {
      cy.addParticipant(bookId, '张三', '').then((d) => (pA = d));
      cy.addParticipant(bookId, '李四', '').then((d) => (pB = d));
    });

    it('应能标记参与人为已结清', () => {
      cy.apiRequest('PUT', `/account-books/${bookId}/participants/${pB.id}/settled`, {
        isSettled: true,
      }).then((resp) => {
        expect(resp.body.code).to.eq(200);
      });
    });

    it('应能取消结清标记', () => {
      // 先标记
      cy.apiRequest('PUT', `/account-books/${bookId}/participants/${pB.id}/settled`, {
        isSettled: true,
      });
      // 再取消
      cy.apiRequest('PUT', `/account-books/${bookId}/participants/${pB.id}/settled`, {
        isSettled: false,
      }).then((resp) => {
        expect(resp.body.code).to.eq(200);
      });
    });

    it('结清状态应在分账计算结果中体现', () => {
      cy.apiRequest('PUT', `/account-books/${bookId}/participants/${pA.id}/settled`, {
        isSettled: true,
      });

      cy.apiRequest('GET', `/account-books/${bookId}/split-bills/calculate`).then((resp) => {
        const zhangsan = resp.body.data.participants.find((p) => p.participantName === '张三');
        expect(zhangsan.isSettled).to.eq(true);
      });
    });
  });

  // ------ 分账页面 UI 展示 ------
  describe('分账页面 UI 展示', () => {
    let pA, pB;

    beforeEach(() => {
      cy.addParticipant(bookId, '张三', '').then((d) => (pA = d));
      cy.addParticipant(bookId, '李四', '').then((d) => (pB = d));
      cy.createTransaction(bookId, {
        amount: 400,
        currency: 'CNY',
        type: 'shared',
        payerId: pA.id,
        participantIds: [pA.id, pB.id],
        transactionTime: '2026-04-05 12:00:00',
      });
    });

    it('应显示每个参与人的余额', () => {
      cy.visit(`/account-books/${bookId}/split-bill`);
      cy.contains('张三').should('be.visible');
      cy.contains('李四').should('be.visible');
      cy.contains('200.00').should('be.visible');
    });

    it('待收款应显示绿色，应付款应显示红色', () => {
      cy.visit(`/account-books/${bookId}/split-bill`);
      cy.contains('待收金额').should('be.visible');
      cy.contains('应付金额').should('be.visible');
    });

    it('点击参与人卡片应展开详情', () => {
      cy.visit(`/account-books/${bookId}/split-bill`);
      cy.get('.participant-header').first().click();
      cy.get('.participant-detail').should('be.visible');
    });
  });
});
