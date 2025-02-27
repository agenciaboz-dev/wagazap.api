/*
  Warnings:

  - You are about to drop the column `body_vars` on the `NagaTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `header_vars` on the `NagaTemplate` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `NagaTemplate` DROP COLUMN `body_vars`,
    DROP COLUMN `header_vars`;
