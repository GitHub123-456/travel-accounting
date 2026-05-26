# 数据库设计文档

## 数据库概述
- 数据库名称: `travel_accounting`
- 字符集: `utf8mb4`
- 排序规则: `utf8mb4_unicode_ci`

## 数据表设计

### 1. 用户表 (users)
存储用户基本信息

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 用户ID |
| email | VARCHAR(100) | UNIQUE | 邮箱 |
| phone | VARCHAR(20) | UNIQUE | 手机号 |
| password | VARCHAR(255) | NOT NULL | 密码（加密） |
| nickname | VARCHAR(50) | NOT NULL | 昵称 |
| avatar | VARCHAR(255) | NULL | 头像URL |
| default_currency | VARCHAR(10) | DEFAULT 'CNY' | 默认本币 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**索引**:
- PRIMARY KEY (id)
- UNIQUE KEY (email)
- UNIQUE KEY (phone)

---

### 2. 账本表 (account_books)
存储旅行账本信息

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 账本ID |
| user_id | INT | NOT NULL, FK | 用户ID |
| name | VARCHAR(100) | NOT NULL | 旅行名称 |
| destination | VARCHAR(100) | NOT NULL | 目的地 |
| start_date | DATE | NOT NULL | 开始日期 |
| end_date | DATE | NOT NULL | 结束日期 |
| remark | TEXT | NULL | 备注 |
| budget | DECIMAL(12,2) | NULL | 预算金额 |
| is_archived | BOOLEAN | DEFAULT FALSE | 是否封存 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**索引**:
- PRIMARY KEY (id)
- INDEX idx_user_id (user_id)
- INDEX idx_created_at (created_at)
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

---

### 3. 汇率表 (exchange_rates)
存储账本的汇率设置

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 汇率ID |
| account_book_id | INT | NOT NULL, FK | 账本ID |
| currency | VARCHAR(10) | NOT NULL | 币种代码 |
| rate | DECIMAL(10,6) | NOT NULL | 汇率（1外币=多少本币） |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**索引**:
- PRIMARY KEY (id)
- UNIQUE KEY uk_book_currency (account_book_id, currency)
- FOREIGN KEY (account_book_id) REFERENCES account_books(id) ON DELETE CASCADE

---

### 4. 参与人表 (participants)
存储账本的分账参与人

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 参与人ID |
| account_book_id | INT | NOT NULL, FK | 账本ID |
| user_id | INT | NULL, FK | 关联用户ID |
| name | VARCHAR(50) | NOT NULL | 姓名 |
| email | VARCHAR(100) | NULL | 邮箱 |
| remark | VARCHAR(100) | NULL | 备注 |
| is_settled | BOOLEAN | DEFAULT FALSE | 是否已结清 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**索引**:
- PRIMARY KEY (id)
- INDEX idx_account_book_id (account_book_id)
- INDEX idx_user_id (user_id)
- FOREIGN KEY (account_book_id) REFERENCES account_books(id) ON DELETE CASCADE

---

### 5. 账单表 (transactions)
存储消费账单记录

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 账单ID |
| account_book_id | INT | NOT NULL, FK | 账本ID |
| amount | DECIMAL(12,2) | NOT NULL | 原币金额 |
| currency | VARCHAR(10) | NOT NULL | 币种 |
| local_amount | DECIMAL(12,2) | NOT NULL | 本币金额 |
| category | VARCHAR(20) | NOT NULL | 消费分类 |
| transaction_time | TIMESTAMP | NOT NULL | 消费时间 |
| location | VARCHAR(100) | NULL | 消费地点 |
| remark | TEXT | NULL | 备注 |
| type | ENUM('personal','shared') | NOT NULL | 账单类型 |
| payer_id | INT | NULL, FK | 付款人ID |
| created_by | INT | NULL | 创建者用户ID |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**索引**:
- PRIMARY KEY (id)
- INDEX idx_account_book_id (account_book_id)
- INDEX idx_transaction_time (transaction_time)
- INDEX idx_type (type)
- FOREIGN KEY (account_book_id) REFERENCES account_books(id) ON DELETE CASCADE
- FOREIGN KEY (payer_id) REFERENCES participants(id) ON DELETE SET NULL

---

