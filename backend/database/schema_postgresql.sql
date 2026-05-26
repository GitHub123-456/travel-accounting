-- 旅行记账系统数据库结构 - PostgreSQL (Supabase)
-- 适用于 Supabase 免费数据库

-- users 表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  avatar VARCHAR(255),
  default_currency VARCHAR(10) DEFAULT 'CNY',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- account_books 表
CREATE TABLE IF NOT EXISTS account_books (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  remark TEXT,
  budget DECIMAL(12,2),
  currency VARCHAR(10) DEFAULT 'CNY',
  cover_url VARCHAR(255),
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- exchange_rates 表
CREATE TABLE IF NOT EXISTS exchange_rates (
  id SERIAL PRIMARY KEY,
  account_book_id INTEGER NOT NULL REFERENCES account_books(id) ON DELETE CASCADE,
  currency VARCHAR(10) NOT NULL,
  rate DECIMAL(10,6) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account_book_id, currency)
);

-- participants 表
CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY,
  account_book_id INTEGER NOT NULL REFERENCES account_books(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(50) NOT NULL,
  email VARCHAR(100),
  remark VARCHAR(100),
  is_settled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- transactions 表
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  account_book_id INTEGER NOT NULL REFERENCES account_books(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  local_amount DECIMAL(12,2) NOT NULL,
  category VARCHAR(20) NOT NULL,
  transaction_time TIMESTAMP NOT NULL,
  location VARCHAR(100),
  remark TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('personal', 'shared')),
  payer_id INTEGER REFERENCES participants(id) ON DELETE SET NULL,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- transaction_participants 表
CREATE TABLE IF NOT EXISTS transaction_participants (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(transaction_id, participant_id)
);

-- verification_codes 表
CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  account VARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'phone')),
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_account_books_user_id ON account_books(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_book_id ON transactions(account_book_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_time ON transactions(transaction_time);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_participants_account_book_id ON participants(account_book_id);
