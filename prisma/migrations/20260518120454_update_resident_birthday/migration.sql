/*
  Warnings:

  - You are about to drop the column `birthdate` on the `residents` table. All the data in the column will be lost.
  - You are about to drop the column `purok` on the `residents` table. All the data in the column will be lost.
  - Added the required column `birthday` to the `residents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `document_requests` ADD COLUMN `file_path` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `residents` DROP COLUMN `birthdate`,
    DROP COLUMN `purok`,
    ADD COLUMN `birthday` DATETIME(3) NOT NULL;
