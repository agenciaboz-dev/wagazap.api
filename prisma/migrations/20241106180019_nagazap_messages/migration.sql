/*
  Warnings:

  - Added the required column `nagazap_id` to the `NagazapMessage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Nagazap` MODIFY `stack` LONGTEXT NOT NULL,
    MODIFY `blacklist` LONGTEXT NOT NULL,
    MODIFY `sentMessages` LONGTEXT NOT NULL,
    MODIFY `failedMessages` LONGTEXT NOT NULL;

-- AlterTable
ALTER TABLE `NagazapMessage` ADD COLUMN `nagazap_id` INTEGER NOT NULL,
    MODIFY `text` LONGTEXT NOT NULL;

-- AddForeignKey
ALTER TABLE `NagazapMessage` ADD CONSTRAINT `NagazapMessage_nagazap_id_fkey` FOREIGN KEY (`nagazap_id`) REFERENCES `Nagazap`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
