/*
  Warnings:

  - Added the required column `washima_id` to the `WashimaMedia` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `WashimaMedia` ADD COLUMN `washima_id` VARCHAR(191) NOT NULL;