### 6. 账单参与人关联表 (transaction_participants)
存储共同账单的参与人关系

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 关联ID |
| transaction_id | INT | NOT NULL, FK | 账单ID |
| participant_id | INT | NOT NULL, FK | 参与人ID |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引**:
- PRIMARY KEY (id)
- UNIQUE KEY uk_transaction_participant (transaction_id, participant_id)
- INDEX idx_participant_id (participant_id)
- FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
- FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE

---

### 7. 验证码表 (verification_codes)
存储验证码信息

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 验证码ID |
| account | VARCHAR(100) | NOT NULL | 账号（邮箱/手机） |
| code | VARCHAR(10) | NOT NULL | 验证码 |
| type | ENUM('email','phone') | NOT NULL | 类型 |
| expires_at | TIMESTAMP | NOT NULL | 过期时间 |
| is_used | BOOLEAN | DEFAULT FALSE | 是否已使用 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引**:
- PRIMARY KEY (id)
- INDEX idx_account_code (account, code)
- INDEX idx_expires_at (expires_at)

---

### 8. 旅行攻略表 (travel_guides)
存储 AI 生成的旅行攻略

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 攻略ID |
| user_id | INT | NOT NULL | 用户ID |
| account_book_id | INT | NULL | 关联账本ID |
| title | VARCHAR(200) | NOT NULL | 攻略标题 |
| city | VARCHAR(100) | NOT NULL | 目的地城市 |
| days | INT | NOT NULL, DEFAULT 3 | 旅行天数 |
| budget | INT | NULL | 预算金额 |
| travel_type | VARCHAR(50) | NULL | 出行类型 |
| guide_data | JSON | NOT NULL | 攻略详细数据（JSON） |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**索引**:
- PRIMARY KEY (id)

**guide_data JSON 结构**:
```json
{
  "title": "攻略标题",
  "summary": "概要",
  "dailyPlans": [
    {
      "day": 1,
      "theme": "主题",
      "schedule": [
        { "time": "上午", "activity": "活动", "location": "地点", "transport": "交通", "cost": 100, "category": "分类", "tips": "提示" }
      ],
      "dailyBudget": 500
    }
  ],
  "foodList": [{ "name": "店名", "location": "地点", "avgPrice": 80, "mustTry": "必点", "tips": "备注" }],
  "hotelTips": [{ "area": "区域", "priceRange": "价位", "reason": "理由" }],
  "warnings": ["提醒1", "提醒2"],
  "budgetSummary": { "accommodation": 0, "food": 0, "transport": 0, "tickets": 0, "shopping": 0, "other": 0, "total": 0 }
}
```

**说明**:
- 该表通过 `aiController.js` 中的 `ensureGuideTable()` 方法自动创建（如不存在）
- `account_book_id` 为可选字段，用于关联从攻略一键创建的账本
- 更新攻略时，如有关联账本，会自动同步账本的名称、预算、日期等信息

---

## 常用查询示例

### 1. 获取用户的所有账本（按创建时间倒序）
```sql
SELECT * FROM account_books 
WHERE user_id = ? 
ORDER BY created_at DESC;
```

### 2. 计算账本总支出
```sql
SELECT SUM(local_amount) as total_expense 
FROM transactions 
WHERE account_book_id = ?;
```

### 3. 获取账本的分账统计
```sql
SELECT 
  p.id,
  p.name,
  SUM(CASE WHEN t.payer_id = p.id THEN t.local_amount ELSE 0 END) as paid,
  COUNT(DISTINCT tp.transaction_id) as shared_count
FROM participants p
LEFT JOIN transactions t ON t.payer_id = p.id AND t.account_book_id = ?
LEFT JOIN transaction_participants tp ON tp.participant_id = p.id
WHERE p.account_book_id = ?
GROUP BY p.id;
```

### 4. 获取个人参与的共同账单
```sql
SELECT t.* 
FROM transactions t
INNER JOIN transaction_participants tp ON tp.transaction_id = t.id
WHERE tp.participant_id = ? AND t.type = 'shared'
ORDER BY t.transaction_time DESC;
```



## 数据迁移说明

### 初始化数据库
```bash
mysql -u root -p travel_accounting < backend/database/schema.sql
```

### 插入测试数据
```bash
mysql -u root -p travel_accounting < backend/database/seed.sql
```

## 备份与恢复

### 备份数据库
```bash
mysqldump -u root -p travel_accounting > backup_$(date +%Y%m%d).sql
```

### 恢复数据库
```bash
mysql -u root -p travel_accounting < backup_20260311.sql
```
