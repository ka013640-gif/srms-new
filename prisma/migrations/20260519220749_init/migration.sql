/*
  Warnings:

  - The primary key for the `activity_log` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `activity_log` table. All the data in the column will be lost.
  - The primary key for the `archives` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `archives` table. All the data in the column will be lost.
  - You are about to drop the column `request_id` on the `document_request_attachments` table. All the data in the column will be lost.
  - The primary key for the `document_requests` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `document_requests` table. All the data in the column will be lost.
  - You are about to drop the column `resident_id` on the `document_requests` table. All the data in the column will be lost.
  - The primary key for the `officials` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `officials` table. All the data in the column will be lost.
  - The primary key for the `projects` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `projects` table. All the data in the column will be lost.
  - The primary key for the `residents` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `residents` table. All the data in the column will be lost.
  - The primary key for the `sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `sessions` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `users` table. All the data in the column will be lost.
  - Added the required column `activity_log_id` to the `activity_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `archive_id` to the `archives` table without a default value. This is not possible if the table is not empty.
  - Added the required column `document_request_id` to the `document_request_attachments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `document_request_id` to the `document_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `document_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `official_id` to the `officials` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_id` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resident_id` to the `residents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session_id` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `activity_log` DROP FOREIGN KEY `activity_log_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `document_request_attachments` DROP FOREIGN KEY `document_request_attachments_request_id_fkey`;

-- DropForeignKey
ALTER TABLE `document_requests` DROP FOREIGN KEY `document_requests_resident_id_fkey`;

-- DropForeignKey
ALTER TABLE `residents` DROP FOREIGN KEY `residents_user_id_fkey`;

-- AlterTable
ALTER TABLE `activity_log` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `activity_log_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`activity_log_id`);

-- AlterTable
ALTER TABLE `archives` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `archive_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`archive_id`);

-- AlterTable
ALTER TABLE `document_request_attachments` DROP COLUMN `request_id`,
    ADD COLUMN `document_request_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `document_requests` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    DROP COLUMN `resident_id`,
    ADD COLUMN `document_request_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `response_comment` VARCHAR(191) NULL,
    ADD COLUMN `user_id` INTEGER NOT NULL,
    MODIFY `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'RELEASED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    ADD PRIMARY KEY (`document_request_id`);

-- AlterTable
ALTER TABLE `officials` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `official_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`official_id`);

-- AlterTable
ALTER TABLE `projects` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `project_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`project_id`);

-- AlterTable
ALTER TABLE `residents` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `resident_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`resident_id`);

-- AlterTable
ALTER TABLE `sessions` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `session_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`session_id`);

-- AlterTable
ALTER TABLE `users` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `profilePicture` VARCHAR(191) NULL,
    ADD COLUMN `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`user_id`);

-- CreateIndex
CREATE INDEX `document_request_attachments_request_id_fkey` ON `document_request_attachments`(`document_request_id`);

-- CreateIndex
CREATE INDEX `document_requests_user_id_fkey` ON `document_requests`(`user_id`);

-- AddForeignKey
ALTER TABLE `residents` ADD CONSTRAINT `residents_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_requests` ADD CONSTRAINT `document_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_request_attachments` ADD CONSTRAINT `document_request_attachments_document_request_id_fkey` FOREIGN KEY (`document_request_id`) REFERENCES `document_requests`(`document_request_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_log` ADD CONSTRAINT `activity_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
