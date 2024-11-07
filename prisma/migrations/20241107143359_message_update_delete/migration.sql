-- AlterTable
ALTER TABLE `WashimaMessage` ADD COLUMN `deleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `edited` BOOLEAN NOT NULL DEFAULT false;
