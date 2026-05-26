# 数据库设置指南

## 问题诊断
当前登录失败的原因：MySQL数据库连接被拒绝（ECONNREFUSED）

## 解决方案

### 方案1：使用XAMPP（推荐，最简单）

1. **下载并安装XAMPP**
   - 访问：https://www.apachefriends.org/
   - 下载Windows版本
   - 安装时确保选择MySQL组件

2. **启动MySQL服务**
   - 打开XAMPP Control Panel
   - 点击MySQL旁边的"Start"按钮
   - 确认MySQL显示为绿色运行状态

3. **创建数据库**
   - 在XAMPP Control Panel中，点击MySQL的"Admin"按钮（会打开phpMyAdmin）
   - 或者直接访问：http://localhost/phpmyadmin
   - 点击"新建"创建数据库
   - 数据库名：`travel_accounting`
   - 字符集：`utf8mb4_unicode_ci`
   - 点击"创建"

4. **导入数据库结构**
   - 在phpMyAdmin中选择刚创建的`travel_accounting`数据库
   - 点击顶部的"导入"标签
   - 点击"选择文件"，选择项目中的文件：
     `backend/database/schema.sql`
   - 点击"执行"按钮

5. **更新.env配置**（如果XAMPP的MySQL没有密码）
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=travel_accounting
   ```

### 方案2：安装独立MySQL

1. **下载MySQL**
   - 访问：https://dev.mysql.com/downloads/mysql/
   - 选择Windows版本
   - 下载MySQL Installer

2. **安装MySQL**
   - 运行安装程序
   - 选择"Developer Default"或"Server only"
   - 设置root密码（记住这个密码！）
   - 完成安装

3. **启动MySQL服务**
   ```powershell
   # 以管理员身份运行PowerShell
   Start-Service MySQL80
   ```

4. **创建数据库**
   ```bash
   # 打开命令行，进入MySQL安装目录的bin文件夹
   cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
   
   # 登录MySQL（输入你设置的密码）
   .\mysql.exe -u root -p
   
   # 在MySQL命令行中执行：
   CREATE DATABASE travel_accounting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   exit;
   ```

5. **导入数据库结构**
   ```bash
   # 在命令行中执行（替换路径为你的项目路径）
   .\mysql.exe -u root -p travel_accounting < D:\software2\result\travel\backend\database\schema.sql
   ```

6. **更新.env配置**
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=你设置的密码
   DB_NAME=travel_accounting
   ```

## 验证数据库连接

完成上述步骤后：

1. **重启后端服务**
   - 在终端中按 `Ctrl+C` 停止后端
   - 重新运行：`npm run dev`

2. **测试登录**
   - 先尝试注册一个新账号
   - 然后使用新账号登录

## 常见问题

### Q: MySQL服务无法启动
A: 检查端口3306是否被占用，或者查看MySQL错误日志

### Q: 导入SQL文件失败
A: 确保数据库字符集为utf8mb4，或者在phpMyAdmin中手动复制粘贴SQL内容执行

### Q: 连接被拒绝
A: 
- 确认MySQL服务正在运行
- 检查.env中的数据库配置是否正确
- 确认防火墙没有阻止3306端口

## 快速检查清单

- [ ] MySQL已安装
- [ ] MySQL服务正在运行
- [ ] 数据库`travel_accounting`已创建
- [ ] 数据库表结构已导入
- [ ] .env配置正确（特别是密码）
- [ ] 后端服务已重启

完成这些步骤后，登录功能应该就能正常工作了！
