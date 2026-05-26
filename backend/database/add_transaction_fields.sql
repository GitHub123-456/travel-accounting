ALTER TABLE transactions ADD COLUMN sub_category varchar(50) DEFAULT NULL AFTER category;
ALTER TABLE transactions ADD COLUMN payment_method varchar(20) DEFAULT 'cash' AFTER sub_category;
