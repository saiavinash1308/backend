/*
  Warnings:

  - The values [AVIATOR] on the enum `Game_gameType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `Game` MODIFY `gameType` ENUM('LUDO', 'FAST_LUDO', 'CRICKET', 'RUMMY', 'MEMORYGAME') NOT NULL;
