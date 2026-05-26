const db = require('../config/database');
const ResponseUtil = require('../utils/response');

class AccountBookController {
  // 创建账本
  async create(req, res) {
    try {
      const { name, destination, startDate, endDate, budget, remark } = req.body;

      if (!name || !destination || !startDate || !endDate) {
        return ResponseUtil.error(res, '请填写完整信息', 400);
      }

      const [result] = await db.query(
        'INSERT INTO account_books (user_id, name, destination, start_date, end_date, budget, remark) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.userId, name, destination, startDate, endDate, budget || null, remark || null]
      );

      const bookId = result.insertId;

      // 自动把创建者加为账本成员
      const [user] = await db.query('SELECT nickname, email FROM users WHERE id = ?', [req.userId]);
      if (user.length > 0) {
        await db.query(
          'INSERT INTO participants (account_book_id, user_id, name, email, remark) VALUES (?, ?, ?, ?, ?)',
          [bookId, req.userId, user[0].nickname || '我', user[0].email || null, '本人']
        );
      }

      // 自动拉取所有币种的最新汇率
      const currencies = ['THB', 'USD', 'EUR', 'JPY', 'KRW'];
      try {
        const symbols = currencies.join(',');
        const rateResp = await fetch(`https://api.frankfurter.dev/v1/latest?base=CNY&symbols=${symbols}`);
        const rateData = await rateResp.json();
        if (rateData.rates) {
          // CNY 汇率固定为 1
          await db.query(
            'INSERT INTO exchange_rates (account_book_id, currency, rate) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rate = ?',
            [bookId, 'CNY', 1, 1]
          );
          // frankfurter 返回的是 1 CNY = X 外币，我们需要 1 外币 = X CNY（取倒数）
          for (const [currency, rate] of Object.entries(rateData.rates)) {
            const cnyRate = parseFloat((1 / rate).toFixed(6));
            await db.query(
              'INSERT INTO exchange_rates (account_book_id, currency, rate) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rate = ?',
              [bookId, currency, cnyRate, cnyRate]
            );
          }
        }
      } catch (rateError) {
        console.error('自动拉取汇率失败（不影响账本创建）:', rateError.message);
      }

      return ResponseUtil.success(res, { id: bookId }, '创建成功');
    } catch (error) {
      console.error('创建账本错误:', error);
      return ResponseUtil.error(res, '创建账本失败', 500);
    }
  }

  // 获取账本列表
  async getList(req, res) {
    try {
      const { search = '', page = 1, pageSize = 10 } = req.query;
      const offset = (page - 1) * pageSize;

      let sql = `
        SELECT ab.*, 
               COALESCE(SUM(t.local_amount), 0) as totalExpense,
               (SELECT COUNT(*) FROM participants WHERE account_book_id = ab.id) as memberCount
        FROM account_books ab
        LEFT JOIN transactions t ON t.account_book_id = ab.id
        WHERE (ab.user_id = ? OR ab.id IN (
          SELECT account_book_id FROM participants WHERE user_id = ?
        ))
      `;
      const params = [req.userId, req.userId];

      if (search) {
        sql += ' AND ab.name LIKE ?';
        params.push(`%${search}%`);
      }

      sql += ' GROUP BY ab.id ORDER BY ab.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(pageSize), parseInt(offset));

      const [list] = await db.query(sql, params);

      const formattedList = list.map(book => ({
        ...book,
        totalExpense: parseFloat(book.totalExpense) || 0,
        isOwner: book.user_id === req.userId
      }));

      let countSql = `SELECT COUNT(DISTINCT ab.id) as total FROM account_books ab
        WHERE (ab.user_id = ? OR ab.id IN (
          SELECT account_book_id FROM participants WHERE user_id = ?
        ))`;
      const countParams = [req.userId, req.userId];
      
      if (search) {
        countSql += ' AND ab.name LIKE ?';
        countParams.push(`%${search}%`);
      }

      const [countResult] = await db.query(countSql, countParams);

      return ResponseUtil.success(res, {
        list: formattedList,
        total: countResult[0].total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });
    } catch (error) {
      console.error('获取账本列表错误:', error);
      return ResponseUtil.error(res, '获取账本列表失败', 500);
    }
  }

  // 获取账本详情
  async getDetail(req, res) {
    try {
      const { id } = req.params;

      const [books] = await db.query(
        `SELECT ab.*,
                COALESCE(SUM(t.local_amount), 0) as totalExpense,
                COALESCE(SUM(CASE WHEN t.type = 'personal' THEN t.local_amount ELSE 0 END), 0) as personalExpense,
                COALESCE(SUM(CASE WHEN t.type = 'shared' THEN t.local_amount ELSE 0 END), 0) as sharedExpense
         FROM account_books ab
         LEFT JOIN transactions t ON t.account_book_id = ab.id
         WHERE ab.id = ? AND (ab.user_id = ? OR ab.id IN (
           SELECT account_book_id FROM participants WHERE user_id = ?
         ))
         GROUP BY ab.id`,
        [id, req.userId, req.userId]
      );

      if (books.length === 0) {
        return ResponseUtil.error(res, '账本不存在', 404);
      }

      // 获取各币种支出明细
      const [currencyBreakdown] = await db.query(
        `SELECT currency, SUM(amount) as amount
         FROM transactions
         WHERE account_book_id = ?
         GROUP BY currency`,
        [id]
      );

      const bookDetail = {
        ...books[0],
        totalExpense: parseFloat(books[0].totalExpense) || 0,
        personalExpense: parseFloat(books[0].personalExpense) || 0,
        sharedExpense: parseFloat(books[0].sharedExpense) || 0,
        budget: parseFloat(books[0].budget) || null,
        currencyBreakdown
      };

      return ResponseUtil.success(res, bookDetail);
    } catch (error) {
      console.error('获取账本详情错误:', error);
      return ResponseUtil.error(res, '获取账本详情失败', 500);
    }
  }

