const { Pool } = require('pg');
require('dotenv').config();

// 检测是否使用 Supabase（DATABASE_URL 存在）
const isSupabase = process.env.DATABASE_URL;

const config = isSupabase ? {
  // Supabase 连接方式
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
} : {
  // 本地或其他 PostgreSQL 连接方式
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'travel_accounting',
  max: 10,
  idleTimeoutMillis: 30000
};

const pool = new Pool(config);

// 测试连接
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// 兼容 MySQL 的查询方法
const query = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return [result.rows, { affectedRows: result.rowCount }];
};

module.exports = { pool, query };
