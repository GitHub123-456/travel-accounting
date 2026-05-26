// ============================================================
// 金钱精度综合测试（重点）- 端到端金额正确性验证
// ============================================================

describe('金钱精度综合测试', () => {
  let bookId;

  beforeEach(() => {
    cy.ensureLoggedIn();
    cy.createAccountBook({ name: '金钱精度测试', budget: 50000 }).then((data) => {
      bookId = data.id;
      cy.setExchangeRate(bookId, 'CNY', 1);
    });
  });

  afterEach(() => {
    if (bookId) cy.deleteAccountBook(bookId);
  });

  // ------ 基础金额运算 ------
  describe('基础金额运算', () => {
    it('多笔交易总和应精确', () => {
      const amounts = [12.34, 56.78, 90.12, 34.56, 78.90];
      const expectedTotal = amounts.reduce((s, a) => s + a, 0); // 272.70

      amounts.forEach((amt, i) => {
        cy.createTransaction(bookId, {
          amount: amt,
          currency: 'CNY',
          transactionTime: `2026-04-0${i + 1} 12:00:00`,
        });
      });

      cy.apiRequest('GET', `/account-books/${bookId}`).then((resp) => {
        const total = parseFloat(resp.body.data.totalExpense);
        expect(total).to.be.closeTo(expectedTotal, 0.01);
      });
    });

    it('0.1 + 0.2 应正确处理浮点精度', () => {
      cy.createTransaction(bookId, { amount: 0.1, currency: 'CNY', transactionTime: '2026-04-05 12:00:00' });
      cy.createTransaction(bookId, { amount: 0.2, currency: 'CNY', transactionTime: '2026-04-05 13:00:00' });

      cy.apiRequest('GET', `/account-books/${bookId}`).then((resp) => {
        const total = parseFloat(resp.body.data.totalExpense);
        expect(total).to.be.closeTo(0.3, 0.01);
      });
    });

    it('最小金额 0.01 应正确存储', () => {
      cy.createTransaction(bookId, {
        amount: 0.01,
        currency: 'CNY',
        transactionTime: '2026-04-05 12:00:00',
      }).then((data) => {
        cy.apiRequest('GET', `/transactions/${data.id}`).then((resp) => {
          expect(parseFloat(resp.body.data.amount)).to.eq(0.01);
        });
      });
    });

    it('大金额应正确存储和显示', () => {
      cy.createTransaction(bookId, {
        amount: 9999999.99,
        currency: 'CNY',
        transactionTime: '2026-04-05 12:00:00',
      }).then((data) => {
        cy.apiRequest('GET', `/transactions/${data.id}`).then((resp) => {
          expect(parseFloat(resp.body.data.amount)).to.eq(9999999.99);
        });
      });
    });
  });

  // ------ 汇率换算精度 ------
  describe('汇率换算精度', () => {
    it('高精度汇率换算应正确', () => {
      // 1 JPY = 0.048123 CNY
      cy.setExchangeRate(bookId, 'JPY', 0.048123);

      cy.createTransaction(bookId, {
        amount: 12345,
        currency: 'JPY',
        transactionTime: '2026-04-05 12:00:00',
      }).then((data) => {
        cy.apiRequest('GET', `/transactions/${data.id}`).then((resp) => {
          const expected = 12345 * 0.048123; // ≈ 594.08
          const actual = parseFloat(resp.body.data.local_amount);
          expect(actual).to.be.closeTo(expected, 0.01);
        });
      });
    });

    it('汇率为1时本币金额应等于原始金额', () => {
      cy.createTransaction(bookId, {
        amount: 888.88,
        currency: 'CNY',
        transactionTime: '2026-04-05 12:00:00',
      }).then((data) => {
        cy.apiRequest('GET', `/transactions/${data.id}`).then((resp) => {
          expect(parseFloat(resp.body.data.amount)).to.eq(888.88);
          expect(parseFloat(resp.body.data.local_amount)).to.eq(888.88);
        });
      });
    });

    it('批量汇率更新后所有交易应重新计算', () => {
      cy.setExchangeRate(bookId, 'THB', 0.2);

      // 创建3笔 THB 交易
      cy.createTransaction(bookId, { amount: 100, currency: 'THB', transactionTime: '2026-04-03 12:00:00', remark: 'THB1' });
      cy.createTransaction(bookId, { amount: 200, currency: 'THB', transactionTime: '2026-04-04 12:00:00', remark: 'THB2' });
      cy.createTransaction(bookId, { amount: 300, currency: 'THB', transactionTime: '2026-04-05 12:00:00', remark: 'THB3' });

      // 验证初始本币金额
      cy.apiRequest('GET', `/account-books/${bookId}/transactions`).then((resp) => {
        const list = resp.body.data.list;
        const totalLocal = list.reduce((s, t) => s + parseFloat(t.local_amount), 0);
        // (100+200+300) * 0.2 = 120
        expect(totalLocal).to.be.closeTo(120, 0.01);
      });

      // 更新汇率为 0.25
      cy.setExchangeRate(bookId, 'THB', 0.25);

      // 验证更新后本币金额
      cy.apiRequest('GET', `/account-books/${bookId}/transactions`).then((resp) => {
        const list = resp.body.data.list;
        const totalLocal = list.reduce((s, t) => s + parseFloat(t.local_amount), 0);
        // (100+200+300) * 0.25 = 150
        expect(totalLocal).to.be.closeTo(150, 0.01);
      });
    });
  });

  // ------ 分账金额守恒 ------
  describe('分账金额守恒', () => {
    it('所有参与人余额之和应为0', () => {
      let pA, pB, pC;
      cy.addParticipant(bookId, 'A', '').then((d) => (pA = d));
      cy.addParticipant(bookId, 'B', '').then((d) => (pB = d));
      cy.addParticipant(bookId, 'C', '').then((d) => {
        pC = d;

        // 多笔复杂交易
        cy.createTransaction(bookId, {
          amount: 333.33, currency: 'CNY', type: 'shared',
          payerId: pA.id, participantIds: [pA.id, pB.id, pC.id],
          transactionTime: '2026-04-03 12:00:00',
        });
        cy.createTransaction(bookId, {
          amount: 666.66, currency: 'CNY', type: 'shared',
          payerId: pB.id, participantIds: [pA.id, pB.id],
          transactionTime: '2026-04-04 12:00:00',
        });
        cy.createTransaction(bookId, {
          amount: 150, currency: 'CNY', type: 'shared',
          payerId: pC.id, participantIds: [pB.id, pC.id],
          transactionTime: '2026-04-05 12:00:00',
        });

        cy.apiRequest('GET', `/account-books/${bookId}/split-bills/calculate`).then((resp) => {
          const participants = resp.body.data.participants;
          const totalBalance = participants.reduce((s, p) => s + p.balance, 0);
          // 所有余额之和应为 0（守恒定律）
          expect(totalBalance).to.be.closeTo(0, 0.05);
        });
      });
    });

    it('支付明细总额应等于所有负余额之和', () => {
      let pA, pB, pC;
      cy.addParticipant(bookId, 'X', '').then((d) => (pA = d));
      cy.addParticipant(bookId, 'Y', '').then((d) => (pB = d));
      cy.addParticipant(bookId, 'Z', '').then((d) => {
        pC = d;

        cy.createTransaction(bookId, {
          amount: 900, currency: 'CNY', type: 'shared',
          payerId: pA.id, participantIds: [pA.id, pB.id, pC.id],
          transactionTime: '2026-04-05 12:00:00',
        });

        cy.apiRequest('GET', `/account-books/${bookId}/split-bills/calculate`).then((resp) => {
          const { participants, payments } = resp.body.data;

          const totalDebt = participants
            .filter((p) => p.balance < 0)
            .reduce((s, p) => s + Math.abs(p.balance), 0);

          const totalPayments = payments.reduce((s, p) => s + p.amount, 0);

          expect(totalPayments).to.be.closeTo(totalDebt, 0.02);
        });
      });
    });
  });

  // ------ 预算计算正确性 ------
  describe('预算计算正确性', () => {
    it('预算使用百分比应精确', () => {
      cy.createTransaction(bookId, { amount: 12500, currency: 'CNY', transactionTime: '2026-04-05 12:00:00' });

      cy.apiRequest('GET', `/account-books/${bookId}`).then((resp) => {
        const total = parseFloat(resp.body.data.totalExpense);
        const budget = parseFloat(resp.body.data.budget);
        const percentage = (total / budget) * 100;
        // 12500 / 50000 = 25%
        expect(percentage).to.eq(25);
      });
    });

    it('剩余预算应正确计算', () => {
      cy.createTransaction(bookId, { amount: 30000, currency: 'CNY', transactionTime: '2026-04-05 12:00:00' });

      cy.visit(`/account-books/${bookId}`);
      // 剩余 = 50000 - 30000 = 20000
      cy.contains('剩余').should('be.visible');
      cy.contains('20000').should('be.visible');
    });
  });

  // ------ 边界情况 ------
  describe('边界情况', () => {
    it('金额为整数时应正确处理', () => {
      cy.createTransaction(bookId, {
        amount: 100,
        currency: 'CNY',
        transactionTime: '2026-04-05 12:00:00',
      }).then((data) => {
        cy.apiRequest('GET', `/transactions/${data.id}`).then((resp) => {
          expect(parseFloat(resp.body.data.amount)).to.eq(100);
        });
      });
    });

    it('单人参与共同账单应全额承担', () => {
      let pA;
      cy.addParticipant(bookId, '独行侠', '').then((d) => {
        pA = d;
        cy.createTransaction(bookId, {
          amount: 500, currency: 'CNY', type: 'shared',
          payerId: pA.id, participantIds: [pA.id],
          transactionTime: '2026-04-05 12:00:00',
        });

        cy.apiRequest('GET', `/account-books/${bookId}/split-bills/calculate`).then((resp) => {
          const p = resp.body.data.participants.find((x) => x.participantName === '独行侠');
          expect(p.shouldPay).to.eq(500);
          expect(p.actualPaid).to.eq(500);
          expect(p.balance).to.eq(0);
        });
      });
    });

    it('多笔小额交易累加应精确', () => {
      // 创建 20 笔 0.05 的交易
      const promises = [];
      for (let i = 0; i < 20; i++) {
        cy.createTransaction(bookId, {
          amount: 0.05,
          currency: 'CNY',
          transactionTime: `2026-04-05 ${String(i).padStart(2, '0')}:00:00`,
        });
      }

      cy.apiRequest('GET', `/account-books/${bookId}`).then((resp) => {
        const total = parseFloat(resp.body.data.totalExpense);
        // 20 * 0.05 = 1.00
        expect(total).to.be.closeTo(1.0, 0.01);
      });
    });
  });
});
