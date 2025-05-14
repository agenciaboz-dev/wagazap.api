/*
  Warnings:

  - You are about to drop the column `receive_washima_message` on the `Board` table. All the data in the column will be lost.
  - Added the required column `nagazap_settings` to the `Board` table without a default value. This is not possible if the table is not empty.
  - Added the required column `washima_settings` to the `Board` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Board` DROP COLUMN `receive_washima_message`,
    ADD COLUMN `nagazap_settings` JSON NOT NULL,
    ADD COLUMN `washima_settings` JSON NOT NULL;
