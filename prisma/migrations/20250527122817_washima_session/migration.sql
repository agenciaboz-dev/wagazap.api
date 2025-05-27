/*
  Warnings:

  - The primary key for the `WashimaSession` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `WashimaSession` table. All the data in the column will be lost.
  - Added the required column `data` to the `WashimaSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `WashimaSession` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `data` LONGBLOB NOT NULL,
    MODIFY `session` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`session`);
