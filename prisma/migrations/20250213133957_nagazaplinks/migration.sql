-- CreateTable
CREATE TABLE `NagazapLink` (
    `id` VARCHAR(191) NOT NULL,
    `original_url` TEXT NOT NULL,
    `new_url` VARCHAR(191) NOT NULL,
    `created_at` VARCHAR(191) NOT NULL,
    `clicks` JSON NOT NULL,
    `nagazap_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `NagazapLink` ADD CONSTRAINT `NagazapLink_nagazap_id_fkey` FOREIGN KEY (`nagazap_id`) REFERENCES `Nagazap`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
