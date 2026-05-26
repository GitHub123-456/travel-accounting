const db = require('../config/database');
const ResponseUtil = require('../utils/response');

class TransactionController {
  // 创建账单
  async create(req, res) {
    const connection = await db.getConnection();
    try {
      const { bookId } = req.params;
      const {
        amount, currency, category, subCategory, paymentMethod, transactionTime,
        location, remark, type, payerId, participantIds
      } = req.body;

      if (!amount || !currency || !category || !transactionTime || !type) {
        return ResponseUtil.error(res, '请填写完整信息', 400);
      }

      // 验证账本权限和封存状态
      const [books] = await connection.query(
        `SELECT * FROM account_books WHERE id = ? AND (user_id = ? OR id IN (
          SELECT account_book_id FROM participants WHERE user_id = ?
        ))`,
        [bookId, req.userId, req.userId]
      );

      if (books.length === 0) {
        return ResponseUtil.error(res, '账本不存在', 404);
      }

      if (books[0].is_archived) {
        return ResponseUtil.error(res, '已封存的账本不可添加账单', 400);
      }

      // 获取汇率
      const [rates] = await connection.query(
        'SELECT rate FROM exchange_rates WHERE account_book_id = ? AND currency = ?',
        [bookId, currency]
      );

      const rate = rates.length > 0 ? rates[0].rate : 1;
      const localAmount = amount * rate;

      // 转换时间格式：MySQL 不接受带毫秒和时区的 ISO 格式
      let formattedTime = transactionTime;
      if (transactionTime && typeof transactionTime === 'string') {
        const date = new Date(transactionTime);
        if (!isNaN(date.getTime())) {
          formattedTime = date.toISOString().slice(0, 19).replace('T', ' ');
        }
      }

      await connection.beginTransaction();

      // 插入账单
      // 对于个人账单，如果没有指定 payer_id，自动设置为当前用户对应的参与人
      let finalPayerId = payerId || null;
      if (type === 'personal' && !finalPayerId) {
        // 先按 user_id 查找
        let [myParticipants] = await connection.query(
          'SELECT id FROM participants WHERE account_book_id = ? AND user_id = ? LIMIT 1',
          [bookId, req.userId]
        );
        // 如果没找到，按邮箱查找并自动关联 user_id
        if (myParticipants.length === 0) {
          const [user] = await connection.query('SELECT email FROM users WHERE id = ?', [req.userId]);
          if (user.length > 0 && user[0].email) {
            const [emailMatch] = await connection.query(
              'SELECT id FROM participants WHERE account_book_id = ? AND email = ? LIMIT 1',
              [bookId, user[0].email]
            );
            if (emailMatch.length > 0) {
              await connection.query('UPDATE participants SET user_id = ? WHERE id = ?', [req.userId, emailMatch[0].id]);
              myParticipants = emailMatch;
            }
          }
        }
        if (myParticipants.length > 0) {
          finalPayerId = myParticipants[0].id;
        }
      }

      const [result] = await connection.query(
        `INSERT INTO transactions 
         (account_book_id, amount, currency, local_amount, category, sub_category, payment_method, transaction_time, location, remark, type, payer_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [bookId, amount, currency, localAmount, category, subCategory || null, paymentMethod || 'cash', formattedTime, location, remark, type, finalPayerId, req.userId]
      );

      const transactionId = result.insertId;

      // 如果是共同账单，插入参与人关联
      if (type === 'shared' && participantIds && participantIds.length > 0) {
        const values = participantIds.map(pid => [transactionId, pid]);
        await connection.query(
          'INSERT INTO transaction_participants (transaction_id, participant_id) VALUES ?',
          [values]
        );
      }

      await connection.commit();

      return ResponseUtil.success(res, { id: transactionId }, '创建成功');
    } catch (error) {
      await connection.rollback();
      console.error('创建账单错误:', error);
      console.error('错误详情:', error.message);
      console.error('错误堆栈:', error.stack);
      console.error('SQL错误码:', error.code);
      console.error('SQL错误信息:', error.sqlMessage);
      return ResponseUtil.error(res, `创建账单失败: ${error.message}`, 500);
    } finally {
      connection.release();
    }
  }

  // 获取账单列表
  async getList(req, res) {
    try {
      const { bookId } = req.params;
      const { type, page = 1, pageSize = 20 } = req.query;
      const offset = (page - 1) * pageSize;

      // 验证账本权限
      const [books] = await db.query(
        `SELECT * FROM account_books WHERE id = ? AND (user_id = ? OR id IN (
          SELECT account_book_id FROM participants WHERE user_id = ?
        ))`,
        [bookId, req.userId, req.userId]
      );

      if (books.length === 0) {
        return ResponseUtil.error(res, '账本不存在', 404);
      }

      let sql = `
        SELECT t.*,
               p.name as payerName,
               u_creator.nickname as creatorName,
               GROUP_CONCAT(DISTINCT p2.id) as participant_ids,
               GROUP_CONCAT(DISTINCT p2.name) as participants
        FROM transactions t
        LEFT JOIN participants p ON p.id = t.payer_id
        LEFT JOIN users u_creator ON u_creator.id = t.created_by
        LEFT JOIN transaction_participants tp ON tp.transaction_id = t.id
        LEFT JOIN participants p2 ON p2.id = tp.participant_id
        WHERE t.account_book_id = ?
      `;
      const params = [bookId];

      if (type) {
        sql += ' AND t.type = ?';
        params.push(type);
      }

      sql += ' GROUP BY t.id ORDER BY t.transaction_time DESC LIMIT ? OFFSET ?';
      params.push(parseInt(pageSize), parseInt(offset));

      const [list] = await db.query(sql, params);

      // 获取总数
      let countSql = 'SELECT COUNT(*) as total FROM transactions WHERE account_book_id = ?';
      const countParams = [bookId];
      
      if (type) {
        countSql += ' AND type = ?';
        countParams.push(type);
      }

      const [countResult] = await db.query(countSql, countParams);

      return ResponseUtil.success(res, {
        list: list.map(item => ({
          ...item,
          participant_ids: item.participant_ids ? item.participant_ids.split(',').map(id => parseInt(id)) : [],
          participants: item.participants ? item.participants.split(',') : []
        })),
        total: countResult[0].total
      });
    } catch (error) {
      console.error('获取账单列表错误:', error);
      return ResponseUtil.error(res, '获取账单列表失败', 500);
    }
  }

  // 获取账单详情
  async getDetail(req, res) {
    try {
      const { id } = req.params;

      // 获取账单详情
      const [transactions] = await db.query(
        `SELECT t.*, ab.user_id,
                p.name as payerName,
                u_creator.nickname as creatorName,
                GROUP_CONCAT(DISTINCT p2.id) as participant_ids,
                GROUP_CONCAT(DISTINCT p2.name) as participants
         FROM transactions t
         JOIN account_books ab ON ab.id = t.account_book_id
         LEFT JOIN users u_creator ON u_creator.id = t.created_by
         LEFT JOIN participants p ON p.id = t.payer_id
         LEFT JOIN transaction_participants tp ON tp.transaction_id = t.id
         LEFT JOIN participants p2 ON p2.id = tp.participant_id
         WHERE t.id = ?
         GROUP BY t.id`,
        [id]
      );

      if (transactions.length === 0) {
        return ResponseUtil.error(res, '账单不存在', 404);
      }

      const transaction = transactions[0];

      if (transaction.user_id !== req.userId) {
        // 也允许交易创建者查看
        if (transaction.created_by !== req.userId) {
          return ResponseUtil.error(res, '无权限查看', 403);
        }
      }

      // 格式化参与人数据
      const result = {
        ...transaction,
        participant_ids: transaction.participant_ids 
          ? transaction.participant_ids.split(',').map(id => parseInt(id))
          : [],
        participants: transaction.participants 
          ? transaction.participants.split(',')
          : []
      };

      delete result.user_id;

      return ResponseUtil.success(res, result);
    } catch (error) {
      console.error('获取账单详情错误:', error);
      return ResponseUtil.error(res, '获取账单详情失败', 500);
    }
  }

  // 更新账单
  async update(req, res) {
    const connection = await db.getConnection();
    try {
      const { id } = req.params;
      const {
        amount, currency, category, subCategory, paymentMethod, transactionTime,
        location, remark, type, payerId, participantIds
      } = req.body;

      // 验证账单权限
      const [transactions] = await connection.query(
        `SELECT t.*, ab.user_id, ab.is_archived
         FROM transactions t
         JOIN account_books ab ON ab.id = t.account_book_id
         WHERE t.id = ?`,
        [id]
      );

      if (transactions.length === 0) {
        return ResponseUtil.error(res, '账单不存在', 404);
      }

      // 账本创建者、交易创建者、或账本成员都可以修改
      const isOwner = String(transactions[0].user_id) === String(req.userId);
      const isCreator = transactions[0].created_by && String(transactions[0].created_by) === String(req.userId);
      let isMember = false;
      if (!isOwner && !isCreator) {
        const [members] = await connection.query(
          'SELECT id FROM participants WHERE account_book_id = ? AND user_id = ?',
          [transactions[0].account_book_id, req.userId]
        );
        isMember = members.length > 0;
      }
      if (!isOwner && !isCreator && !isMember) {
        return ResponseUtil.error(res, '只有账本创建者或成员才能修改账单', 403);
      }

      if (transactions[0].is_archived) {
        return ResponseUtil.error(res, '已封存的账本不可修改账单', 400);
      }

      await connection.beginTransaction();

      // 更新账单
      const updates = [];
      const values = [];

      if (amount !== undefined) {
        updates.push('amount = ?');
        values.push(amount);
        
        // 重新计算本币金额
        if (currency) {
          const [rates] = await connection.query(
            'SELECT rate FROM exchange_rates WHERE account_book_id = ? AND currency = ?',
            [transactions[0].account_book_id, currency]
          );
          const rate = rates.length > 0 ? rates[0].rate : 1;
          updates.push('local_amount = ?');
          values.push(amount * rate);
        }
      }

      if (currency) updates.push('currency = ?'), values.push(currency);
      if (category) updates.push('category = ?'), values.push(category);
      if (subCategory !== undefined) updates.push('sub_category = ?'), values.push(subCategory);
      if (paymentMethod) updates.push('payment_method = ?'), values.push(paymentMethod);
      if (transactionTime) updates.push('transaction_time = ?'), values.push(transactionTime);
      if (location !== undefined) updates.push('location = ?'), values.push(location);
      if (remark !== undefined) updates.push('remark = ?'), values.push(remark);
      if (type) updates.push('type = ?'), values.push(type);
      if (payerId !== undefined) updates.push('payer_id = ?'), values.push(payerId);

      if (updates.length > 0) {
        values.push(id);
        await connection.query(
          `UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      // 更新参与人关联
      if (type === 'shared' && participantIds) {
        await connection.query('DELETE FROM transaction_participants WHERE transaction_id = ?', [id]);
        if (participantIds.length > 0) {
          const values = participantIds.map(pid => [id, pid]);
          await connection.query(
            'INSERT INTO transaction_participants (transaction_id, participant_id) VALUES ?',
            [values]
          );
        }
      }

      await connection.commit();

      return ResponseUtil.success(res, null, '更新成功');
    } catch (error) {
      await connection.rollback();
      console.error('更新账单错误:', error);
      return ResponseUtil.error(res, '更新账单失败', 500);
    } finally {
      connection.release();
    }
  }

  // 删除账单
  async delete(req, res) {
    try {
      const { id } = req.params;

      const [transactions] = await db.query(
        `SELECT t.id, t.account_book_id, t.created_by, ab.user_id as book_owner_id, ab.is_archived
         FROM transactions t
         JOIN account_books ab ON ab.id = t.account_book_id
         WHERE t.id = ?`,
        [id]
      );

      if (transactions.length === 0) {
        return ResponseUtil.error(res, '账单不存在', 404);
      }

      const tx = transactions[0];

      if (tx.is_archived) {
        return ResponseUtil.error(res, '已封存的账本不可删除账单', 400);
      }

      const isBookOwner = String(tx.book_owner_id) === String(req.userId);
      const isCreator = tx.created_by && String(tx.created_by) === String(req.userId);
      
      // 检查是否是账本成员
      const [members] = await db.query(
        'SELECT id FROM participants WHERE account_book_id = ? AND user_id = ?',
        [tx.account_book_id, req.userId]
      );
      const isMember = members.length > 0;

      if (!isBookOwner && !isCreator && !isMember) {
        return ResponseUtil.error(res, '只有账本创建者或成员才能删除账单', 403);
      }

      // 先删除关联的参与人记录
      await db.query('DELETE FROM transaction_participants WHERE transaction_id = ?', [id]);
      await db.query('DELETE FROM transactions WHERE id = ?', [id]);

      return ResponseUtil.success(res, null, '删除成功');
    } catch (error) {
      console.error('删除账单错误:', error.message, error.stack);
      return ResponseUtil.error(res, '删除失败: ' + error.message, 500);
    }
  }
}

module.exports = new TransactionController();
