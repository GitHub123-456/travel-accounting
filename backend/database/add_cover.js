const db = require('../src/config/database');
async function run() {
  const [cols] = await db.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'travel_accounting' AND TABLE_NAME = 'account_books' AND COLUMN_NAME = 'cover'");
  if (cols.length > 0) { console.log('cover 字段已存在'); } 
  else { await db.query("ALTER TABLE account_books ADD COLUMN cover varchar(500) DEFAULT NULL COMMENT '封面图URL' AFTER remark"); console.log('✅ 添加 cover 字段成功'); }
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
