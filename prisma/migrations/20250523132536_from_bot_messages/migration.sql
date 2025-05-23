/*
  Warnings:

  - You are about to alter the column `from_bot` on the `NagazapMessage` table. The data in that column could be lost. The data in that column will be cast from `TinyInt` to `VarChar(191)`.
  - You are about to alter the column `from_bot` on the `WashimaMessage` table. The data in that column could be lost. The data in that column will be cast from `TinyInt` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `NagazapMessage` MODIFY `from_bot` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `WashimaMessage` MODIFY `from_bot` VARCHAR(191) NULL;
