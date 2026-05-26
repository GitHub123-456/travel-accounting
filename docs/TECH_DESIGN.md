# 技术设计文档

## 1. 系统架构

```
┌─────────────────────────────────────────────────────┐
│                    客户端层                           │
│  ┌───────────────┐  ┌───────────────┐              │
│  │  移动端浏览器   │  │  微信内置浏览器  │              │
│  └───────┬───────┘  └───────┬───────┘              │
└──────────┼──────────────────┼──────────────────────┘
           │                  │
           ▼                  ▼
┌─────────────────────────────────────────────────────┐
│                   前端应用层                          │
│  React 18 + Vite + Ant Design Mobile                │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐           │
│  │  Pages  │ │Components│ │  API Layer │           │
│  └─────────┘ └──────────┘ └─────┬─────┘           │
└──────────────────────────────────┼─────────────────┘
                                   │ HTTP/JSON
                                   ▼
┌─────────────────────────────────────────────────────┐
│                   后端服务层                          │
│  Node.js + Express                                  │
│  ┌────────┐ ┌───────────┐ ┌──────────┐            │
│  │ Routes │ │Controllers│ │Middleware│            │
│  └────────┘ └─────┬─────┘ └──────────┘            │
└───────────────────┼────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼                       ▼
┌──────────────┐      ┌──────────────────┐
│   MySQL 8.0  │      │  通义千问 API     │
│   数据持久层  │      │  (AI 智能记账)      │
└──────────────┘      └──────────────────┘
```

### 架构特点
- 前后端分离，通过 RESTful API 通信
- 移动端优先的响应式设计
- 无状态后端，JWT 认证
- 外部 AI 服务集成（通义千问/DashScope）

## 2. 技术选型

| 层级 | 技术 | 选型理由 |
|------|------|---------|
| 前端框架 | React 18 | 组件化开发，生态丰富 |
| 构建工具 | Vite | 极速 HMR，开发体验好 |
| UI 组件库 | Ant Design Mobile | 移动端专用，组件丰富 |
| 路由 | React Router v6 | 声明式路由，嵌套路由支持 |
| HTTP 客户端 | Axios | 拦截器机制，请求/响应统一处理 |
| 日期处理 | Day.js | 轻量级，API 兼容 Moment.js |
| 图表 | Recharts | React 原生图表库 |
| 后端框架 | Express | 轻量灵活，中间件生态丰富 |
| 数据库 | MySQL 8.0 | 事务支持，数据一致性保障 |
| 数据库驱动 | mysql2 | Promise 支持，连接池 |
| 认证 | JWT (jsonwebtoken) | 无状态认证，适合前后端分离 |
| 密码加密 | bcryptjs | 安全的密码哈希算法 |
| 文件上传 | Multer | Express 文件上传中间件 |

## 3. 前端架构

### 3.1 目录结构
```
frontend/src/
├── api/              # API 调用层（按领域划分）
│   ├── auth.js       # 认证相关
│   ├── user.js       # 用户信息
│   ├── accountBook.js # 账本管理
│   ├── transaction.js # 交易管理
│   ├── participant.js # 参与人
│   ├── splitBill.js  # 分账
│   └── exchangeRate.js # 汇率
├── components/       # 可复用组件
│   ├── AccountBookForm.jsx  # 账本表单
│   ├── AccountBookSettings.jsx # 账本设置
│   ├── ExchangeRateManager.jsx # 汇率管理
│   ├── ParticipantManager.jsx  # 成员管理
│   └── TransactionDetail.jsx   # 交易详情
├── pages/            # 页面组件
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── AccountBookList.jsx
│   ├── AccountBookDetail.jsx
│   ├── TransactionForm.jsx
│   ├── SplitBill.jsx
│   └── Profile.jsx
├── utils/
│   └── request.js    # Axios 实例（拦截器）
├── App.jsx           # 路由配置
└── main.jsx          # 入口
```

### 3.2 状态管理
- 使用 React 内置 useState/useEffect 管理组件状态
- 无全局状态管理库（项目规模适中）
- Token 存储在 localStorage

### 3.3 请求层设计
```javascript
// utils/request.js - Axios 拦截器
// 请求拦截：自动附加 Authorization header
// 响应拦截：统一错误处理，401 自动跳转登录
```

### 3.4 路由设计
| 路径 | 页面 | 说明 |
|------|------|------|
| `/login` | Login | 登录 |
| `/register` | Register | 注册 |
| `/` | AccountBookList | 账本列表（首页） |
| `/account-books/:id` | AccountBookDetail | 账本详情 |
| `/account-books/:id/add` | TransactionForm | 新增交易 |
| `/account-books/:id/edit/:txId` | TransactionForm | 编辑交易 |
| `/account-books/:id/split` | SplitBill | 分账 |
| `/profile` | Profile | 个人中心 |

## 4. 后端架构

### 4.1 目录结构
```
backend/src/
├── controllers/      # 控制器（业务逻辑）
├── middleware/       # 中间件
│   └── auth.js       # JWT 认证中间件
├── routes/
│   └── index.js      # 路由注册中心
├── config/
│   └── database.js   # MySQL 连接池配置
├── utils/
│   └── response.js   # 统一响应工具
└── app.js            # Express 应用入口
```

### 4.2 控制器设计
采用类单例模式，每个控制器负责一个领域：

