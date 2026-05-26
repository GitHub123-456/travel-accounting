const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const ResponseUtil = require('../utils/response');

class AuthController {
  // 注册
  async register(req, res) {
    try {
      const { email, phone, password, nickname } = req.body;

      // 验证必填字段
      if ((!email && !phone) || !password || !nickname) {
        return ResponseUtil.error(res, '请填写完整信息', 400);
      }

      // 检查账号是否已存在
      const [existingUsers] = await query(
        'SELECT id FROM users WHERE email = $1 OR phone = $1',
        [email || phone || '']
      );

      if (existingUsers.length > 0) {
        return ResponseUtil.error(res, '该邮箱或手机号已被注册', 400);
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      // 插入用户
      const [newUsers] = await query(
        'INSERT INTO users (email, phone, password, nickname) VALUES ($1, $2, $3, $4) RETURNING id',
        [email || null, phone || null, hashedPassword, nickname]
      );

      const userId = newUsers[0].id;

      // 生成 token
      const token = jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // 自动关联匹配邮箱的参与人记录
      if (email) {
        await query(
          'UPDATE participants SET user_id = $1 WHERE email = $2 AND user_id IS NULL',
          [userId, email]
        );
      }

      return ResponseUtil.success(res, {
        userId,
        token
      }, '注册成功');
    } catch (error) {
      console.error('注册错误:', error);
      return ResponseUtil.error(res, '注册失败', 500);
    }
  }

  // 登录
  async login(req, res) {
    try {
      const { account, password } = req.body;

      if (!account || !password) {
        return ResponseUtil.error(res, '请输入账号和密码', 400);
      }

      // 查询用户
      const [users] = await query(
        'SELECT * FROM users WHERE email = $1 OR phone = $1',
        [account]
      );

      if (users.length === 0) {
        return ResponseUtil.error(res, '账号不存在', 400);
      }

      const user = users[0];

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return ResponseUtil.error(res, '密码错误', 400);
      }

      // 生成 token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // 自动关联匹配邮箱的参与人记录
      if (user.email) {
        await query(
          'UPDATE participants SET user_id = $1 WHERE email = $2 AND user_id IS NULL',
          [user.id, user.email]
        );
      }

      return ResponseUtil.success(res, {
        userId: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        token
      }, '登录成功');
    } catch (error) {
      console.error('登录错误:', error);
      return ResponseUtil.error(res, '登录失败', 500);
    }
  }

  // 发送验证码
  async sendCode(req, res) {
    try {
      const { account, type } = req.body;

      if (!account || !type) {
        return ResponseUtil.error(res, '参数错误', 400);
      }

      // 生成6位验证码
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + (parseInt(process.env.VERIFICATION_CODE_EXPIRES) || 600) * 1000);

      // 保存验证码
      await db.query(
        'INSERT INTO verification_codes (account, code, type, expires_at) VALUES (?, ?, ?, ?)',
        [account, code, type, expiresAt]
      );

      // TODO: 实际发送邮件或短信
      console.log(`验证码: ${code} 发送到 ${account}`);

      return ResponseUtil.success(res, null, '验证码已发送');
    } catch (error) {
      console.error('发送验证码错误:', error);
      return ResponseUtil.error(res, '发送验证码失败', 500);
    }
  }

  // 重置密码
  async resetPassword(req, res) {
    try {
      const { account, code, newPassword } = req.body;

      if (!account || !code || !newPassword) {
        return ResponseUtil.error(res, '参数错误', 400);
      }

      // 验证验证码
      const [codes] = await db.query(
        'SELECT * FROM verification_codes WHERE account = ? AND code = ? AND is_used = 0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
        [account, code]
      );

      if (codes.length === 0) {
        return ResponseUtil.error(res, '验证码错误或已过期', 400);
      }

      // 标记验证码已使用
      await db.query(
        'UPDATE verification_codes SET is_used = 1 WHERE id = ?',
        [codes[0].id]
      );

      // 更新密码
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const [result] = await db.query(
        'UPDATE users SET password = ? WHERE email = ? OR phone = ?',
        [hashedPassword, account, account]
      );

      if (result.affectedRows === 0) {
        return ResponseUtil.error(res, '账号不存在', 400);
      }

      return ResponseUtil.success(res, null, '密码重置成功');
    } catch (error) {
      console.error('重置密码错误:', error);
      return ResponseUtil.error(res, '重置密码失败', 500);
    }
  }
  // 直接重置密码（通过邮箱验证）
  async resetPasswordDirect(req, res) {
    try {
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return ResponseUtil.error(res, '请填写邮箱和新密码', 400);
      }

      if (newPassword.length < 6) {
        return ResponseUtil.error(res, '密码长度不能少于6位', 400);
      }

      // 检查邮箱是否存在
      const [users] = await db.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        return ResponseUtil.error(res, '该邮箱未注册', 400);
      }

      // 更新密码
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.query(
        'UPDATE users SET password = ? WHERE email = ?',
        [hashedPassword, email]
      );

      return ResponseUtil.success(res, null, '密码重置成功');
    } catch (error) {
      console.error('重置密码错误:', error);
      return ResponseUtil.error(res, '重置密码失败', 500);
    }
  }

  // 直接重置密码（通过邮箱验证）
  async resetPasswordDirect(req, res) {
    try {
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return ResponseUtil.error(res, '请填写邮箱和新密码', 400);
      }

      if (newPassword.length < 6) {
        return ResponseUtil.error(res, '密码长度不能少于6位', 400);
      }

      const [users] = await db.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        return ResponseUtil.error(res, '该邮箱未注册', 400);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.query(
        'UPDATE users SET password = ? WHERE email = ?',
        [hashedPassword, email]
      );

      return ResponseUtil.success(res, null, '密码重置成功');
    } catch (error) {
      console.error('直接重置密码错误:', error);
      return ResponseUtil.error(res, '重置密码失败', 500);
    }
  }
}

module.exports = new AuthController();
