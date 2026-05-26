// 一次性迁移脚本：给 transactions 表添加 created_by 字段
const db = require('../src/config/database');

async function migrate() {
  try {
    console.log('开始迁移...');

    // 检查字段是否已存在
    const [cols] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'travel_accounting' AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'created_by'"
    );

    if (cols.length > 0) {
      console.log('created_by 字段已存在，跳过');
    } else {
      await db.query('ALTER TABLE transactions ADD COLUMN created_by int DEFAULT NULL COMMENT \'创建者用户ID\' AFTER payer_id');
      console.log('✅ 添加 created_by 字段成功');

      await db.query('ALTER TABLE transactions ADD INDEX idx_created_by (created_by)');
      console.log('✅ 添加索引成功');
    }

    // 回填已有数据
    const [result] = await db.query(
      'UPDATE transactions t JOIN account_books ab ON t.account_book_id = ab.id SET t.created_by = ab.user_id WHERE t.created_by IS NULL'
    );
    console.log(`✅ 回填 ${result.affectedRows} 条记录`);

    console.log('迁移完成');
    process.exit(0);
  } catch (err) {
    console.error('迁移失败:', err.message);
    process.exit(1);
  }
}

migrate();
