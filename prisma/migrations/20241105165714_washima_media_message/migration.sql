/*
  Warnings:

  - You are about to drop the column `url` on the `WashimaMedia` table. All the data in the column will be lost.
  - Added the required column `data` to the `WashimaMedia` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `WashimaMedia` DROP COLUMN `url`,
    ADD COLUMN `data` LONGTEXT NOT NULL;
