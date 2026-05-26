-- 给交易表添加 created_by 字段，记录创建者用户ID
ALTER TABLE `transactions` ADD COLUMN `created_by` int DEFAULT NULL COMMENT '创建者用户ID' AFTER `payer_id`;
ALTER TABLE `transactions` ADD INDEX `idx_created_by` (`created_by`);

-- 回填已有数据：根据账本所有者设置 created_by
UPDATE transactions t
JOIN account_books ab ON t.account_book_id = ab.id
SET t.created_by = ab.user_id
WHERE t.created_by IS NULL;
