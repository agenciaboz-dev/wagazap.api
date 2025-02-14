-- CreateTable
CREATE TABLE `Bot` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `created_at` VARCHAR(191) NOT NULL,
    `trigger` VARCHAR(191) NOT NULL,
    `triggered` INTEGER NOT NULL,
    `flow` JSON NOT NULL,
    `active_on` JSON NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_BotToWashima` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_BotToWashima_AB_unique`(`A`, `B`),
    INDEX `_BotToWashima_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_BotToNagazap` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_BotToNagazap_AB_unique`(`A`, `B`),
    INDEX `_BotToNagazap_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Bot` ADD CONSTRAINT `Bot_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_BotToWashima` ADD CONSTRAINT `_BotToWashima_A_fkey` FOREIGN KEY (`A`) REFERENCES `Bot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_BotToWashima` ADD CONSTRAINT `_BotToWashima_B_fkey` FOREIGN KEY (`B`) REFERENCES `Washima`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_BotToNagazap` ADD CONSTRAINT `_BotToNagazap_A_fkey` FOREIGN KEY (`A`) REFERENCES `Bot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_BotToNagazap` ADD CONSTRAINT `_BotToNagazap_B_fkey` FOREIGN KEY (`B`) REFERENCES `Nagazap`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
