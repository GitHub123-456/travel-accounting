// ============================================================
// 封存账本测试 - 只读限制 / 各模块封存行为验证
// ============================================================

describe('封存账本限制测试', () => {
  let bookId;

  beforeEach(() => {
    cy.ensureLoggedIn();
    cy.createAccountBook({ name: '封存限制测试' }).then((data) => {
      bookId = data.id;
      cy.setExchangeRate(bookId, 'CNY', 1);
      cy.setExchangeRate(bookId, 'USD', 7.25);
      cy.addParticipant(bookId, '成员A', '');
      cy.addParticipant(bookId, '成员B', '');
      // 添加一些交易数据
      cy.createTransaction(bookId, {
        amount: 500,
        currency: 'CNY',
        category: '餐饮',
        transactionTime: '2026-04-05 12:00:00',
      });
      // 封存账本
      cy.apiRequest('PUT', `/account-books/${bookId}/archive`, { isArchived: true });
    });
  });

  afterEach(() => {
    if (bookId) cy.deleteAccountBook(bookId);
  });

  // ------ API 层封存限制 ------
  describe('API 层封存限制', () => {
    it('不应允许创建新交易', () => {
      cy.apiRequest('POST', `/account-books/${bookId}/transactions`, {
        amount: 100,
        currency: 'CNY',
        category: '餐饮',
        transactionTime: '2026-04-05 12:00:00',
        type: 'personal',
      }).then((resp) => {
        expect(resp.body.code).to.not.eq(200);
        expect(resp.body.message).to.contain('封存');
      });
    });

    it('不应允许修改汇率', () => {
      cy.apiRequest('POST', `/account-books/${bookId}/exchange-rates`, {
        currency: 'USD',
        rate: 8.0,
      }).then((resp) => {
        expect(resp.body.code).to.not.eq(200);
        expect(resp.body.message).to.contain('封存');
      });
    });

    it('不应允许修改已有交易', () => {
      cy.apiRequest('GET', `/account-books/${bookId}/transactions`).then((resp) => {
        const txId = resp.body.data.list[0].id;
        cy.apiRequest('PUT', `/transactions/${txId}`, {
          amount: 999,
          currency: 'CNY',
          category: '餐饮',
          transactionTime: '2026-04-05 12:00:00',
          type: 'personal',
        }).then((updateResp) => {
          expect(updateResp.body.code).to.not.eq(200);
          expect(updateResp.body.message).to.contain('封存');
        });
      });
    });

    it('不应允许删除已有交易', () => {
      cy.apiRequest('GET', `/account-books/${bookId}/transactions`).then((resp) => {
        const txId = resp.body.data.list[0].id;
        cy.apiRequest('DELETE', `/transactions/${txId}`).then((delResp) => {
          expect(delResp.body.code).to.not.eq(200);
          expect(delResp.body.message).to.contain('封存');
        });
      });
    });

    it('应仍然允许查看交易列表', () => {
      cy.apiRequest('GET', `/account-books/${bookId}/transactions`).then((resp) => {
        expect(resp.body.code).to.eq(200);
        expect(resp.body.data.list).to.have.length.gte(1);
      });
    });

    it('应仍然允许查看分账计算', () => {
      cy.apiRequest('GET', `/account-books/${bookId}/split-bills/calculate`).then((resp) => {
        expect(resp.body.code).to.eq(200);
      });
    });

    it('应仍然允许查看汇率列表', () => {
      cy.apiRequest('GET', `/account-books/${bookId}/exchange-rates`).then((resp) => {
        expect(resp.body.code).to.eq(200);
      });
    });
  });

  // ------ UI 层封存限制 ------
  describe('UI 层封存限制', () => {
    it('应显示封存提示卡片', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.contains('账本已封存').should('be.visible');
      cy.contains('只读状态').should('be.visible');
    });

    it('不应显示记账浮动按钮', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.get('.floating-record-btn').should('not.exist');
    });

    it('不应显示管理功能区', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.get('.management-section').should('not.exist');
    });

    it('交易详情不应显示编辑删除按钮', () => {
      cy.visit(`/account-books/${bookId}`);
      cy.contains('账单明细').click();
      cy.get('.transaction-item').first().click();
      cy.contains('账本已封存，无法修改或删除账单').should('be.visible');
    });

    it('封存账本在列表中应显示已封存标签', () => {
      cy.visit('/account-books');
      cy.contains('封存限制测试').parent().parent().within(() => {
        cy.contains('已封存').should('be.visible');
      });
    });

    it('已有数据应仍然可以正常浏览', () => {
      cy.visit(`/account-books/${bookId}`);
      // 总览
      cy.contains('总支出').should('be.visible');
      cy.contains('500').should('be.visible');

      // 账单明细
      cy.contains('账单明细').click();
      cy.contains('餐饮').should('be.visible');

      // 类别统计
      cy.contains('类别统计').click();
      cy.get('.category-detail-list').should('exist');

      // 成员统计
      cy.contains('成员统计').click();
      cy.contains('成员A').should('be.visible');
    });
  });

  // ------ 封存后金额不变性 ------
  describe('封存后金额不变性', () => {
    it('封存后总支出金额应保持不变', () => {
      // 记录封存前的总支出
      cy.apiRequest('GET', `/account-books/${bookId}`).then((resp) => {
        const totalBefore = parseFloat(resp.body.data.totalExpense);
        expect(totalBefore).to.eq(500);

        // 再次查询确认不变
        cy.apiRequest('GET', `/account-books/${bookId}`).then((resp2) => {
          const totalAfter = parseFloat(resp2.body.data.totalExpense);
          expect(totalAfter).to.eq(totalBefore);
        });
      });
    });

    it('封存后交易金额应保持不变', () => {
      cy.apiRequest('GET', `/account-books/${bookId}/transactions`).then((resp) => {
        const tx = resp.body.data.list[0];
        expect(parseFloat(tx.amount)).to.eq(500);
        expect(parseFloat(tx.local_amount)).to.eq(500);
      });
    });
  });
});
