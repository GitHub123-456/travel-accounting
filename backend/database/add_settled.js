const db = require('../src/config/database');
async function run() {
  const [cols] = await db.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'travel_accounting' AND TABLE_NAME = 'participants' AND COLUMN_NAME = 'is_settled'");
  if (cols.length > 0) { console.log('is_settled 已存在'); }
  else { await db.query("ALTER TABLE participants ADD COLUMN is_settled tinyint(1) DEFAULT 0 COMMENT '是否已结清'"); console.log('✅ 添加 is_settled 成功'); }
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
