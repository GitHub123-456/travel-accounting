// ============================================================
// 金钱精度综合测试（重点）- 端到端金额正确性验证
// ============================================================
import { test, expect } from '@playwright/test';
import { loginOnPage, createAccountBook, deleteAccountBook, setExchangeRate, createTransaction, addParticipant, apiRequest } from './helpers.js';

test.describe('金钱精度综合测试', () => {
  let token, bookId;

  test.beforeEach(async ({ page, request }) => {
    const data = await loginOnPage(page, request);
    token = data.token;
    const book = await createAccountBook(request, token, { name: '金钱精度测试', budget: 50000 });
    bookId = book.id;
    await setExchangeRate(request, token, bookId, 'CNY', 1);
  });

  test.afterEach(async ({ request }) => {
    if (bookId) await deleteAccountBook(request, token, bookId);
  });

  test.describe('基础金额运算', () => {
    test('多笔交易总和应精确', async ({ request }) => {
      const amounts = [12.34, 56.78, 90.12, 34.56, 78.90];
      const expectedTotal = amounts.reduce((s, a) => s + a, 0);
      for (let i = 0; i < amounts.length; i++) {
        await createTransaction(request, token, bookId, {
          amount: amounts[i], currency: 'CNY', transactionTime: `2026-04-0${i + 1} 12:00:00`,
        });
      }
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}`, null, token);
      expect(parseFloat(resp.data.totalExpense)).toBeCloseTo(expectedTotal, 1);
    });

    test('0.1 + 0.2 应正确处理浮点精度', async ({ request }) => {
      await createTransaction(request, token, bookId, { amount: 0.1, transactionTime: '2026-04-05 12:00:00' });
      await createTransaction(request, token, bookId, { amount: 0.2, transactionTime: '2026-04-05 13:00:00' });
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}`, null, token);
      expect(parseFloat(resp.data.totalExpense)).toBeCloseTo(0.3, 1);
    });

    test('最小金额 0.01 应正确存储', async ({ request }) => {
      const tx = await createTransaction(request, token, bookId, { amount: 0.01 });
      const resp = await apiRequest(request, 'GET', `/transactions/${tx.id}`, null, token);
      expect(parseFloat(resp.data.amount)).toBe(0.01);
    });

    test('大金额应正确存储', async ({ request }) => {
      const tx = await createTransaction(request, token, bookId, { amount: 9999999.99 });
      const resp = await apiRequest(request, 'GET', `/transactions/${tx.id}`, null, token);
      expect(parseFloat(resp.data.amount)).toBe(9999999.99);
    });
  });

  test.describe('汇率换算精度', () => {
    test('高精度汇率换算应正确', async ({ request }) => {
      await setExchangeRate(request, token, bookId, 'JPY', 0.048123);
      const tx = await createTransaction(request, token, bookId, { amount: 12345, currency: 'JPY' });
      const resp = await apiRequest(request, 'GET', `/transactions/${tx.id}`, null, token);
      const expected = 12345 * 0.048123;
      expect(parseFloat(resp.data.local_amount)).toBeCloseTo(expected, 0);
    });

    test('批量汇率更新后所有交易应重新计算', async ({ request }) => {
      await setExchangeRate(request, token, bookId, 'THB', 0.2);
      await createTransaction(request, token, bookId, { amount: 100, currency: 'THB', transactionTime: '2026-04-03 12:00:00' });
      await createTransaction(request, token, bookId, { amount: 200, currency: 'THB', transactionTime: '2026-04-04 12:00:00' });
      await createTransaction(request, token, bookId, { amount: 300, currency: 'THB', transactionTime: '2026-04-05 12:00:00' });

      let resp = await apiRequest(request, 'GET', `/account-books/${bookId}/transactions`, null, token);
      let total = resp.data.list.reduce((s, t) => s + parseFloat(t.local_amount), 0);
      expect(total).toBeCloseTo(120, 1);

      await setExchangeRate(request, token, bookId, 'THB', 0.25);
      resp = await apiRequest(request, 'GET', `/account-books/${bookId}/transactions`, null, token);
      total = resp.data.list.reduce((s, t) => s + parseFloat(t.local_amount), 0);
      expect(total).toBeCloseTo(150, 1);
    });
  });

  test.describe('分账金额守恒', () => {
    test('所有参与人余额之和应为0', async ({ request }) => {
      const pA = await addParticipant(request, token, bookId, 'A');
      const pB = await addParticipant(request, token, bookId, 'B');
      const pC = await addParticipant(request, token, bookId, 'C');

      await createTransaction(request, token, bookId, {
        amount: 333.33, type: 'shared', payerId: pA.id, participantIds: [pA.id, pB.id, pC.id],
        transactionTime: '2026-04-03 12:00:00',
      });
      await createTransaction(request, token, bookId, {
        amount: 666.66, type: 'shared', payerId: pB.id, participantIds: [pA.id, pB.id],
        transactionTime: '2026-04-04 12:00:00',
      });
      await createTransaction(request, token, bookId, {
        amount: 150, type: 'shared', payerId: pC.id, participantIds: [pB.id, pC.id],
        transactionTime: '2026-04-05 12:00:00',
      });

      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/split-bills/calculate`, null, token);
      const totalBalance = resp.data.participants.reduce((s, p) => s + p.balance, 0);
      expect(totalBalance).toBeCloseTo(0, 0);
    });

    test('支付明细总额应等于所有负余额之和', async ({ request }) => {
      const pA = await addParticipant(request, token, bookId, 'X');
      const pB = await addParticipant(request, token, bookId, 'Y');
      const pC = await addParticipant(request, token, bookId, 'Z');

      await createTransaction(request, token, bookId, {
        amount: 900, type: 'shared', payerId: pA.id, participantIds: [pA.id, pB.id, pC.id],
      });

      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/split-bills/calculate`, null, token);
      const totalDebt = resp.data.participants.filter(p => p.balance < 0).reduce((s, p) => s + Math.abs(p.balance), 0);
      const totalPayments = resp.data.payments.reduce((s, p) => s + p.amount, 0);
      expect(totalPayments).toBeCloseTo(totalDebt, 0);
    });
  });

  test.describe('预算计算正确性', () => {
    test('预算使用百分比应精确', async ({ request }) => {
      await createTransaction(request, token, bookId, { amount: 12500 });
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}`, null, token);
      const percentage = (parseFloat(resp.data.totalExpense) / parseFloat(resp.data.budget)) * 100;
      expect(percentage).toBe(25);
    });

    test('剩余预算应正确计算', async ({ page, request }) => {
      await createTransaction(request, token, bookId, { amount: 30000 });
      await page.goto(`/account-books/${bookId}`);
      await expect(page.getByText('剩余')).toBeVisible();
      await expect(page.getByText('20000')).toBeVisible();
    });
  });

  test.describe('边界情况', () => {
    test('单人参与共同账单应全额承担', async ({ request }) => {
      const pA = await addParticipant(request, token, bookId, '独行侠');
      await createTransaction(request, token, bookId, {
        amount: 500, type: 'shared', payerId: pA.id, participantIds: [pA.id],
      });
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}/split-bills/calculate`, null, token);
      const p = resp.data.participants.find(x => x.participantName === '独行侠');
      expect(p.shouldPay).toBe(500);
      expect(p.balance).toBe(0);
    });

    test('多笔小额交易累加应精确', async ({ request }) => {
      for (let i = 0; i < 20; i++) {
        await createTransaction(request, token, bookId, {
          amount: 0.05, transactionTime: `2026-04-05 ${String(i).padStart(2, '0')}:00:00`,
        });
      }
      const resp = await apiRequest(request, 'GET', `/account-books/${bookId}`, null, token);
      expect(parseFloat(resp.data.totalExpense)).toBeCloseTo(1.0, 1);
    });
  });
});
