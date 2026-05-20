-- AlterTable
ALTER TABLE `residents` ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `projects` ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `sessions` ADD COLUMN `deleted_at` DATETIME(3) NULL;