// ============================================================
// 分账模块测试（重点）- 分账计算 / 金额正确性 / 结清状态
// ============================================================
import { test, expect } from '@playwright/test';
import { loginOnPage, createAccountBook, deleteAccountBook, setExchangeRate, createTransaction, addParticipant, apiRequest } from './helpers.js';

test.describe('分账模块', () => {
  let token, bookId;

  test.beforeEach(async ({ page, request }) => {
    const data = await loginOnPage(page, request);
    token = data.token;
    const book = await createAccountBook(request, token, { name: '分账测试账本' });
    bookId = book.id;
    await setExchangeRate(request, token, bookId, 'CNY', 1);
  });

  test.afterEach(async ({ request }) => {
    if (bookId) await deleteAccountBook(request, token, bookId);
  });

  test.describe('分账页面 UI', () => {
    test('应正确渲染分账页面', async ({ page }) => {
      await page.goto(`/account-books/${bookId}/split-bill`);
      await expect(page.getByText('自动分账')).toBeVisible();
    });

    test('应显示分账规则说明', async ({ page }) => {
      await page.goto(`/account-books/${bookId}/split-bill`);
      await page.getByText('分账规则说明').click();
      await expect(page.getByText('系统自动计算')).toBeVisible();
    });
  });

  test.describe('两人均分', () => {
    let pA, pB;
    test.beforeEach(async ({ request }) => {
      pA = await addParticipant(request, token, bookId, '张三');
      pB = await addParticipant(request, token, bookId, '李四');
    });

    test('一人付款两人均分 - 金额应正确', async ({ request }) => {
      await createTransaction(request, token, bookId, {
        amount: 600, type: 'shared', payerId: pA.id, participantIds: [pA.id, pB.id],
      });
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/split-bills/calculate`, null, token);
      const zhangsan = resp.data.participants.find(p => p.participantName === '张三');
      const lisi = resp.data.participants.find(p => p.participantName === '李四');

      expect(zhangsan.actualPaid).toBe(600);
      expect(zhangsan.shouldPay).toBe(300);
      expect(zhangsan.balance).toBe(300);
      expect(lisi.actualPaid).toBe(0);
      expect(lisi.shouldPay).toBe(300);
      expect(lisi.balance).toBe(-300);
      expect(resp.data.payments).toHaveLength(1);
      expect(resp.data.payments[0].amount).toBe(300);
    });

    test('两人各付一笔两人均分 - 差额应正确', async ({ request }) => {
      await createTransaction(request, token, bookId, {
        amount: 400, type: 'shared', payerId: pA.id, participantIds: [pA.id, pB.id],
      });
      await createTransaction(request, token, bookId, {
        amount: 200, type: 'shared', payerId: pB.id, participantIds: [pA.id, pB.id],
        transactionTime: '2026-04-05 13:00:00',
      });
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/split-bills/calculate`, null, token);
      const zhangsan = resp.data.participants.find(p => p.participantName === '张三');
      const lisi = resp.data.participants.find(p => p.participantName === '李四');

      expect(zhangsan.balance).toBe(100);
      expect(lisi.balance).toBe(-100);
      expect(resp.data.payments[0].amount).toBe(100);
    });

    test('两人各付相同金额 - 余额应为0', async ({ request }) => {
      await createTransaction(request, token, bookId, {
        amount: 300, type: 'shared', payerId: pA.id, participantIds: [pA.id, pB.id],
      });
      await createTransaction(request, token, bookId, {
        amount: 300, type: 'shared', payerId: pB.id, participantIds: [pA.id, pB.id],
        transactionTime: '2026-04-05 13:00:00',
      });
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/split-bills/calculate`, null, token);
      const zhangsan = resp.data.participants.find(p => p.participantName === '张三');
      const lisi = resp.data.participants.find(p => p.participantName === '李四');

      expect(zhangsan.balance).toBe(0);
      expect(lisi.balance).toBe(0);
      expect(resp.data.payments).toHaveLength(0);
    });
  });

  test.describe('三人分账', () => {
    let pA, pB, pC;
    test.beforeEach(async ({ request }) => {
      pA = await addParticipant(request, token, bookId, '张三');
      pB = await addParticipant(request, token, bookId, '李四');
      pC = await addParticipant(request, token, bookId, '王五');
    });

    test('一人付款三人均分 - 金额应正确', async ({ request }) => {
      await createTransaction(request, token, bookId, {
        amount: 900, type: 'shared', payerId: pA.id, participantIds: [pA.id, pB.id, pC.id],
      });
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/split-bills/calculate`, null, token);
      const all = resp.data.participants;
      expect(all.find(p => p.participantName === '张三').balance).toBe(600);
      expect(all.find(p => p.participantName === '李四').balance).toBe(-300);
      expect(all.find(p => p.participantName === '王五').balance).toBe(-300);
      expect(resp.data.payments).toHaveLength(2);
    });

    test('除不尽时精度应正确（100/3）', async ({ request }) => {
      await createTransaction(request, token, bookId, {
        amount: 100, type: 'shared', payerId: pA.id, participantIds: [pA.id, pB.id, pC.id],
      });
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/split-bills/calculate`, null, token);
      const all = resp.data.participants;
      for (const p of all) {
        expect(p.shouldPay).toBeCloseTo(33.33, 0);
      }
      const totalBalance = all.reduce((s, p) => s + p.balance, 0);
      expect(totalBalance).toBeCloseTo(0, 0);
    });

    test('多笔交易不同付款人 - 最终结算应正确', async ({ request }) => {
      await createTransaction(request, token, bookId, {
        amount: 300, type: 'shared', payerId: pA.id, participantIds: [pA.id, pB.id, pC.id],
      });
      await createTransaction(request, token, bookId, {
        amount: 600, type: 'shared', payerId: pB.id, participantIds: [pA.id, pB.id, pC.id],
        transactionTime: '2026-04-05 13:00:00',
      });
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/split-bills/calculate`, null, token);
      const all = resp.data.participants;
      expect(all.find(p => p.participantName === '张三').balance).toBe(0);
      expect(all.find(p => p.participantName === '李四').balance).toBe(300);
      expect(all.find(p => p.participantName === '王五').balance).toBe(-300);
    });
  });

  test.describe('部分参与人分账', () => {
    let pA, pB, pC;
    test.beforeEach(async ({ request }) => {
      pA = await addParticipant(request, token, bookId, '张三');
      pB = await addParticipant(request, token, bookId, '李四');
      pC = await addParticipant(request, token, bookId, '王五');
    });

    test('只有两人参与的交易不应影响第三人', async ({ request }) => {
      await createTransaction(request, token, bookId, {
        amount: 200, type: 'shared', payerId: pA.id, participantIds: [pA.id, pB.id],
      });
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/split-bills/calculate`, null, token);
      const wangwu = resp.data.participants.find(p => p.participantName === '王五');
      expect(wangwu.shouldPay).toBe(0);
      expect(wangwu.balance).toBe(0);
    });

    test('混合参与人数的多笔交易 - 计算应正确', async ({ request }) => {
      await createTransaction(request, token, bookId, {
        amount: 300, type: 'shared', payerId: pA.id, participantIds: [pA.id, pB.id, pC.id],
      });
      await createTransaction(request, token, bookId, {
        amount: 200, type: 'shared', payerId: pB.id, participantIds: [pB.id, pC.id],
        transactionTime: '2026-04-05 13:00:00',
      });
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/split-bills/calculate`, null, token);
      const all = resp.data.participants;
      expect(all.find(p => p.participantName === '张三').balance).toBe(200);
      expect(all.find(p => p.participantName === '李四').balance).toBe(0);
      expect(all.find(p => p.participantName === '王五').balance).toBe(-200);
    });
  });

  test.describe('外币分账', () => {
    let pA, pB;
    test.beforeEach(async ({ request }) => {
      pA = await addParticipant(request, token, bookId, '张三');
      pB = await addParticipant(request, token, bookId, '李四');
    });

    test('外币交易应按本币金额分账', async ({ request }) => {
      await setExchangeRate(request, token, bookId, 'THB', 0.2);
      await createTransaction(request, token, bookId, {
        amount: 1000, currency: 'THB', type: 'shared', payerId: pA.id, participantIds: [pA.id, pB.id],
      });
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/split-bills/calculate`, null, token);
      const zhangsan = resp.data.participants.find(p => p.participantName === '张三');
      const lisi = resp.data.participants.find(p => p.participantName === '李四');
      expect(zhangsan.shouldPay).toBe(100);
      expect(lisi.shouldPay).toBe(100);
      expect(zhangsan.balance).toBe(100);
      expect(lisi.balance).toBe(-100);
    });

    test('混合币种交易分账应正确', async ({ request }) => {
      await setExchangeRate(request, token, bookId, 'USD', 7.0);
      await createTransaction(request, token, bookId, {
        amount: 100, currency: 'CNY', type: 'shared', payerId: pA.id, participantIds: [pA.id, pB.id],
      });
      await createTransaction(request, token, bookId, {
        amount: 100, currency: 'USD', type: 'shared', payerId: pB.id, participantIds: [pA.id, pB.id],
        transactionTime: '2026-04-05 13:00:00',
      });
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/split-bills/calculate`, null, token);
      const zhangsan = resp.data.participants.find(p => p.participantName === '张三');
      const lisi = resp.data.participants.find(p => p.participantName === '李四');
      expect(zhangsan.shouldPay).toBe(400);
      expect(lisi.shouldPay).toBe(400);
      expect(zhangsan.balance).toBe(-300);
      expect(lisi.balance).toBe(300);
    });
  });

  test.describe('个人交易不影响分账', () => {
    test('个人交易不应计入分账', async ({ request }) => {
      const pA = await addParticipant(request, token, bookId, '张三');
      const pB = await addParticipant(request, token, bookId, '李四');
      await createTransaction(request, token, bookId, { amount: 500, type: 'personal' });
      await createTransaction(request, token, bookId, {
        amount: 200, type: 'shared', payerId: pA.id, participantIds: [pA.id, pB.id],
        transactionTime: '2026-04-05 13:00:00',
      });
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/split-bills/calculate`, null, token);
      expect(resp.data.totalSharedExpense).toBe(200);
    });
  });

  test.describe('结清状态', () => {
    let pA, pB;
    test.beforeEach(async ({ request }) => {
      pA = await addParticipant(request, token, bookId, '张三');
      pB = await addParticipant(request, token, bookId, '李四');
    });

    test('应能标记和取消结清', async ({ request }) => {
      let resp = await apiRequest(request, 'PUT', `/account-books/${bookId}/participants/${pB.id}/settled`, { isSettled: true }, token);
      expect(resp.code).toBe(200);
      resp = await apiRequest(request, 'PUT', `/account-books/${bookId}/participants/${pB.id}/settled`, { isSettled: false }, token);
      expect(resp.code).toBe(200);
    });

    test('结清状态应在分账结果中体现', async ({ request }) => {
      await apiRequest(request, 'PUT', `/account-books/${bookId}/participants/${pA.id}/settled`, { isSettled: true }, token);
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/split-bills/calculate`, null, token);
      const zhangsan = resp.data.participants.find(p => p.participantName === '张三');
      expect(zhangsan.isSettled).toBe(true);
    });
  });

  test.describe('分账页面 UI 展示', () => {
    test('应显示每个参与人的余额', async ({ page, request }) => {
      const pA = await addParticipant(request, token, bookId, '张三');
      const pB = await addParticipant(request, token, bookId, '李四');
      await createTransaction(request, token, bookId, {
        amount: 400, type: 'shared', payerId: pA.id, participantIds: [pA.id, pB.id],
      });
      await page.goto(`/account-books/${bookId}/split-bill`);
      await expect(page.getByText('张三')).toBeVisible();
      await expect(page.getByText('李四')).toBeVisible();
      await expect(page.getByText('200.00')).toBeVisible();
    });

    test('点击参与人卡片应展开详情', async ({ page, request }) => {
      const pA = await addParticipant(request, token, bookId, '张三');
      const pB = await addParticipant(request, token, bookId, '李四');
      await createTransaction(request, token, bookId, {
        amount: 400, type: 'shared', payerId: pA.id, participantIds: [pA.id, pB.id],
      });
      await page.goto(`/account-books/${bookId}/split-bill`);
      await page.locator('.participant-header').first().click();
      await expect(page.locator('.participant-detail')).toBeVisible();
    });
  });
});
