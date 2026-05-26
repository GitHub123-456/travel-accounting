-- 给参与人表添加 user_id 字段，关联用户
ALTER TABLE `participants` ADD COLUMN `user_id` int DEFAULT NULL COMMENT '关联用户ID' AFTER `account_book_id`;
ALTER TABLE `participants` ADD INDEX `idx_user_id` (`user_id`);
