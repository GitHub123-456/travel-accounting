const db = require('../config/database');
const ResponseUtil = require('../utils/response');

class ExchangeRateController {
  // 获取账本汇率列表
  async getList(req, res) {
    try {
      const { bookId } = req.params;

      const [books] = await db.query(
        'SELECT * FROM account_books WHERE id = ? AND (user_id = ? OR id IN (SELECT account_book_id FROM participants WHERE user_id = ?))',
        [bookId, req.userId, req.userId]
      );

      if (books.length === 0) {
        return ResponseUtil.error(res, '账本不存在', 404);
      }

      const [rates] = await db.query(
        'SELECT * FROM exchange_rates WHERE account_book_id = ? ORDER BY updated_at DESC',
        [bookId]
      );

      return ResponseUtil.success(res, rates);
    } catch (error) {
      console.error('获取汇率列表错误:', error);
      return ResponseUtil.error(res, '获取汇率列表失败', 500);
    }
  }

  // 设置/更新汇率
  async setRate(req, res) {
    try {
      const { bookId } = req.params;
      const { currency, rate } = req.body;

      if (!currency || !rate) {
        return ResponseUtil.error(res, '请填写完整信息', 400);
      }

      const [books] = await db.query(
        'SELECT * FROM account_books WHERE id = ? AND (user_id = ? OR id IN (SELECT account_book_id FROM participants WHERE user_id = ?))',
        [bookId, req.userId, req.userId]
      );

      if (books.length === 0) {
        return ResponseUtil.error(res, '账本不存在', 404);
      }

      if (books[0].is_archived) {
        return ResponseUtil.error(res, '已封存的账本不可修改汇率', 400);
      }

      await db.query(
        `INSERT INTO exchange_rates (account_book_id, currency, rate) 
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE rate = ?, updated_at = CURRENT_TIMESTAMP`,
        [bookId, currency, rate, rate]
      );

      await db.query(
        `UPDATE transactions 
         SET local_amount = amount * ?
         WHERE account_book_id = ? AND currency = ?`,
        [rate, bookId, currency]
      );

      return ResponseUtil.success(res, null, '汇率设置成功');
    } catch (error) {
      console.error('设置汇率错误:', error);
      return ResponseUtil.error(res, '设置汇率失败', 500);
    }
  }

  // 一键刷新所有汇率
  async refreshAll(req, res) {
    try {
      const { bookId } = req.params;

      const [books] = await db.query(
        'SELECT * FROM account_books WHERE id = ? AND (user_id = ? OR id IN (SELECT account_book_id FROM participants WHERE user_id = ?))',
        [bookId, req.userId, req.userId]
      );
      if (books.length === 0) return ResponseUtil.error(res, '账本不存在', 404);
      if (books[0].is_archived) return ResponseUtil.error(res, '已封存的账本不可修改汇率', 400);

      const currencies = ['THB', 'USD', 'EUR', 'JPY', 'KRW'];
      const symbols = currencies.join(',');
      const rateResp = await fetch(`https://api.frankfurter.dev/v1/latest?base=CNY&symbols=${symbols}`);
      const rateData = await rateResp.json();

      if (!rateData.rates) return ResponseUtil.error(res, '获取汇率失败', 500);

      await db.query(
        'INSERT INTO exchange_rates (account_book_id, currency, rate) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rate = ?, updated_at = CURRENT_TIMESTAMP',
        [bookId, 'CNY', 1, 1]
      );

      const updated = [];
      for (const [currency, rate] of Object.entries(rateData.rates)) {
        const cnyRate = parseFloat((1 / rate).toFixed(6));
        await db.query(
          'INSERT INTO exchange_rates (account_book_id, currency, rate) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rate = ?, updated_at = CURRENT_TIMESTAMP',
          [bookId, currency, cnyRate, cnyRate]
        );
        // 更新该币种所有交易的本币金额
        await db.query(
          'UPDATE transactions SET local_amount = amount * ? WHERE account_book_id = ? AND currency = ?',
          [cnyRate, bookId, currency]
        );
        updated.push({ currency, rate: cnyRate });
      }

      return ResponseUtil.success(res, { updated, date: rateData.date }, '汇率已更新');
    } catch (error) {
      console.error('刷新汇率错误:', error);
      return ResponseUtil.error(res, '刷新汇率失败', 500);
    }
  }
}

module.exports = new ExchangeRateController();
