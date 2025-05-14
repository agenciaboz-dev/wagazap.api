/*
  Warnings:

  - Added the required column `receive_washima_message` to the `Board` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Board` ADD COLUMN `receive_washima_message` JSON NOT NULL;