  // 更新账本
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, destination, startDate, endDate, budget, remark, defaultCurrency } = req.body;

      // 检查账本是否存在且当前用户有权限（创建者或参与者）
      const [books] = await db.query(
        'SELECT * FROM account_books WHERE id = ? AND (user_id = ? OR id IN (SELECT account_book_id FROM participants WHERE user_id = ?))',
        [id, req.userId, req.userId]
      );

      if (books.length === 0) {
        return ResponseUtil.error(res, '账本不存在', 404);
      }

      if (books[0].is_archived) {
        return ResponseUtil.error(res, '已封存的账本不可编辑', 400);
      }

      const updates = [];
      const values = [];

      if (name) {
        updates.push('name = ?');
        values.push(name);
      }
      if (destination) {
        updates.push('destination = ?');
        values.push(destination);
      }
      if (startDate) {
        updates.push('start_date = ?');
        values.push(startDate);
      }
      if (endDate) {
        updates.push('end_date = ?');
        values.push(endDate);
      }
      if (budget !== undefined) {
        updates.push('budget = ?');
        values.push(budget);
      }
      if (remark !== undefined) {
        updates.push('remark = ?');
        values.push(remark);
      }
      if (defaultCurrency) {
        updates.push('default_currency = ?');
        values.push(defaultCurrency);
      }

      if (updates.length === 0) {
        return ResponseUtil.error(res, '没有需要更新的字段', 400);
      }

      values.push(id);

      await db.query(
        `UPDATE account_books SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      return ResponseUtil.success(res, null, '更新成功');
    } catch (error) {
      console.error('更新账本错误:', error);
      return ResponseUtil.error(res, '更新账本失败', 500);
    }
  }

  // 删除账本
  async delete(req, res) {
    try {
      const { id } = req.params;

      const [result] = await db.query(
        'DELETE FROM account_books WHERE id = ? AND user_id = ?',
        [id, req.userId]
      );

      if (result.affectedRows === 0) {
        return ResponseUtil.error(res, '账本不存在', 404);
      }

      return ResponseUtil.success(res, null, '删除成功');
    } catch (error) {
      console.error('删除账本错误:', error);
      return ResponseUtil.error(res, '删除账本失败', 500);
    }
  }

  // 封存/解封账本
  async archive(req, res) {
    try {
      const { id } = req.params;
      const { isArchived } = req.body;

      if (typeof isArchived !== 'boolean') {
        return ResponseUtil.error(res, '参数错误', 400);
      }

      // 封存时检查是否所有人已结清
      if (isArchived) {
        const [unsettled] = await db.query(
          `SELECT p.name FROM participants p
           WHERE p.account_book_id = ? AND p.is_settled = 0
           AND p.id IN (
             SELECT DISTINCT payer_id FROM transactions WHERE account_book_id = ? AND type = 'shared' AND payer_id IS NOT NULL
             UNION
             SELECT DISTINCT tp.participant_id FROM transaction_participants tp
             JOIN transactions t ON t.id = tp.transaction_id
             WHERE t.account_book_id = ? AND t.type = 'shared'
           )`,
          [id, id, id]
        );
        if (unsettled.length > 0) {
          const names = unsettled.map(p => p.name).join('、');
          return ResponseUtil.error(res, `${names} 尚未结清，请先在分账页面标记结清后再封存`, 400);
        }
      }

      const [result] = await db.query(
        'UPDATE account_books SET is_archived = ? WHERE id = ? AND user_id = ?',
        [isArchived, id, req.userId]
      );

      if (result.affectedRows === 0) {
        return ResponseUtil.error(res, '账本不存在', 404);
      }

      return ResponseUtil.success(res, null, isArchived ? '封存成功' : '解封成功');
    } catch (error) {
      console.error('封存账本错误:', error);
      return ResponseUtil.error(res, '操作失败', 500);
    }
  }
  // 上传账本封面
  async uploadCover(req, res) {
    try {
      const { id } = req.params;
      if (!req.file) return ResponseUtil.error(res, '请上传图片', 400);

      const [books] = await db.query(
        'SELECT * FROM account_books WHERE id = ? AND (user_id = ? OR id IN (SELECT account_book_id FROM participants WHERE user_id = ?))',
        [id, req.userId, req.userId]
      );
      if (books.length === 0) return ResponseUtil.error(res, '账本不存在', 404);

      const coverUrl = `/uploads/${req.file.filename}`;
      await db.query('UPDATE account_books SET cover = ? WHERE id = ?', [coverUrl, id]);

      return ResponseUtil.success(res, { coverUrl }, '封面上传成功');
    } catch (error) {
      console.error('上传封面错误:', error);
      return ResponseUtil.error(res, '上传封面失败', 500);
    }
  }
}

module.exports = new AccountBookController();
