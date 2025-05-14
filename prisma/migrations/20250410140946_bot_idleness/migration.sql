-- AlterTable
ALTER TABLE `Bot` ADD COLUMN `expiry_message` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `idleness_message` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `idleness_minutes` INTEGER NOT NULL DEFAULT 0,
    MODIFY `expiry_minutes` INTEGER NOT NULL DEFAULT 0;
