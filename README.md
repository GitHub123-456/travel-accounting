# 旅行记账系统 v1.0

## 项目简介
移动端旅行记账应用，支持多账本管理、多币种汇率换算、多人分账等功能。

## 技术栈

### 前端
- React 18
- React Router v6
- Axios
- Ant Design Mobile
- Vite

### 后端
- Node.js 18+
- Express
- MySQL 8.0
- JWT 认证
- Multer (文件上传)

## 快速开始

### 环境要求
- Node.js >= 18.0.0
- MySQL >= 8.0
- npm >= 9.0.0

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd travel-accounting
```

2. 安装依赖
```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

3. 配置数据库
```bash
# 创建数据库
mysql -u root -p
CREATE DATABASE travel_accounting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 导入数据库结构
mysql -u root -p travel_accounting < backend/database/schema.sql
```

4. 配置环境变量
```bash
# 后端配置
cd backend
cp .env.example .env
# 编辑 .env 文件，填入数据库配置
```

5. 启动服务
```bash
# 启动后端 (端口 3000)
cd backend
npm run dev

# 启动前端 (端口 5173)
cd frontend
npm run dev
```

6. 访问应用
打开浏览器访问: http://localhost:5173

## 项目结构
```
travel-accounting/
├── frontend/          # 前端项目
│   ├── src/
│   │   ├── api/      # API 接口
│   │   ├── components/ # 组件
│   │   ├── pages/    # 页面
│   │   ├── utils/    # 工具函数
│   │   └── App.jsx
│   └── package.json
├── backend/          # 后端项目
│   ├── src/
│   │   ├── controllers/ # 控制器
│   │   ├── models/   # 数据模型
│   │   ├── routes/   # 路由
│   │   ├── middleware/ # 中间件
│   │   └── utils/    # 工具函数
│   ├── database/     # 数据库脚本
│   └── package.json
└── docs/            # 文档
```

## 功能模块

### v1.0 功能清单
- ✅ 用户注册/登录（手机号/邮箱）
- ✅ 个人资料管理
- ✅ 账本 CRUD
- ✅ 账本封存/解封
- ✅ 多币种汇率管理
- ✅ 账单记录与管理
- ✅ 多人分账功能
- ✅ 分账核算

## API 文档
详见 `docs/API.md`

## 数据库设计
详见 `docs/DATABASE.md`

## 开发规范
详见 `docs/DEVELOPMENT.md`
