-- CreateTable
CREATE TABLE `Admin` (
    `adminId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('admin', 'superadmin', 'employee') NOT NULL DEFAULT 'admin',

    UNIQUE INDEX `Admin_email_key`(`email`),
    PRIMARY KEY (`adminId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
