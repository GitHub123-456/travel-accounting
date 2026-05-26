# 旅行记账系统 - 项目总览

## 项目简介

这是一个专为旅行设计的移动端记账应用，帮助用户管理旅行支出、多币种换算和多人分账。

## 核心特性

### 1. 账本管理
- 无限创建旅行账本
- 记录旅行名称、时间、目的地
- 账本封存功能（完成后锁定）
- 按名称搜索账本

### 2. 多币种支持
- 内置6种常用币种（CNY, USD, EUR, JPY, THB, KRW）
- 每个账本独立设置汇率
- 自动换算为本币显示
- 修改汇率后自动重新计算

### 3. 智能记账
- 区分个人账单和共同账单
- 6大消费分类（餐饮、交通、住宿、购物、门票、其他）
- 记录消费时间、地点、备注
- 实时显示原币和本币金额

### 4. 多人分账
- 添加旅行参与人
- 共同账单自动等额分摊
- 一键核算每人应付/已付/余额
- 个人分账视图

### 5. 用户系统
- 邮箱/手机号注册登录
- 个人资料管理
- 头像上传
- 默认币种设置

## 技术架构

### 前端
```
React 18 + Vite
├── React Router v6      # 路由管理
├── Ant Design Mobile    # UI 组件
├── Axios               # HTTP 请求
└── Day.js              # 日期处理
```

### 后端
```
Node.js + Express
├── MySQL 8.0           # 数据库
├── JWT                 # 身份认证
├── Bcrypt              # 密码加密
└── Multer              # 文件上传
```

## 数据库设计

### 核心表结构
1. users - 用户表
2. account_books - 账本表
3. transactions - 账单表
4. participants - 参与人表
5. transaction_participants - 账单参与人关联表
6. exchange_rates - 汇率表
7. verification_codes - 验证码表

## API 接口

### 认证模块
- POST /api/auth/register - 注册
- POST /api/auth/login - 登录
- POST /api/auth/send-code - 发送验证码
- POST /api/auth/reset-password - 重置密码

### 用户模块
- GET /api/user/profile - 获取个人信息
- PUT /api/user/profile - 更新个人信息
- POST /api/user/avatar - 上传头像

### 账本模块
- POST /api/account-books - 创建账本
- GET /api/account-books - 获取账本列表
- GET /api/account-books/:id - 获取账本详情
- PUT /api/account-books/:id - 更新账本
- DELETE /api/account-books/:id - 删除账本
- PUT /api/account-books/:id/archive - 封存/解封账本

### 账单模块
- POST /api/account-books/:bookId/transactions - 创建账单
- GET /api/account-books/:bookId/transactions - 获取账单列表
- PUT /api/transactions/:id - 更新账单
- DELETE /api/transactions/:id - 删除账单

### 分账模块
- GET /api/account-books/:bookId/split-bills/calculate - 计算分账
- GET /api/account-books/:bookId/split-bills/personal - 个人分账视图

## 项目文件结构

```
travel-accounting/
├── README.md                 # 项目说明
├── QUICKSTART.md            # 快速开始
├── PROJECT_OVERVIEW.md      # 项目总览（本文件）
├── .gitignore
│
├── docs/                    # 文档目录
│   ├── API.md              # API 接口文档
│   ├── DATABASE.md         # 数据库设计文档
│   └── DEVELOPMENT.md      # 开发指南
│
├── frontend/               # 前端项目
│   ├── src/
│   │   ├── api/           # API 接口封装
│   │   │   ├── auth.js
│   │   │   ├── user.js
│   │   │   ├── accountBook.js
│   │   │   ├── transaction.js
│   │   │   ├── participant.js
│   │   │   ├── splitBill.js
│   │   │   └── exchangeRate.js
│   │   ├── components/    # 公共组件
│   │   │   └── AccountBookForm.jsx
│   │   ├── pages/         # 页面组件
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── AccountBookList.jsx
│   │   │   ├── AccountBookDetail.jsx
│   │   │   ├── TransactionForm.jsx
│   │   │   ├── SplitBill.jsx
│   │   │   └── Profile.jsx
│   │   ├── utils/         # 工具函数
│   │   │   └── request.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── backend/               # 后端项目
    ├── src/
    │   ├── controllers/   # 控制器
    │   │   ├── authController.js
    │   │   ├── userController.js
    │   │   ├── accountBookController.js
    │   │   ├── transactionController.js
    │   │   ├── participantController.js
    │   │   ├── splitBillController.js
    │   │   └── exchangeRateController.js
    │   ├── middleware/    # 中间件
    │   │   └── auth.js
    │   ├── routes/        # 路由
    │   │   └── index.js
    │   ├── config/        # 配置
    │   │   └── database.js
    │   ├── utils/         # 工具函数
    │   │   └── response.js
    │   └── app.js
    ├── database/          # 数据库脚本
    │   └── schema.sql
    ├── uploads/           # 上传文件目录
    ├── .env.example
    └── package.json
```

