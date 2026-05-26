const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/auth');

// 控制器
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const accountBookController = require('../controllers/accountBookController');
const exchangeRateController = require('../controllers/exchangeRateController');
const transactionController = require('../controllers/transactionController');
const participantController = require('../controllers/participantController');
const splitBillController = require('../controllers/splitBillController');
const aiController = require('../controllers/aiController');

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const prefix = file.fieldname === 'cover' ? 'cover' : 'avatar';
    cb(null, prefix + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('只支持图片格式'));
  }
});

// 认证路由
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/send-code', authController.sendCode);
router.post('/auth/reset-password', authController.resetPassword);
router.post('/auth/reset-password-direct', authController.resetPasswordDirect);

// 用户路由（需要认证）
router.get('/user/profile', authMiddleware, userController.getProfile);
router.put('/user/profile', authMiddleware, userController.updateProfile);
router.post('/user/avatar', authMiddleware, upload.single('avatar'), userController.uploadAvatar);

// 账本路由（需要认证）
router.post('/account-books', authMiddleware, accountBookController.create);
router.get('/account-books', authMiddleware, accountBookController.getList);
router.get('/account-books/:id', authMiddleware, accountBookController.getDetail);
router.put('/account-books/:id', authMiddleware, accountBookController.update);
router.delete('/account-books/:id', authMiddleware, accountBookController.delete);
router.put('/account-books/:id/archive', authMiddleware, accountBookController.archive);
router.post('/account-books/:id/cover', authMiddleware, upload.single('cover'), accountBookController.uploadCover);

// 汇率路由（需要认证）
router.get('/account-books/:bookId/exchange-rates', authMiddleware, exchangeRateController.getList);
router.post('/account-books/:bookId/exchange-rates', authMiddleware, exchangeRateController.setRate);
router.post('/account-books/:bookId/exchange-rates/refresh', authMiddleware, exchangeRateController.refreshAll);

// 账单路由（需要认证）
router.post('/account-books/:bookId/transactions', authMiddleware, transactionController.create);
router.get('/account-books/:bookId/transactions', authMiddleware, transactionController.getList);
router.get('/transactions/:id', authMiddleware, transactionController.getDetail);
router.put('/transactions/:id', authMiddleware, transactionController.update);
router.delete('/transactions/:id', authMiddleware, transactionController.delete);

// 参与人路由（需要认证）
router.post('/account-books/:bookId/participants', authMiddleware, participantController.create);
router.get('/account-books/:bookId/participants', authMiddleware, participantController.getList);
router.put('/participants/:id', authMiddleware, participantController.update);
router.delete('/participants/:id', authMiddleware, participantController.delete);

// 分账路由（需要认证）
router.get('/account-books/:bookId/split-bills/calculate', authMiddleware, splitBillController.calculate);
router.get('/account-books/:bookId/split-bills/personal', authMiddleware, splitBillController.getPersonal);
router.put('/account-books/:bookId/participants/:participantId/settled', authMiddleware, splitBillController.updateSettledStatus);

// AI 智能记账路由（需要认证）
router.post('/account-books/:bookId/ai/parse', authMiddleware, aiController.parseExpense);

module.exports = router;
