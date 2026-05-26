# 安装部署指南

## 系统要求

### 必需软件
- Node.js >= 18.0.0
- MySQL >= 8.0
- npm >= 9.0.0

### 推荐配置
- 操作系统：Windows 10/11, macOS 10.15+, Ubuntu 20.04+
- 内存：4GB+
- 磁盘空间：1GB+

## 详细安装步骤

### 步骤 1: 安装 Node.js

#### Windows
1. 访问 https://nodejs.org/
2. 下载 LTS 版本（18.x 或更高）
3. 运行安装程序，按默认选项安装
4. 验证安装：
```bash
node --version  # 应显示 v18.x.x
npm --version   # 应显示 9.x.x
```

#### macOS
```bash
# 使用 Homebrew
brew install node@18

# 验证安装
node --version
npm --version
```

#### Linux (Ubuntu/Debian)
```bash
# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### 步骤 2: 安装 MySQL

#### Windows
1. 访问 https://dev.mysql.com/downloads/mysql/
2. 下载 MySQL Installer
3. 运行安装程序
4. 选择 "Developer Default" 安装类型
5. 设置 root 密码（记住这个密码）
6. 完成安装

#### macOS
```bash
# 使用 Homebrew
brew install mysql@8.0

# 启动 MySQL
brew services start mysql@8.0

# 设置 root 密码
mysql_secure_installation
```

#### Linux (Ubuntu/Debian)
```bash
# 安装 MySQL
sudo apt update
sudo apt install mysql-server

# 启动 MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# 设置 root 密码
sudo mysql_secure_installation
```

### 步骤 3: 获取项目代码

```bash
# 如果使用 Git
git clone <repository-url>
cd travel-accounting

# 或者直接下载 ZIP 并解压
```

### 步骤 4: 安装项目依赖

```bash
# 安装后端依赖
cd backend
npm install

# 如果遇到网络问题，可以使用国内镜像
npm install --registry=https://registry.npmmirror.com

# 安装前端依赖
cd ../frontend
npm install
```

### 步骤 5: 创建数据库

```bash
# 登录 MySQL（Windows）
mysql -u root -p
# 输入之前设置的 root 密码

# 或者使用 MySQL Workbench 图形界面
```

在 MySQL 中执行：
```sql
-- 创建数据库
CREATE DATABASE travel_accounting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE travel_accounting;

-- 导入表结构
SOURCE /path/to/backend/database/schema.sql;
-- 注意：将 /path/to/ 替换为实际路径

-- 验证表是否创建成功
SHOW TABLES;
-- 应该看到 7 个表
```

### 步骤 6: 配置环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件（使用记事本或任何文本编辑器）：
```env
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置（重要：修改这里）
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password  # 改为你的 MySQL 密码
DB_NAME=travel_accounting

# JWT 配置（生产环境请修改）
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRES_IN=7d

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# 验证码配置
VERIFICATION_CODE_EXPIRES=600
```

### 步骤 7: 创建上传目录

```bash
# 在 backend 目录下
mkdir uploads
# 或者 Windows 下
md uploads
```

### 步骤 8: 启动服务

#### 开发模式（推荐用于测试）

打开两个终端窗口：

终端 1 - 启动后端：
```bash
cd backend
npm run dev
```

看到以下输出表示成功：
```
服务器运行在 http://localhost:3000
环境: development
```

终端 2 - 启动前端：
```bash
cd frontend
npm run dev
```

看到以下输出表示成功：
```
VITE v5.0.8  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 步骤 9: 访问应用

打开浏览器访问：http://localhost:5173

首次使用需要注册账号。

## 生产环境部署

### 前端部署

```bash
# 构建前端
cd frontend
npm run build

# 构建完成后，dist 目录包含所有静态文件
# 将 dist 目录部署到 Web 服务器（Nginx/Apache）
```

Nginx 配置示例：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/frontend/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 后端部署

#### 使用 PM2（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
cd backend
pm2 start src/app.js --name travel-accounting

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs travel-accounting

# 重启应用
pm2 restart travel-accounting

# 停止应用
pm2 stop travel-accounting
```

#### 使用 systemd（Linux）

创建服务文件 `/etc/systemd/system/travel-accounting.service`：
```ini
[Unit]
Description=Travel Accounting Backend
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/backend
ExecStart=/usr/bin/node src/app.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl start travel-accounting
sudo systemctl enable travel-accounting
sudo systemctl status travel-accounting
```

## 常见问题排查

### 问题 1: 数据库连接失败

错误信息：`Error: connect ECONNREFUSED`

解决方案：
1. 检查 MySQL 是否运行：
```bash
# Windows
services.msc  # 查找 MySQL 服务

