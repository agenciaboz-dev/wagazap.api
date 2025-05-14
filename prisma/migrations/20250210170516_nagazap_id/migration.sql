/*
  Warnings:

  - The primary key for the `Nagazap` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE `NagazapMessage` DROP FOREIGN KEY `NagazapMessage_nagazap_id_fkey`;

-- AlterTable
ALTER TABLE `Nagazap` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `NagazapMessage` MODIFY `nagazap_id` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `NagazapMessage` ADD CONSTRAINT `NagazapMessage_nagazap_id_fkey` FOREIGN KEY (`nagazap_id`) REFERENCES `Nagazap`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
