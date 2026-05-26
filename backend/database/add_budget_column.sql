-- Add budget column to account_books table
ALTER TABLE `account_books` 
ADD COLUMN `budget` decimal(12,2) DEFAULT NULL COMMENT '预算金额' AFTER `remark`;
