const db = require('../src/config/database');
async function run() {
  const [cols] = await db.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'travel_accounting' AND TABLE_NAME = 'account_books' AND COLUMN_NAME = 'default_currency'");
  if (cols.length > 0) { console.log('default_currency 已存在'); }
  else { await db.query("ALTER TABLE account_books ADD COLUMN default_currency varchar(10) DEFAULT 'CNY' COMMENT '账本默认币种' AFTER budget"); console.log('✅ 添加 default_currency 成功'); }
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
