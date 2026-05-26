const db = require('../config/database');
const ResponseUtil = require('../utils/response');

class ParticipantController {
  // 添加参与人
  async create(req, res) {
    try {
      const { bookId } = req.params;
      const { name, remark, email } = req.body;

      if (!name) {
        return ResponseUtil.error(res, '请输入参与人姓名', 400);
      }

      // 验证账本权限
      const [books] = await db.query(
        'SELECT * FROM account_books WHERE id = ? AND user_id = ?',
        [bookId, req.userId]
      );

      if (books.length === 0) {
        return ResponseUtil.error(res, '账本不存在', 404);
      }

      // 如果提供了邮箱，查找对应用户
      let userId = null;
      if (email) {
        const [users] = await db.query(
          'SELECT id FROM users WHERE email = ?',
          [email]
        );
        if (users.length > 0) {
          userId = users[0].id;
        }
      }

      const [result] = await db.query(
        'INSERT INTO participants (account_book_id, user_id, name, email, remark) VALUES (?, ?, ?, ?, ?)',
        [bookId, userId, name, email || null, remark || null]
      );

      return ResponseUtil.success(res, { id: result.insertId, userId }, '添加成功');
    } catch (error) {
      console.error('添加参与人错误:', error);
      return ResponseUtil.error(res, '添加参与人失败', 500);
    }
  }

  // 获取参与人列表
  async getList(req, res) {
    try {
      const { bookId } = req.params;

      // 验证账本权限（账本创建者或参与人都可以查看）
      const [books] = await db.query(
        'SELECT * FROM account_books WHERE id = ?',
        [bookId]
      );

      if (books.length === 0) {
        return ResponseUtil.error(res, '账本不存在', 404);
      }

      // 检查是否是创建者或参与人
      const isOwner = books[0].user_id === req.userId;
      if (!isOwner) {
        const [participation] = await db.query(
          'SELECT id FROM participants WHERE account_book_id = ? AND user_id = ?',
          [bookId, req.userId]
        );
        if (participation.length === 0) {
          return ResponseUtil.error(res, '无权限访问', 403);
        }
      }

      // 自动修复：如果当前用户在参与人中但 user_id 未关联，自动补上
      const [currentUser] = await db.query('SELECT id, email FROM users WHERE id = ?', [req.userId]);
      if (currentUser.length > 0 && currentUser[0].email) {
        await db.query(
          'UPDATE participants SET user_id = ? WHERE account_book_id = ? AND email = ? AND (user_id IS NULL OR user_id != ?)',
          [req.userId, bookId, currentUser[0].email, req.userId]
        );
      }

      const [participants] = await db.query(
        `SELECT p.*, u.avatar as userAvatar, u.nickname as userNickname
         FROM participants p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.account_book_id = ?
         ORDER BY p.created_at ASC`,
        [bookId]
      );

      return ResponseUtil.success(res, participants);
    } catch (error) {
      console.error('获取参与人列表错误:', error);
      return ResponseUtil.error(res, '获取参与人列表失败', 500);
    }
  }

  // 更新参与人
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, remark, email } = req.body;

      // 验证参与人权限
      const [participants] = await db.query(
        `SELECT p.*, ab.user_id as owner_id
         FROM participants p
         JOIN account_books ab ON ab.id = p.account_book_id
         WHERE p.id = ?`,
        [id]
      );

      if (participants.length === 0) {
        return ResponseUtil.error(res, '参与人不存在', 404);
      }

      if (participants[0].owner_id !== req.userId) {
        return ResponseUtil.error(res, '无权限操作', 403);
      }

      const updates = [];
      const values = [];

      if (name) {
        updates.push('name = ?');
        values.push(name);
      }
      if (remark !== undefined) {
        updates.push('remark = ?');
        values.push(remark);
      }
      if (email !== undefined) {
        updates.push('email = ?');
        values.push(email || null);

        // 如果邮箱变了，重新关联用户
        let userId = null;
        if (email) {
          const [users] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
          if (users.length > 0) userId = users[0].id;
        }
        updates.push('user_id = ?');
        values.push(userId);
      }

      if (updates.length === 0) {
        return ResponseUtil.error(res, '没有需要更新的字段', 400);
      }

      values.push(id);

      await db.query(
        `UPDATE participants SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      return ResponseUtil.success(res, null, '更新成功');
    } catch (error) {
      console.error('更新参与人错误:', error);
      return ResponseUtil.error(res, '更新参与人失败', 500);
    }
  }

  // 删除参与人
  async delete(req, res) {
    try {
      const { id } = req.params;

      const [participants] = await db.query(
        `SELECT p.*, ab.user_id as owner_id
         FROM participants p
         JOIN account_books ab ON ab.id = p.account_book_id
         WHERE p.id = ?`,
        [id]
      );

      if (participants.length === 0) {
        return ResponseUtil.error(res, '参与人不存在', 404);
      }

      if (participants[0].owner_id !== req.userId) {
        return ResponseUtil.error(res, '无权限操作', 403);
      }

      await db.query('DELETE FROM participants WHERE id = ?', [id]);

      return ResponseUtil.success(res, null, '删除成功');
    } catch (error) {
      console.error('删除参与人错误:', error);
      return ResponseUtil.error(res, '删除参与人失败', 500);
    }
  }
}

module.exports = new ParticipantController();
