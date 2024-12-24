-- CreateTable
CREATE TABLE `User` (
    `userId` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `otp` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL DEFAULT '',
    `suspended` BOOLEAN NOT NULL DEFAULT false,
    `deviceId` VARCHAR(191) NULL,

    UNIQUE INDEX `User_mobile_key`(`mobile`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
