// ============================================================
// 交易/记账模块测试 - 创建 / 编辑 / 删除 / 金额验证
// ============================================================

describe('交易记账模块', () => {
  let bookId;

  beforeEach(() => {
    cy.ensureLoggedIn();
    cy.createAccountBook({ name: '交易测试账本' }).then((data) => {
      bookId = data.id;
      // 设置 CNY 汇率（默认币种）
      cy.setExchangeRate(bookId, 'CNY', 1);
    });
  });

  afterEach(() => {
    if (bookId) cy.deleteAccountBook(bookId);
  });

  // ------ 记账表单 UI ------
  describe('记账表单 UI', () => {
    it('应正确渲染记账表单元素', () => {
      cy.visit(`/account-books/${bookId}/transactions/new`);
      cy.contains('记录支出').should('be.visible');
      cy.contains('日期').should('be.visible');
      cy.contains('币种').should('be.visible');
      cy.contains('金额').should('be.visible');
      cy.contains('主分类').should('be.visible');
      cy.contains('子项').should('be.visible');
      cy.contains('备注').should('be.visible');
      cy.contains('地点').should('be.visible');
      cy.contains('分账设置').should('be.visible');
    });

    it('应显示6个主分类', () => {
      cy.visit(`/account-books/${bookId}/transactions/new`);
      cy.contains('🍜').should('be.visible'); // 餐饮
      cy.contains('✈️').should('be.visible'); // 交通
      cy.contains('🏨').should('be.visible'); // 住宿
      cy.contains('🛍️').should('be.visible'); // 购物
      cy.contains('🎫').should('be.visible'); // 门票
      cy.contains('📝').should('be.visible'); // 其他
    });

    it('切换主分类应更新子项列表', () => {
      cy.visit(`/account-books/${bookId}/transactions/new`);
      // 默认餐饮
      cy.contains('早餐').should('be.visible');
      cy.contains('午餐').should('be.visible');

      // 切换到交通
      cy.contains('✈️').click();
      cy.contains('飞机').should('be.visible');
      cy.contains('火车').should('be.visible');
      cy.contains('出租车').should('be.visible');
    });

    it('金额为空或0时保存按钮应禁用', () => {
      cy.visit(`/account-books/${bookId}/transactions/new`);
      cy.contains('button', '保存').should('be.disabled');
    });

    it('分账设置默认应为个人账单', () => {
      cy.visit(`/account-books/${bookId}/transactions/new`);
      cy.get('.split-option.active').should('contain', '个人账单');
    });

    it('切换到共同账单应显示付款人和参与人选择', () => {
      // 先添加成员
      cy.addParticipant(bookId, '张三', '');
      cy.addParticipant(bookId, '李四', '');

      cy.visit(`/account-books/${bookId}/transactions/new`);
      cy.contains('共同账单').click();
      cy.contains('付款人').should('be.visible');
      cy.contains('参与人').should('be.visible');
    });

    it('无成员时共同账单应提示先添加成员', () => {
      cy.visit(`/account-books/${bookId}/transactions/new`);
      cy.contains('共同账单').click();
      cy.contains('暂无成员').should('be.visible');
    });
  });

  // ------ 创建个人交易 ------
  describe('创建个人交易', () => {
    it('应能创建个人交易并跳转回详情页', () => {
      cy.visit(`/account-books/${bookId}/transactions/new`);

      // 输入金额
      cy.get('input[placeholder="0.00"]').type('128.50');
      // 选择子分类
      cy.contains('午餐').click();
      // 输入备注
      cy.get('textarea[placeholder="补充一点说明..."]').type('测试午餐');
      // 输入地点
      cy.get('input[placeholder="消费地点（可选）"]').type('银座');

      cy.contains('button', '保存').click();
      cy.contains('记账成功').should('be.visible');
      cy.url().should('include', `/account-books/${bookId}`);
      cy.url().should('not.include', '/transactions/');
    });

    it('创建的交易应出现在账单明细中', () => {
      cy.createTransaction(bookId, {
        amount: 200,
        category: '住宿',
        remark: '明细验证交易',
        transactionTime: '2026-04-05 12:00:00',
      });

      cy.visit(`/account-books/${bookId}`);
      cy.contains('账单明细').click();
      cy.contains('住宿').should('be.visible');
      cy.contains('200').should('be.visible');
    });
  });

  // ------ 创建共同交易 ------
  describe('创建共同交易', () => {
    let participantA, participantB;

    beforeEach(() => {
      cy.addParticipant(bookId, '张三', '').then((data) => {
        participantA = data;
      });
      cy.addParticipant(bookId, '李四', '').then((data) => {
        participantB = data;
      });
    });

    it('共同账单未选付款人应提示', () => {
      cy.visit(`/account-books/${bookId}/transactions/new`);
      cy.get('input[placeholder="0.00"]').type('300');
      cy.contains('共同账单').click();
      // 只选参与人不选付款人
      cy.get('.split-settings .adm-selector').last().contains('张三').click();
      cy.get('.split-settings .adm-selector').last().contains('李四').click();
      cy.contains('button', '保存').click();
      cy.contains('请选择付款人').should('be.visible');
    });

    it('共同账单未选参与人应提示', () => {
      cy.visit(`/account-books/${bookId}/transactions/new`);
      cy.get('input[placeholder="0.00"]').type('300');
      cy.contains('共同账单').click();
      // 只选付款人不选参与人
      cy.get('.split-settings .adm-selector').first().contains('张三').click();
      cy.contains('button', '保存').click();
      cy.contains('请选择参与人').should('be.visible');
    });

    it('应能创建共同交易', () => {
      cy.visit(`/account-books/${bookId}/transactions/new`);
      cy.get('input[placeholder="0.00"]').type('600');
      cy.contains('午餐').click();
      cy.contains('共同账单').click();

      // 选择付款人
      cy.get('.split-settings .adm-selector').first().contains('张三').click();
      // 选择参与人
      cy.get('.split-settings .adm-selector').last().contains('张三').click();
      cy.get('.split-settings .adm-selector').last().contains('李四').click();

      cy.contains('button', '保存').click();
      cy.contains('记账成功').should('be.visible');
    });
  });

  // ------ 交易详情 ------
  describe('交易详情', () => {
    it('点击交易应弹出详情面板', () => {
      cy.createTransaction(bookId, {
        amount: 150,
        category: '交通',
        remark: '详情测试',
        transactionTime: '2026-04-05 12:00:00',
      });

      cy.visit(`/account-books/${bookId}`);
      cy.contains('账单明细').click();
      cy.contains('交通').click();

      cy.contains('流水详情').should('be.visible');
      cy.contains('150').should('be.visible');
      cy.contains('交通').should('be.visible');
    });

    it('详情面板应显示编辑和删除按钮', () => {
      cy.createTransaction(bookId, {
        amount: 80,
        category: '购物',
        transactionTime: '2026-04-05 12:00:00',
      });

      cy.visit(`/account-books/${bookId}`);
      cy.contains('账单明细').click();
      cy.contains('购物').click();

      cy.contains('修改').should('be.visible');
      cy.contains('删除').should('be.visible');
    });

    it('封存账本的交易详情不应显示编辑删除按钮', () => {
      cy.createTransaction(bookId, {
        amount: 80,
        category: '购物',
        transactionTime: '2026-04-05 12:00:00',
      });
      cy.apiRequest('PUT', `/account-books/${bookId}/archive`, { isArchived: true });

      cy.visit(`/account-books/${bookId}`);
      cy.contains('账单明细').click();
      cy.contains('购物').click();

      cy.contains('账本已封存').should('be.visible');
      cy.contains('button', '修改').should('not.exist');
    });
  });

  // ------ 编辑交易 ------
  describe('编辑交易', () => {
    it('编辑页应预填原有数据', () => {
      cy.createTransaction(bookId, {
        amount: 250,
        category: '住宿',
        remark: '编辑前备注',
        location: '新宿',
        transactionTime: '2026-04-05 12:00:00',
      }).then((data) => {
        cy.visit(`/account-books/${bookId}/transactions/${data.id}/edit`);
        cy.contains('编辑支出').should('be.visible');
        // 金额应预填
        cy.get('input[placeholder="0.00"]').should('have.value', '250');
      });
    });

    it('修改金额后应更新', () => {
      cy.createTransaction(bookId, {
        amount: 100,
        category: '餐饮',
        transactionTime: '2026-04-05 12:00:00',
      }).then((data) => {
        // 通过 API 更新
        cy.apiRequest('PUT', `/transactions/${data.id}`, {
          amount: 200,
          currency: 'CNY',
          category: '餐饮',
          transactionTime: '2026-04-05 12:00:00',
          type: 'personal',
        }).then((resp) => {
          expect(resp.body.code).to.eq(200);
        });

        // 验证更新后的金额
        cy.apiRequest('GET', `/transactions/${data.id}`).then((resp) => {
          expect(parseFloat(resp.body.data.amount)).to.eq(200);
        });
      });
    });
  });

  // ------ 删除交易 ------
  describe('删除交易', () => {
    it('删除交易后应从列表中消失', () => {
      cy.createTransaction(bookId, {
        amount: 99,
        category: '其他',
        remark: '待删除交易',
        transactionTime: '2026-04-05 12:00:00',
      }).then((data) => {
        cy.apiRequest('DELETE', `/transactions/${data.id}`).then((resp) => {
          expect(resp.body.code).to.eq(200);
        });

        cy.visit(`/account-books/${bookId}`);
        cy.contains('账单明细').click();
        cy.contains('待删除交易').should('not.exist');
      });
    });

    it('封存账本不应允许删除交易', () => {
      cy.createTransaction(bookId, {
        amount: 50,
        category: '餐饮',
        transactionTime: '2026-04-05 12:00:00',
      }).then((data) => {
        cy.apiRequest('PUT', `/account-books/${bookId}/archive`, { isArchived: true });
        cy.apiRequest('DELETE', `/transactions/${data.id}`).then((resp) => {
          expect(resp.body.code).to.not.eq(200);
          expect(resp.body.message).to.contain('封存');
        });
      });
    });
  });

  // ------ 金额精度测试（重点） ------
  describe('金额精度测试', () => {
    it('小数金额应正确存储', () => {
      cy.createTransaction(bookId, {
        amount: 99.99,
        currency: 'CNY',
        transactionTime: '2026-04-05 12:00:00',
      }).then((data) => {
        cy.apiRequest('GET', `/transactions/${data.id}`).then((resp) => {
          expect(parseFloat(resp.body.data.amount)).to.eq(99.99);
          expect(parseFloat(resp.body.data.local_amount)).to.eq(99.99);
        });
      });
    });

    it('大金额应正确存储', () => {
      cy.createTransaction(bookId, {
        amount: 99999.99,
        currency: 'CNY',
        transactionTime: '2026-04-05 12:00:00',
      }).then((data) => {
        cy.apiRequest('GET', `/transactions/${data.id}`).then((resp) => {
          expect(parseFloat(resp.body.data.amount)).to.eq(99999.99);
        });
      });
    });

    it('外币小数金额换算应精确', () => {
      // 1 THB = 0.198765 CNY
      cy.setExchangeRate(bookId, 'THB', 0.198765);
      cy.createTransaction(bookId, {
        amount: 1234.56,
        currency: 'THB',
        transactionTime: '2026-04-05 12:00:00',
      }).then((data) => {
        cy.apiRequest('GET', `/transactions/${data.id}`).then((resp) => {
          const expected = 1234.56 * 0.198765;
          const actual = parseFloat(resp.body.data.local_amount);
          // 允许 0.01 的误差（数据库 decimal(12,2)）
          expect(actual).to.be.closeTo(expected, 0.01);
        });
      });
    });

    it('总支出应等于所有交易本币金额之和', () => {
      cy.createTransaction(bookId, { amount: 100, currency: 'CNY', transactionTime: '2026-04-03 12:00:00' });
      cy.createTransaction(bookId, { amount: 200.50, currency: 'CNY', transactionTime: '2026-04-04 12:00:00' });
      cy.createTransaction(bookId, { amount: 50.25, currency: 'CNY', transactionTime: '2026-04-05 12:00:00' });

      cy.apiRequest('GET', `/account-books/${bookId}`).then((resp) => {
        const totalExpense = parseFloat(resp.body.data.totalExpense);
        expect(totalExpense).to.be.closeTo(350.75, 0.01);
      });
    });
  });
});
