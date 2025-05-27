-- CreateTable
CREATE TABLE `WashimaSession` (
    `id` VARCHAR(191) NOT NULL,
    `created_at` VARCHAR(191) NOT NULL,
    `last_updated` VARCHAR(191) NOT NULL,
    `session` JSON NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
