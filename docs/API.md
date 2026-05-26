# API 接口文档

## 基础信息
- Base URL: `http://localhost:3000/api`
- 认证方式: JWT Token (Header: `Authorization: Bearer <token>`)
- 响应格式: JSON

## 通用响应格式

### 成功响应
```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

### 错误响应
```json
{
  "code": 400,
  "message": "错误信息",
  "data": null
}
```

## 1. 用户认证模块

### 1.1 注册
- **POST** `/auth/register`
- **Body**:
```json
{
  "email": "user@example.com",
  "phone": "13800138000",
  "password": "password123",
  "nickname": "用户昵称"
}
```
- **Response**:
```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "userId": 1,
    "token": "jwt_token_string"
  }
}
```

### 1.2 登录
- **POST** `/auth/login`
- **Body**:
```json
{
  "account": "user@example.com",
  "password": "password123"
}
```
- **Response**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "userId": 1,
    "nickname": "用户昵称",
    "avatar": "avatar_url",
    "token": "jwt_token_string"
  }
}
```

### 1.3 发送验证码
- **POST** `/auth/send-code`
- **Body**:
```json
{
  "account": "user@example.com",
  "type": "email"
}
```

### 1.4 重置密码
- **POST** `/auth/reset-password`
- **Body**:
```json
{
  "account": "user@example.com",
  "code": "123456",
  "newPassword": "newpassword123"
}
```

### 1.5 邮箱直接重置密码
- **POST** `/auth/reset-password-direct`
- **说明**: 通过邮箱直接重置密码，无需验证码
- **Body**:
```json
{
  "email": "user@example.com",
  "newPassword": "newpassword123"
}
```
- **Response**:
```json
{
  "code": 200,
  "message": "密码重置成功",
  "data": null
}
```
- **错误场景**:
  - 邮箱未注册：400
  - 密码长度不足6位：400

## 2. 用户信息模块

### 2.1 获取个人信息
- **GET** `/user/profile`
- **Response**:
```json
{
  "code": 200,
  "data": {
    "userId": 1,
    "nickname": "用户昵称",
    "avatar": "avatar_url",
    "email": "user@example.com",
    "phone": "13800138000",
    "defaultCurrency": "CNY",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "accountBookCount": 5
  }
}
```

### 2.2 更新个人信息
- **PUT** `/user/profile`
- **Body**:
```json
{
  "nickname": "新昵称",
  "defaultCurrency": "USD"
}
```

### 2.3 上传头像
- **POST** `/user/avatar`
- **Content-Type**: `multipart/form-data`
- **Body**: `avatar` (file)
- **Response**:
```json
{
  "code": 200,
  "data": {
    "avatarUrl": "http://localhost:3000/uploads/avatar_xxx.jpg"
  }
}
```

## 3. 账本管理模块

### 3.1 创建账本
- **POST** `/account-books`
- **Body**:
```json
{
  "name": "日本旅行",
  "destination": "东京",
  "startDate": "2026-03-01",
  "endDate": "2026-03-07",
  "remark": "春季赏樱之旅"
}
```

### 3.2 获取账本列表
- **GET** `/account-books?search=日本&page=1&pageSize=10`
- **Response**:
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "name": "日本旅行",
        "destination": "东京",
        "startDate": "2026-03-01",
        "endDate": "2026-03-07",
        "remark": "春季赏樱之旅",
        "isArchived": false,
        "totalExpense": 15000.00,
        "createdAt": "2026-02-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

### 3.3 获取账本详情
- **GET** `/account-books/:id`
- **Response**:
```json
{
  "code": 200,
  "data": {
    "id": 1,
    "name": "日本旅行",
    "destination": "东京",
    "startDate": "2026-03-01",
    "endDate": "2026-03-07",
    "remark": "春季赏樱之旅",
    "isArchived": false,
    "totalExpense": 15000.00,
    "personalExpense": 8000.00,
    "sharedExpense": 7000.00,
    "currencyBreakdown": [
      { "currency": "JPY", "amount": 150000 },
      { "currency": "CNY", "amount": 5000 }
    ],
    "createdAt": "2026-02-01T00:00:00.000Z"
  }
}
```

### 3.4 更新账本
- **PUT** `/account-books/:id`
- **Body**:
```json
{
  "name": "日本东京旅行",
  "destination": "东京、大阪",
  "startDate": "2026-03-01",
  "endDate": "2026-03-10",
  "remark": "更新后的备注"
}
```

