-- AlterTable
ALTER TABLE `document_requests` ADD COLUMN `response_file` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `document_request_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` INTEGER NOT NULL,
    `file_path` VARCHAR(191) NOT NULL,
    `file_name` VARCHAR(191) NOT NULL,
    `is_admin` BOOLEAN NOT NULL DEFAULT false,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `document_request_attachments_request_id_fkey`(`request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `document_request_attachments` ADD CONSTRAINT `document_request_attachments_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `document_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
