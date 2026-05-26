const db = require('../config/database');
const ResponseUtil = require('../utils/response');

class UserController {
  // 获取个人信息
  async getProfile(req, res) {
    try {
      const [users] = await db.query(
        `SELECT u.id as userId, u.nickname, u.avatar, u.email, u.phone, 
                u.default_currency as defaultCurrency, u.created_at as createdAt
         FROM users u
         WHERE u.id = ?`,
        [req.userId]
      );

      if (users.length === 0) {
        return ResponseUtil.error(res, '用户不存在', 404);
      }

      // 统计创建的 + 参与的账本总数
      const [countResult] = await db.query(
        `SELECT COUNT(DISTINCT ab.id) as total
         FROM account_books ab
         WHERE ab.user_id = ? OR ab.id IN (
           SELECT account_book_id FROM participants WHERE user_id = ?
         )`,
        [req.userId, req.userId]
      );

      const profile = { ...users[0], accountBookCount: countResult[0].total };
      return ResponseUtil.success(res, profile);
    } catch (error) {
      console.error('获取个人信息错误:', error);
      return ResponseUtil.error(res, '获取个人信息失败', 500);
    }
  }

  // 更新个人信息
  async updateProfile(req, res) {
    try {
      const { nickname, defaultCurrency } = req.body;
      const updates = [];
      const values = [];

      if (nickname) {
        updates.push('nickname = ?');
        values.push(nickname);
      }

      if (defaultCurrency) {
        updates.push('default_currency = ?');
        values.push(defaultCurrency);
      }

      if (updates.length === 0) {
        return ResponseUtil.error(res, '没有需要更新的字段', 400);
      }

      values.push(req.userId);

      await db.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      return ResponseUtil.success(res, null, '更新成功');
    } catch (error) {
      console.error('更新个人信息错误:', error);
      return ResponseUtil.error(res, '更新个人信息失败', 500);
    }
  }

  // 上传头像
  async uploadAvatar(req, res) {
    try {
      if (!req.file) {
        return ResponseUtil.error(res, '请上传图片', 400);
      }

      const avatarUrl = `/uploads/${req.file.filename}`;

      await db.query(
        'UPDATE users SET avatar = ? WHERE id = ?',
        [avatarUrl, req.userId]
      );

      return ResponseUtil.success(res, { avatarUrl }, '头像上传成功');
    } catch (error) {
      console.error('上传头像错误:', error);
      return ResponseUtil.error(res, '上传头像失败', 500);
    }
  }
}

module.exports = new UserController();
