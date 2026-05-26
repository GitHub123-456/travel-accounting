# 开发指南

## 项目概述
这是一个基于 React + Node.js 的移动端旅行记账系统，支持多账本管理、多币种汇率换算、多人分账等功能。

## 技术选型

### 前端技术栈
- React 18 - UI 框架
- React Router v6 - 路由管理
- Ant Design Mobile - 移动端 UI 组件库
- Axios - HTTP 请求库
- Vite - 构建工具
- Day.js - 日期处理

### 后端技术栈
- Node.js 18+ - 运行环境
- Express - Web 框架
- MySQL 8.0 - 数据库
- JWT - 身份认证
- Bcrypt - 密码加密
- Multer - 文件上传

## 项目结构

```
travel-accounting/
├── frontend/                 # 前端项目
│   ├── src/
│   │   ├── api/             # API 接口封装
│   │   │   ├── auth.js      # 认证接口
│   │   │   ├── user.js      # 用户接口
│   │   │   ├── accountBook.js  # 账本接口
│   │   │   ├── transaction.js  # 账单接口
│   │   │   ├── participant.js  # 参与人接口
│   │   │   ├── splitBill.js    # 分账接口
│   │   │   └── exchangeRate.js # 汇率接口
│   │   ├── components/      # 公共组件
│   │   │   └── AccountBookForm.jsx
│   │   ├── pages/           # 页面组件
│   │   │   ├── Login.jsx    # 登录页
│   │   │   ├── Register.jsx # 注册页
│   │   │   ├── AccountBookList.jsx  # 账本列表
│   │   │   ├── AccountBookDetail.jsx # 账本详情
│   │   │   ├── TransactionForm.jsx   # 记账表单
│   │   │   ├── SplitBill.jsx        # 分账页面
│   │   │   └── Profile.jsx          # 个人中心
│   │   ├── utils/           # 工具函数
│   │   │   └── request.js   # Axios 封装
│   │   ├── App.jsx          # 根组件
│   │   ├── main.jsx         # 入口文件
│   │   └── index.css        # 全局样式
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/                  # 后端项目
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   ├── accountBookController.js
│   │   │   ├── transactionController.js
│   │   │   ├── participantController.js
│   │   │   ├── splitBillController.js
│   │   │   └── exchangeRateController.js
│   │   ├── middleware/      # 中间件
│   │   │   └── auth.js      # JWT 认证中间件
│   │   ├── routes/          # 路由
│   │   │   └── index.js
│   │   ├── config/          # 配置
│   │   │   └── database.js  # 数据库配置
│   │   ├── utils/           # 工具函数
│   │   │   └── response.js  # 响应封装
│   │   └── app.js           # 应用入口
│   ├── database/            # 数据库脚本
│   │   └── schema.sql       # 数据库结构
│   ├── .env.example         # 环境变量示例
│   └── package.json
│
└── docs/                     # 文档
    ├── API.md               # API 文档
    ├── DATABASE.md          # 数据库文档
    └── DEVELOPMENT.md       # 开发文档
```

## 开发环境搭建

### 1. 安装依赖

```bash
# 后端依赖
cd backend
npm install

# 前端依赖
cd ../frontend
npm install
```

### 2. 配置数据库

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE travel_accounting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 导入数据库结构
USE travel_accounting;
SOURCE backend/database/schema.sql;
```

### 3. 配置环境变量

```bash
cd backend
cp .env.example .env
# 编辑 .env 文件，填入数据库配置
```

### 4. 启动开发服务器

```bash
# 启动后端（终端1）
cd backend
npm run dev

# 启动前端（终端2）
cd frontend
npm run dev
```

## 核心功能实现

### 1. 用户认证流程

```javascript
// 登录流程
1. 用户输入账号密码
2. 前端调用 /api/auth/login
3. 后端验证账号密码
4. 返回 JWT token
5. 前端存储 token 到 localStorage
6. 后续请求携带 token 在 Authorization header
```

### 2. 账本管理

```javascript
// 创建账本
POST /api/account-books
{
  "name": "日本旅行",
  "destination": "东京",
  "startDate": "2026-03-01",
  "endDate": "2026-03-07",
  "remark": "春季赏樱"
}

// 账本列表支持搜索和分页
GET /api/account-books?search=日本&page=1&pageSize=10
```

### 3. 汇率换算

```javascript
// 设置汇率
POST /api/account-books/:bookId/exchange-rates
{
  "currency": "JPY",
  "rate": 0.052  // 1日元 = 0.052人民币
}

// 创建账单时自动换算
// 原币金额 * 汇率 = 本币金额
localAmount = amount * rate
```

### 4. 分账计算

```javascript
// 分账算法
1. 获取所有共同账单
2. 对每个参与人：
   - 计算已支付金额（作为付款人的账单总额）
   - 计算应支付金额（参与的账单平摊）
   - 余额 = 已支付 - 应支付
3. 正余额表示多付，负余额表示欠款
```

## 代码规范

### 前端规范

1. 组件命名：使用 PascalCase
2. 文件命名：组件文件使用 .jsx 扩展名
3. 样式文件：每个页面组件对应一个 .css 文件
4. API 调用：统一使用 async/await
5. 错误处理：使用 try-catch 捕获异常

### 后端规范

1. 控制器：使用类封装，导出实例
2. 路由：统一在 routes/index.js 中定义
3. 响应格式：使用 ResponseUtil 统一封装
4. 错误处理：使用 try-catch，返回友好错误信息
5. 数据库查询：使用参数化查询防止 SQL 注入

## 常见问题

### 1. 跨域问题
前端开发时通过 Vite 的 proxy 配置解决：
```javascript
// vite.config.js
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true
  }
}
```

### 2. Token 过期处理
在 Axios 响应拦截器中统一处理 401 错误，清除 token 并跳转登录页。

### 3. 文件上传
使用 Multer 中间件处理文件上传，限制文件大小和类型。

### 4. 数据库连接池
使用 mysql2 的连接池管理数据库连接，提高性能。

## 部署指南

### 前端部署

```bash
cd frontend
npm run build
# 将 dist 目录部署到静态服务器
```

### 后端部署

```bash
cd backend
npm start
# 使用 PM2 管理进程
pm2 start src/app.js --name travel-accounting
```

### 数据库备份

```bash
# 定期备份数据库
mysqldump -u root -p travel_accounting > backup_$(date +%Y%m%d).sql
```

## 后续优化建议

1. 添加单元测试和集成测试
2. 实现真实的邮件/短信验证码发送
3. 添加数据导出功能（Excel/PDF）
4. 实现图表统计功能
5. 添加多语言支持
6. 优化移动端性能和体验
7. 添加离线缓存功能
8. 实现账本分享功能
