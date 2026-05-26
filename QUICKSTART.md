# 快速开始指南

## 前置要求
- Node.js >= 18.0.0
- MySQL >= 8.0
- npm >= 9.0.0

## 5分钟快速启动

### 1. 安装依赖（2分钟）

```bash
# 克隆项目后，安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2. 配置数据库（1分钟）

```bash
# 登录 MySQL
mysql -u root -p

# 执行以下 SQL
CREATE DATABASE travel_accounting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE travel_accounting;
SOURCE backend/database/schema.sql;
```

### 3. 配置环境变量（30秒）

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，修改数据库密码：
```
DB_PASSWORD=your_mysql_password
```

### 4. 启动服务（1分钟）

打开两个终端窗口：

终端1 - 启动后端：
```bash
cd backend
npm run dev
```

终端2 - 启动前端：
```bash
cd frontend
npm run dev
```

### 5. 访问应用

打开浏览器访问：http://localhost:5173

## 测试账号

首次使用需要注册账号，或使用以下测试流程：

1. 点击"注册账号"
2. 填写信息：
   - 昵称：测试用户
   - 邮箱：test@example.com
   - 密码：123456
3. 注册成功后自动登录

## 功能演示流程

### 创建第一个账本
1. 点击右下角"+"按钮
2. 填写账本信息：
   - 旅行名称：日本之旅
   - 目的地：东京
   - 开始日期：2026-03-01
   - 结束日期：2026-03-07
3. 点击"创建"

### 添加参与人（用于分账）
1. 进入账本详情
2. 点击"参与人管理"
3. 添加参与人：
   - 姓名：张三
   - 备注：朋友

### 设置汇率
1. 进入账本详情
2. 点击"汇率设置"
3. 设置日元汇率：
   - 币种：JPY
   - 汇率：0.052（1日元=0.052人民币）

### 记一笔账
1. 点击"记一笔"按钮
2. 填写账单信息：
   - 账单类型：共同账单
   - 金额：5000
   - 币种：JPY
   - 分类：餐饮
   - 地点：新宿
   - 付款人：张三
   - 参与人：勾选所有人
3. 保存

### 查看分账
1. 点击"分账核算"按钮
2. 查看每个人的应付、已付、余额

## 常见问题

### Q: 数据库连接失败
A: 检查 .env 文件中的数据库配置是否正确，确保 MySQL 服务已启动。

### Q: 前端无法访问后端接口
A: 确保后端服务运行在 3000 端口，前端会自动代理到后端。

### Q: 验证码功能不可用
A: 当前版本验证码仅在控制台输出，未实现真实发送功能。

### Q: 文件上传失败
A: 确保 backend/uploads 目录存在且有写入权限。

## 项目结构说明

```
travel-accounting/
├── frontend/          # 前端项目（React + Vite）
│   ├── src/
│   │   ├── api/      # API 接口
│   │   ├── pages/    # 页面组件
│   │   └── utils/    # 工具函数
│   └── package.json
│
├── backend/          # 后端项目（Node.js + Express）
│   ├── src/
│   │   ├── controllers/  # 业务逻辑
│   │   ├── routes/       # 路由定义
│   │   └── middleware/   # 中间件
│   ├── database/     # 数据库脚本
│   └── package.json
│
└── docs/            # 文档
    ├── API.md       # API 接口文档
    ├── DATABASE.md  # 数据库设计文档
    └── DEVELOPMENT.md  # 开发指南
```

## 下一步

- 查看 [API 文档](docs/API.md) 了解接口详情
- 查看 [数据库文档](docs/DATABASE.md) 了解数据结构
- 查看 [开发指南](docs/DEVELOPMENT.md) 了解开发规范

## 技术支持

如遇到问题，请检查：
1. Node.js 版本是否 >= 18
2. MySQL 版本是否 >= 8.0
3. 端口 3000 和 5173 是否被占用
4. 数据库配置是否正确

## 功能清单

v1.0 已实现功能：
- ✅ 用户注册/登录
- ✅ 个人资料管理
- ✅ 账本 CRUD
- ✅ 账本封存/解封
- ✅ 多币种汇率管理
- ✅ 账单记录（个人/共同）
- ✅ 账单编辑/删除
- ✅ 参与人管理
- ✅ 分账自动核算
- ✅ 个人分账视图

## 开发模式

后端使用 nodemon 自动重启：
```bash
cd backend
npm run dev  # 修改代码后自动重启
```

前端使用 Vite HMR：
```bash
cd frontend
npm run dev  # 修改代码后自动热更新
```

## 生产部署

```bash
# 构建前端
cd frontend
npm run build

# 启动后端
cd backend
npm start
```

建议使用 PM2 管理后端进程：
```bash
npm install -g pm2
pm2 start backend/src/app.js --name travel-accounting
```