# macOS/Linux
sudo systemctl status mysql
```

2. 检查 .env 文件中的数据库配置
3. 测试数据库连接：
```bash
mysql -u root -p -h localhost
```

### 问题 2: 端口被占用

错误信息：`Error: listen EADDRINUSE: address already in use :::3000`

解决方案：
```bash
# Windows - 查找占用端口的进程
netstat -ano | findstr :3000
taskkill /PID <进程ID> /F

# macOS/Linux
lsof -i :3000
kill -9 <进程ID>

# 或者修改 .env 中的 PORT 配置
```

### 问题 3: npm install 失败

解决方案：
```bash
# 清除缓存
npm cache clean --force

# 使用国内镜像
npm install --registry=https://registry.npmmirror.com

# 或者使用 cnpm
npm install -g cnpm --registry=https://registry.npmmirror.com
cnpm install
```

### 问题 4: 前端无法访问后端

解决方案：
1. 确保后端运行在 3000 端口
2. 检查 vite.config.js 中的 proxy 配置
3. 清除浏览器缓存
4. 检查防火墙设置

### 问题 5: 文件上传失败

解决方案：
1. 确保 backend/uploads 目录存在
2. 检查目录权限：
```bash
# Linux/macOS
chmod 755 backend/uploads

# Windows - 右键目录 -> 属性 -> 安全 -> 编辑权限
```

## 数据备份

### 备份数据库

```bash
# 完整备份
mysqldump -u root -p travel_accounting > backup_$(date +%Y%m%d).sql

# 仅备份结构
mysqldump -u root -p --no-data travel_accounting > schema_backup.sql

# 仅备份数据
mysqldump -u root -p --no-create-info travel_accounting > data_backup.sql
```

### 恢复数据库

```bash
mysql -u root -p travel_accounting < backup_20260311.sql
```

### 备份上传文件

```bash
# 压缩上传目录
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz backend/uploads/

# Windows 使用 7-Zip 或 WinRAR 压缩
```

## 性能优化建议

### 数据库优化
1. 定期清理过期验证码
2. 为常用查询添加索引
3. 定期优化表
```sql
OPTIMIZE TABLE users, account_books, transactions;
```

### 应用优化
1. 启用 gzip 压缩
2. 使用 CDN 加速静态资源
3. 配置缓存策略
4. 使用 Redis 缓存热点数据

## 安全建议

1. 修改默认 JWT_SECRET
2. 使用 HTTPS
3. 定期更新依赖包
4. 限制文件上传大小和类型
5. 配置防火墙规则
6. 定期备份数据

## 监控和日志

### 应用日志
```bash
# PM2 日志
pm2 logs travel-accounting

# 自定义日志位置
# 在 backend/src/app.js 中配置
```

### 数据库日志
```bash
# MySQL 错误日志
# Windows: C:\ProgramData\MySQL\MySQL Server 8.0\Data\*.err
# Linux: /var/log/mysql/error.log
```

## 升级指南

### 升级依赖
```bash
# 检查过期包
npm outdated

# 更新所有包
npm update

# 更新特定包
npm install package-name@latest
```

### 数据库迁移
```bash
# 备份现有数据
mysqldump -u root -p travel_accounting > backup_before_upgrade.sql

# 执行迁移脚本
mysql -u root -p travel_accounting < migration_v1.1.sql
```

## 卸载

```bash
# 停止服务
pm2 stop travel-accounting
pm2 delete travel-accounting

# 删除数据库
mysql -u root -p
DROP DATABASE travel_accounting;

# 删除项目文件
rm -rf /path/to/travel-accounting

# 卸载全局包（可选）
npm uninstall -g pm2
```

## 获取帮助

- 查看项目文档：[README.md](README.md)
- API 文档：[docs/API.md](docs/API.md)
- 开发指南：[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- 快速开始：[QUICKSTART.md](QUICKSTART.md)

## 技术支持清单

安装前请确认：
- [ ] Node.js 版本 >= 18
- [ ] MySQL 版本 >= 8.0
- [ ] 端口 3000 和 5173 可用
- [ ] 有足够的磁盘空间（1GB+）
- [ ] 网络连接正常

安装后请验证：
- [ ] 后端服务启动成功
- [ ] 前端服务启动成功
- [ ] 数据库连接正常
- [ ] 可以注册新用户
- [ ] 可以创建账本
- [ ] 可以记录账单
