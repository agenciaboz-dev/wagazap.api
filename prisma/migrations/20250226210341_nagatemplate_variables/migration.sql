/*
  Warnings:

  - Added the required column `body_vars` to the `NagaTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `header_vars` to the `NagaTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `NagaTemplate` ADD COLUMN `body_vars` JSON NOT NULL,
    ADD COLUMN `header_vars` JSON NOT NULL;
