# 日期格式修复

## 问题
后端报错：`Incorrect datetime value: '2026-03-11T03:17:06.508Z' for column 'transaction_time'`

## 原因
MySQL 的 TIMESTAMP 类型不接受 ISO 8601 格式的日期时间字符串（如 `2026-03-11T03:17:06.508Z`）。

MySQL 需要的格式是：`YYYY-MM-DD HH:mm:ss`

## 解决方案
将前端发送的日期格式从 ISO 8601 改为 MySQL 标准格式。

### 修改前
```javascript
transactionTime: dayjs(values.date).toISOString()
// 输出: '2026-03-11T03:17:06.508Z'
```

### 修改后
```javascript
transactionTime: dayjs(values.date).format('YYYY-MM-DD HH:mm:ss')
// 输出: '2026-03-11 03:17:06'
```

## 修改的文件
- `frontend/src/pages/TransactionForm.jsx`

## 测试步骤
1. 刷新浏览器页面
2. 点击记账按钮
3. 填写账单信息
4. 选择付款人和参与人（如果是共同账单）
5. 点击保存
6. 应该成功创建账单并跳转到账本详情页

## 相关信息
- MySQL TIMESTAMP 格式：`YYYY-MM-DD HH:mm:ss`
- MySQL DATETIME 格式：`YYYY-MM-DD HH:mm:ss`
- ISO 8601 格式：`YYYY-MM-DDTHH:mm:ss.sssZ`
- dayjs 格式化文档：https://day.js.org/docs/en/display/format
