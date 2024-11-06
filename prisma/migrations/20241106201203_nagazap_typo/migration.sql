/*
  Warnings:

  - You are about to drop the column `bussinessId` on the `Nagazap` table. All the data in the column will be lost.
  - Added the required column `businessId` to the `Nagazap` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Nagazap` DROP COLUMN `bussinessId`,
    ADD COLUMN `businessId` VARCHAR(191) NOT NULL;