### 3.5 删除账本
- **DELETE** `/account-books/:id`

### 3.6 封存/解封账本
- **PUT** `/account-books/:id/archive`
- **Body**:
```json
{
  "isArchived": true
}
```

## 4. 汇率管理模块

### 4.1 获取账本汇率列表
- **GET** `/account-books/:bookId/exchange-rates`
- **Response**:
```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "currency": "JPY",
      "rate": 0.052,
      "updatedAt": "2026-03-01T00:00:00.000Z"
    }
  ]
}
```

### 4.2 设置/更新汇率
- **POST** `/account-books/:bookId/exchange-rates`
- **Body**:
```json
{
  "currency": "JPY",
  "rate": 0.052
}
```

## 5. 账单管理模块

### 5.1 创建账单
- **POST** `/account-books/:bookId/transactions`
- **Body**:
```json
{
  "amount": 5000,
  "currency": "JPY",
  "category": "餐饮",
  "transactionTime": "2026-03-02T12:00:00.000Z",
  "location": "新宿",
  "remark": "午餐",
  "type": "shared",
  "payerId": 1,
  "participantIds": [1, 2, 3]
}
```

### 5.2 获取账单列表
- **GET** `/account-books/:bookId/transactions?type=shared&page=1&pageSize=20`
- **Response**:
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "amount": 5000,
        "currency": "JPY",
        "localAmount": 260.00,
        "category": "餐饮",
        "transactionTime": "2026-03-02T12:00:00.000Z",
        "location": "新宿",
        "remark": "午餐",
        "type": "shared",
        "payerName": "张三",
        "participants": ["张三", "李四", "王五"],
        "createdAt": "2026-03-02T12:05:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### 5.3 更新账单
- **PUT** `/transactions/:id`
- **Body**: 同创建账单

### 5.4 删除账单
- **DELETE** `/transactions/:id`

## 6. 参与人管理模块

### 6.1 添加参与人
- **POST** `/account-books/:bookId/participants`
- **Body**:
```json
{
  "name": "张三",
  "remark": "朋友"
}
```

### 6.2 获取参与人列表
- **GET** `/account-books/:bookId/participants`
- **Response**:
```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "name": "张三",
      "remark": "朋友",
      "createdAt": "2026-02-01T00:00:00.000Z"
    }
  ]
}
```

### 6.3 更新参与人
- **PUT** `/participants/:id`
- **Body**:
```json
{
  "name": "张三",
  "remark": "好友"
}
```

### 6.4 删除参与人
- **DELETE** `/participants/:id`

## 7. 分账管理模块

### 7.1 计算分账
- **GET** `/account-books/:bookId/split-bills/calculate`
- **Response**:
```json
{
  "code": 200,
  "data": {
    "participants": [
      {
        "participantId": 1,
        "participantName": "张三",
        "shouldPay": 2333.33,
        "actualPaid": 5000.00,
        "balance": 2666.67
      }
    ],
    "totalSharedExpense": 7000.00
  }
}
```

### 7.2 获取个人分账视图
- **GET** `/account-books/:bookId/split-bills/personal`
- **Response**:
```json
{
  "code": 200,
  "data": {
    "shouldPay": 2333.33,
    "actualPaid": 5000.00,
    "balance": 2666.67,
    "relatedTransactions": [
      {
        "id": 1,
        "amount": 5000,
        "category": "餐饮",
        "transactionTime": "2026-03-02T12:00:00.000Z"
      }
    ]
  }
}
```

### 8.1 AI 智能记账（文字/图片解析）
- **POST** `/account-books/:bookId/ai/parse`
- **认证**: 需要 JWT Token
- **Body**:
```json
{
  "text": "午餐花了80",
  "imageBase64": "base64_encoded_image（可选）"
}
```
- **Response**:
```json
{
  "code": 200,
  "data": {
    "amount": 80,
    "currency": "CNY",
    "category": "餐饮",
    "subCategory": "午餐",
    "remark": "午餐",
    "location": "",
    "type": "personal",
    "payerId": null,
    "participantIds": [],
    "payerName": "",
    "participantNames": [],
    "aiRawText": "AI原始返回文本"
  }
}
```
- **说明**: 文字模式使用 qwen-turbo，图片模式使用 qwen-vl-plus

## 错误码说明
- 200: 成功
- 400: 请求参数错误
- 401: 未授权（未登录或 token 失效）
- 403: 禁止访问（权限不足）
- 404: 资源不存在
- 500: 服务器内部错误
