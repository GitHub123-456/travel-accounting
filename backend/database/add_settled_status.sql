-- 添加结清状态字段到participants表
ALTER TABLE `participants` 
ADD COLUMN `is_settled` tinyint(1) DEFAULT '0' COMMENT '是否已结清' AFTER `remark`;
