-- CreateTable
CREATE TABLE `Nagazap` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` TEXT NOT NULL,
    `lastUpdated` VARCHAR(191) NOT NULL,
    `appId` VARCHAR(191) NOT NULL,
    `phoneId` VARCHAR(191) NOT NULL,
    `bussinessId` VARCHAR(191) NOT NULL,
    `stack` TEXT NOT NULL,
    `blacklist` TEXT NOT NULL,
    `frequency` VARCHAR(191) NOT NULL,
    `batchSize` INTEGER NOT NULL,
    `lastMessageTime` VARCHAR(191) NOT NULL,
    `paused` BOOLEAN NOT NULL,
    `sentMessages` TEXT NOT NULL,
    `failedMessages` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NagazapMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `from` VARCHAR(191) NOT NULL,
    `timestamp` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Washima` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `created_at` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WashimaMedia` (
    `message_id` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `data` LONGTEXT NOT NULL,
    `mimetype` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`message_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WashimaProfilePic` (
    `chat_id` VARCHAR(191) NOT NULL,
    `last_updated` VARCHAR(191) NOT NULL,
    `url` LONGTEXT NOT NULL,

    PRIMARY KEY (`chat_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WashimaMessage` (
    `sid` VARCHAR(191) NOT NULL,
    `washima_id` VARCHAR(191) NOT NULL,
    `chat_id` TEXT NOT NULL,
    `id` LONGTEXT NOT NULL,
    `author` VARCHAR(191) NULL,
    `body` LONGTEXT NOT NULL,
    `from` VARCHAR(191) NOT NULL,
    `fromMe` BOOLEAN NOT NULL,
    `hasMedia` BOOLEAN NOT NULL,
    `timestamp` VARCHAR(191) NOT NULL,
    `to` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `ack` INTEGER NULL,

    PRIMARY KEY (`sid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WashimaGroupUpdates` (
    `sid` VARCHAR(191) NOT NULL,
    `washima_id` VARCHAR(191) NOT NULL,
    `chat_id` TEXT NOT NULL,
    `id` LONGTEXT NOT NULL,
    `author` VARCHAR(191) NOT NULL,
    `body` LONGTEXT NOT NULL,
    `recipientIds` LONGTEXT NOT NULL,
    `timestamp` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`sid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
