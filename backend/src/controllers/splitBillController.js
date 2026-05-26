const db = require('../config/database');
const ResponseUtil = require('../utils/response');

// 计算具体的支付明细（独立函数）
function calculatePayments(participants) {
  const payments = [];
  
  const creditors = participants.filter(p => p.balance > 0).map(p => ({
    id: p.participantId,
    name: p.participantName,
    amount: p.balance
  }));
  
  const debtors = participants.filter(p => p.balance < 0).map(p => ({
    id: p.participantId,
    name: p.participantName,
    amount: Math.abs(p.balance)
  }));

  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.min(creditor.amount, debtor.amount);
    
    if (amount > 0.01) {
      payments.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount: parseFloat(amount.toFixed(2))
      });
    }
    
    creditor.amount -= amount;
    debtor.amount -= amount;
    if (creditor.amount < 0.01) i++;
    if (debtor.amount < 0.01) j++;
  }
  
  return payments;
}

const BOOK_ACCESS_SQL = 'SELECT * FROM account_books WHERE id = ? AND (user_id = ? OR id IN (SELECT account_book_id FROM participants WHERE user_id = ?))';

class SplitBillController {
  async calculate(req, res) {
    try {
      const { bookId } = req.params;

      const [books] = await db.query(BOOK_ACCESS_SQL, [bookId, req.userId, req.userId]);
      if (books.length === 0) {
        return ResponseUtil.error(res, '账本不存在', 404);
      }

      const [participants] = await db.query(
        `SELECT p.*, u.avatar as userAvatar
         FROM participants p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.account_book_id = ?`,
        [bookId]
      );

      if (participants.length === 0) {
        return ResponseUtil.success(res, { participants: [], totalSharedExpense: 0 });
      }

      const result = [];
      let totalSharedExpense = 0;

      for (const participant of participants) {
        const [paidResult] = await db.query(
          `SELECT COALESCE(SUM(local_amount), 0) as actualPaid
           FROM transactions
           WHERE account_book_id = ? AND payer_id = ? AND type = 'shared'`,
          [bookId, participant.id]
        );

        const [transactions] = await db.query(
          `SELECT t.id, t.local_amount
           FROM transactions t
           JOIN transaction_participants tp ON tp.transaction_id = t.id
           WHERE t.account_book_id = ? AND t.type = 'shared' AND tp.participant_id = ?`,
          [bookId, participant.id]
        );

        let shouldPay = 0;
        for (const transaction of transactions) {
          const [countResult] = await db.query(
            'SELECT COUNT(*) as count FROM transaction_participants WHERE transaction_id = ?',
            [transaction.id]
          );
          shouldPay += transaction.local_amount / countResult[0].count;
        }

        const actualPaid = parseFloat(paidResult[0].actualPaid);
        const balance = actualPaid - shouldPay;

        result.push({
          participantId: participant.id,
          participantName: participant.name,
          participantAvatar: participant.userAvatar || null,
          shouldPay: parseFloat(shouldPay.toFixed(2)),
          actualPaid,
          balance: parseFloat(balance.toFixed(2)),
          isSettled: participant.is_settled === 1
        });
      }

      const payments = calculatePayments(result);

      result.forEach(participant => {
        participant.paymentDetails = payments.filter(p => 
          p.fromId === participant.participantId || p.toId === participant.participantId
        );
      });

      const [totalResult] = await db.query(
        `SELECT COALESCE(SUM(local_amount), 0) as total
         FROM transactions WHERE account_book_id = ? AND type = 'shared'`,
        [bookId]
      );
      totalSharedExpense = parseFloat(totalResult[0].total);

      return ResponseUtil.success(res, { participants: result, totalSharedExpense, payments });
    } catch (error) {
      console.error('计算分账错误:', error);
      return ResponseUtil.error(res, '计算分账失败', 500);
    }
  }

  async updateSettledStatus(req, res) {
    try {
      const { bookId, participantId } = req.params;
      const { isSettled } = req.body;

      const [books] = await db.query(BOOK_ACCESS_SQL, [bookId, req.userId, req.userId]);
      if (books.length === 0) {
        return ResponseUtil.error(res, '账本不存在', 404);
      }

      const [participants] = await db.query(
        'SELECT * FROM participants WHERE id = ? AND account_book_id = ?',
        [participantId, bookId]
      );
      if (participants.length === 0) {
        return ResponseUtil.error(res, '参与人不存在', 404);
      }

      await db.query('UPDATE participants SET is_settled = ? WHERE id = ?', [isSettled ? 1 : 0, participantId]);
      return ResponseUtil.success(res, { message: '更新成功' });
    } catch (error) {
      console.error('更新结清状态错误:', error);
      return ResponseUtil.error(res, '更新结清状态失败', 500);
    }
  }

  async getPersonal(req, res) {
    try {
      const { bookId } = req.params;
      const { participantId } = req.query;

      if (!participantId) {
        return ResponseUtil.error(res, '请指定参与人', 400);
      }

      const [books] = await db.query(BOOK_ACCESS_SQL, [bookId, req.userId, req.userId]);
      if (books.length === 0) {
        return ResponseUtil.error(res, '账本不存在', 404);
      }

      const [participants] = await db.query(
        'SELECT * FROM participants WHERE id = ? AND account_book_id = ?',
        [participantId, bookId]
      );
      if (participants.length === 0) {
        return ResponseUtil.error(res, '参与人不存在', 404);
      }

      const [paidResult] = await db.query(
        `SELECT COALESCE(SUM(local_amount), 0) as actualPaid
         FROM transactions WHERE account_book_id = ? AND payer_id = ? AND type = 'shared'`,
        [bookId, participantId]
      );

      const [transactions] = await db.query(
        `SELECT t.id, t.local_amount FROM transactions t
         JOIN transaction_participants tp ON tp.transaction_id = t.id
         WHERE t.account_book_id = ? AND t.type = 'shared' AND tp.participant_id = ?`,
        [bookId, participantId]
      );

      let shouldPay = 0;
      for (const transaction of transactions) {
        const [countResult] = await db.query(
          'SELECT COUNT(*) as count FROM transaction_participants WHERE transaction_id = ?',
          [transaction.id]
        );
        shouldPay += transaction.local_amount / countResult[0].count;
      }

      const actualPaid = paidResult[0].actualPaid;
      const balance = actualPaid - shouldPay;

      const [relatedTransactions] = await db.query(
        `SELECT DISTINCT t.* FROM transactions t
         LEFT JOIN transaction_participants tp ON tp.transaction_id = t.id
         WHERE t.account_book_id = ? AND (t.payer_id = ? OR tp.participant_id = ?) AND t.type = 'shared'
         ORDER BY t.transaction_time DESC`,
        [bookId, participantId, participantId]
      );

      return ResponseUtil.success(res, {
        shouldPay: parseFloat(shouldPay.toFixed(2)),
        actualPaid: parseFloat(actualPaid),
        balance: parseFloat(balance.toFixed(2)),
        relatedTransactions
      });
    } catch (error) {
      console.error('获取个人分账视图错误:', error);
      return ResponseUtil.error(res, '获取个人分账视图失败', 500);
    }
  }
}

module.exports = new SplitBillController();
