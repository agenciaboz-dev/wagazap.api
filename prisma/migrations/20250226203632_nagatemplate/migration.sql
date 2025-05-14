-- CreateTable
CREATE TABLE `NagaTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `created_at` VARCHAR(191) NOT NULL,
    `last_update` VARCHAR(191) NOT NULL,
    `sent` INTEGER NOT NULL DEFAULT 0,
    `info` JSON NOT NULL,
    `nagazap_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `NagaTemplate` ADD CONSTRAINT `NagaTemplate_nagazap_id_fkey` FOREIGN KEY (`nagazap_id`) REFERENCES `Nagazap`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
