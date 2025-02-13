/*
  Warnings:

  - The primary key for the `NagazapLink` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `NagazapLink` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `NagazapLink` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD PRIMARY KEY (`new_url`);
