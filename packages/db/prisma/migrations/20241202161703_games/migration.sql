-- CreateTable
CREATE TABLE `Game` (
    `gameId` VARCHAR(191) NOT NULL,
    `gameType` ENUM('LUDO', 'FAST_LUDO', 'CRICKET', 'RUMMY') NOT NULL,
    `maxPlayers` INTEGER NOT NULL DEFAULT 2,
    `entryFee` DOUBLE NOT NULL,
    `prizePool` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`gameId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Room` (
    `roomId` VARCHAR(191) NOT NULL,
    `gameId` VARCHAR(191) NOT NULL,
    `status` ENUM('Running', 'Finished') NOT NULL DEFAULT 'Running',
    `winnerId` VARCHAR(191) NULL,

    PRIMARY KEY (`roomId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomPlayer` (
    `playerId` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`playerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Room` ADD CONSTRAINT `Room_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `Game`(`gameId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomPlayer` ADD CONSTRAINT `RoomPlayer_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`roomId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomPlayer` ADD CONSTRAINT `RoomPlayer_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;
