/*
  Warnings:

  - You are about to drop the column `userId` on the `Nagazap` table. All the data in the column will be lost.
  - You are about to drop the `_UserToWashima` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `companyId` to the `Nagazap` table without a default value. This is not possible if the table is not empty.
  - Added the required column `company_id` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Nagazap` DROP FOREIGN KEY `Nagazap_userId_fkey`;

-- DropForeignKey
ALTER TABLE `_UserToWashima` DROP FOREIGN KEY `_UserToWashima_A_fkey`;

-- DropForeignKey
ALTER TABLE `_UserToWashima` DROP FOREIGN KEY `_UserToWashima_B_fkey`;

-- AlterTable
ALTER TABLE `Nagazap` DROP COLUMN `userId`,
    ADD COLUMN `companyId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `company_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `owner` BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE `_UserToWashima`;

-- CreateTable
CREATE TABLE `Company` (
    `id` VARCHAR(191) NOT NULL,
    `full_name` TEXT NOT NULL,
    `business_name` TEXT NOT NULL,
    `document` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CompanyToWashima` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_CompanyToWashima_AB_unique`(`A`, `B`),
    INDEX `_CompanyToWashima_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Nagazap` ADD CONSTRAINT `Nagazap_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CompanyToWashima` ADD CONSTRAINT `_CompanyToWashima_A_fkey` FOREIGN KEY (`A`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CompanyToWashima` ADD CONSTRAINT `_CompanyToWashima_B_fkey` FOREIGN KEY (`B`) REFERENCES `Washima`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
