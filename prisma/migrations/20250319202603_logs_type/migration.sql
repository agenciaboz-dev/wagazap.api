/*
  Warnings:

  - You are about to drop the column `color` on the `Log` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Log` DROP COLUMN `color`,
    ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'default';
