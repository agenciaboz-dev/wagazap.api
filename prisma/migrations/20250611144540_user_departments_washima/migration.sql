-- CreateTable
CREATE TABLE `_UserToWashima` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_UserToWashima_AB_unique`(`A`, `B`),
    INDEX `_UserToWashima_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_DepartmentToWashima` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_DepartmentToWashima_AB_unique`(`A`, `B`),
    INDEX `_DepartmentToWashima_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_UserToWashima` ADD CONSTRAINT `_UserToWashima_A_fkey` FOREIGN KEY (`A`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_UserToWashima` ADD CONSTRAINT `_UserToWashima_B_fkey` FOREIGN KEY (`B`) REFERENCES `Washima`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DepartmentToWashima` ADD CONSTRAINT `_DepartmentToWashima_A_fkey` FOREIGN KEY (`A`) REFERENCES `Department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DepartmentToWashima` ADD CONSTRAINT `_DepartmentToWashima_B_fkey` FOREIGN KEY (`B`) REFERENCES `Washima`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
