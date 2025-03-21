/*
  Warnings:

  - Made the column `entry_room_id` on table `Board` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Board` MODIFY `entry_room_id` VARCHAR(191) NOT NULL;