```javascript
class TransactionController {
  async create(req, res) { /* ... */ }
  async getList(req, res) { /* ... */ }
  async getDetail(req, res) { /* ... */ }
  async update(req, res) { /* ... */ }
  async delete(req, res) { /* ... */ }
}
module.exports = new TransactionController();
```

### 4.3 中间件链
```
请求 → CORS → JSON解析 → 静态文件 → 路由匹配 → [JWT认证] → 控制器 → 响应
```

### 4.4 统一响应格式
```javascript
// 成功
ResponseUtil.success(res, data, '操作成功');
// { code: 200, message: '操作成功', data: {...} }

// 失败
ResponseUtil.error(res, '错误信息', 400);
// { code: 400, message: '错误信息', data: null }
```

## 5. 数据库设计

### 5.1 ER 关系描述

```
users (用户)
  │
  ├── 1:N ──→ account_books (账本)
  │               │
  │               ├── 1:N ──→ exchange_rates (汇率)
  │               │
  │               ├── 1:N ──→ participants (参与人)
  │               │               │
  │               │               └── M:N ──→ transactions (通过 transaction_participants)
  │               │
  │               └── 1:N ──→ transactions (交易)
  │                               │
  │                               └── N:1 ──→ participants (付款人)

  └── 1:N ──→ verification_codes (验证码)
```

### 5.2 核心表说明

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| users | 用户账号 | email, phone, password, nickname, default_currency |
| account_books | 旅行账本 | user_id, name, destination, start_date, end_date, budget, is_archived |
| exchange_rates | 汇率配置 | account_book_id, currency, rate |
| participants | 参与人 | account_book_id, user_id, name, email, is_settled |
| transactions | 交易记录 | account_book_id, amount, currency, local_amount, type, payer_id, created_by |
| transaction_participants | 交易参与人关联 | transaction_id, participant_id |
| verification_codes | 验证码 | account, code, type, expires_at |

### 5.3 索引策略
- 主键自增索引
- 外键索引（user_id, account_book_id 等）
- 唯一索引（email, phone, book+currency 组合）
- 时间索引（created_at, transaction_time）

## 6. API 设计原则

### 6.1 RESTful 规范
- 资源用名词复数：`/account-books`, `/transactions`
- HTTP 方法语义化：GET 查询、POST 创建、PUT 更新、DELETE 删除
- 嵌套资源表达归属：`/account-books/:bookId/transactions`

### 6.2 认证
- 公开接口：注册、登录、发送验证码、重置密码、邮箱直接重置密码
- 受保护接口：其余所有接口需要 JWT Token

### 6.3 分页
```
GET /account-books?page=1&pageSize=10&search=关键词
```

### 6.4 错误处理
- 统一错误码（200/400/401/403/404/500）
- 中文错误消息，前端可直接展示

## 7. 认证方案

### 7.1 流程
```
注册/登录 → 服务端生成 JWT → 返回 Token → 客户端存储 localStorage
                                              ↓
后续请求 → Authorization: Bearer <token> → 中间件验证 → 通过/拒绝
```

### 7.2 Token 结构
```javascript
{
  userId: 1,        // 用户ID
  iat: 1234567890,  // 签发时间
  exp: 1234654290   // 过期时间
}
```

### 7.3 安全措施
- 密码使用 bcryptjs 加盐哈希（salt rounds: 10）
- Token 有效期可配置（默认 7 天）
- 前端 401 响应自动清除 Token 并跳转登录

## 8. 文件上传方案

### 8.1 配置
- 使用 Multer 中间件处理 multipart/form-data
- 存储路径：`backend/uploads/`
- 文件大小限制：10MB
- 允许格式：jpeg, jpg, png, gif, webp

### 8.2 文件命名
```
{type}-{timestamp}-{random}.{ext}
// 示例: avatar-1709123456789-123456789.jpg
// 示例: cover-1709123456789-987654321.png
```

### 8.3 访问方式
- 静态文件通过 Express 静态中间件提供
- 访问 URL：`http://host:3000/uploads/filename.jpg`
- 数据库存储相对路径或完整 URL

### 8.4 使用场景
| 场景 | 字段名 | 用途 |
|------|--------|------|
| 用户头像 | avatar | 个人中心上传 |
| 账本封面 | cover | 账本自定义封面 |
| AI 图片记账 | imageBase64 | Base64 传输，不落盘 |



## 10. UI 主题设计

### 10.1 配色方案
| 用途 | 色值 | 说明 |
|------|------|------|
| 页面背景 | #E8F5C8 / #F2F8E0 | 浅绿色，清新自然 |
| 头部/卡片 | #1A1A2E | 深色，提供对比度 |
| 强调色/按钮 | #C8E64E | 黄绿色，活力醒目 |
| 文字主色 | #FFFFFF（深色背景上） | 白色文字 |
| 文字辅色 | #333333（浅色背景上） | 深色文字 |

### 10.2 登录页设计
- 自定义 SVG Logo
- 胶囊形（pill）输入框
- 底部弹窗式忘记密码

### 10.3 预算展示
- 预算按人均展示：总预算 ÷ 成员人数
- 进度条显示当前用户实际消费占人均预算的比例
- 超出预算时进度条变色提醒

## 11. 权限设计

### 11.1 交易编辑权限
- 账本所有成员（通过 participants 表关联了 user_id 的用户）均可编辑和删除该账本下的交易
- 不再限制为仅账本创建者或交易创建者可操作
- 封存账本的只读限制优先级高于成员编辑权限