## 开发流程

### 1. 环境准备
```bash
# 安装 Node.js 18+
# 安装 MySQL 8.0+
# 克隆项目
```

### 2. 安装依赖
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. 配置数据库
```bash
mysql -u root -p
CREATE DATABASE travel_accounting;
SOURCE backend/database/schema.sql;
```

### 4. 配置环境变量
```bash
cd backend
cp .env.example .env
# 编辑 .env 填入数据库配置
```

### 5. 启动开发服务器
```bash
# 终端1：启动后端
cd backend && npm run dev

# 终端2：启动前端
cd frontend && npm run dev
```

### 6. 访问应用
打开浏览器访问 http://localhost:5173

## 核心业务逻辑

### 汇率换算
```javascript
// 设置汇率时
1. 保存汇率到 exchange_rates 表
2. 更新该币种的所有账单本币金额

// 创建账单时
1. 查询当前账本的汇率
2. 计算本币金额 = 原币金额 × 汇率
3. 同时保存原币和本币金额
```

### 分账计算
```javascript
// 对每个参与人
1. 已付金额 = SUM(作为付款人的共同账单金额)
2. 应付金额 = SUM(参与的共同账单金额 ÷ 参与人数)
3. 余额 = 已付金额 - 应付金额
   - 正数：多付了，别人欠他
   - 负数：少付了，他欠别人
```

### 账本封存
```javascript
// 封存后的限制
1. 不可添加/编辑/删除账单
2. 不可修改汇率
3. 不可修改账本信息
4. 可以查看所有数据
5. 可以解除封存恢复编辑
```

## 安全措施

1. 密码使用 bcrypt 加密存储
2. JWT token 认证，7天有效期
3. SQL 参数化查询防注入
4. 文件上传类型和大小限制
5. 跨域请求配置
6. 敏感操作需要确认

## 性能优化

1. 数据库连接池管理
2. 前端路由懒加载
3. 图片压缩上传
4. 分页加载数据
5. 索引优化查询

## 移动端适配

1. 响应式布局
2. 触摸手势支持
3. 移动端组件库
4. viewport 配置
5. 防止页面缩放

## 测试建议

### 功能测试
- 用户注册登录流程
- 账本 CRUD 操作
- 账单记录和编辑
- 汇率换算准确性
- 分账计算正确性
- 封存功能限制

### 边界测试
- 空数据处理
- 大量数据加载
- 网络异常处理
- 并发操作处理

## 部署建议

### 前端部署
```bash
npm run build
# 将 dist 目录部署到 Nginx/CDN
```

### 后端部署
```bash
# 使用 PM2 管理进程
pm2 start src/app.js --name travel-accounting
pm2 save
pm2 startup
```

### 数据库备份
```bash
# 定期备份
mysqldump -u root -p travel_accounting > backup.sql
```

## 后续规划

### v1.1 计划功能
- 旅行预算管理
- 消费统计图表
- 数据导出（Excel）
- 账本分享功能

### v1.2 计划功能
- 多语言支持
- 离线缓存
- 消息推送
- 社交分享

## 文档索引

- [README.md](README.md) - 项目介绍和快速开始
- [QUICKSTART.md](QUICKSTART.md) - 5分钟快速启动指南
- [docs/API.md](docs/API.md) - 完整 API 接口文档
- [docs/DATABASE.md](docs/DATABASE.md) - 数据库设计文档
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) - 开发规范和指南

## 技术支持

遇到问题请检查：
1. Node.js 版本 >= 18
2. MySQL 版本 >= 8.0
3. 端口 3000 和 5173 未被占用
4. 数据库配置正确
5. 依赖安装完整

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交代码
4. 发起 Pull Request

## 许可证

MIT License
