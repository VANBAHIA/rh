/*
  Warnings:

  - Made the column `turnos` on table `escalas_trabalho` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `escalas_trabalho` MODIFY `turnos` JSON NOT NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;
