/*
  Warnings:

  - You are about to drop the column `ativo` on the `servidores_escalas` table. All the data in the column will be lost.
  - Made the column `tenantId` on table `escalas_trabalho` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `tenantId` to the `servidores_escalas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `servidores_escalas` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `servidores_escalas_servidorId_idx` ON `servidores_escalas`;

-- AlterTable
ALTER TABLE `escalas_trabalho` ADD COLUMN `ativo` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `tenantId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `servidores_escalas` DROP COLUMN `ativo`,
    ADD COLUMN `ativa` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `motivoAlteracao` VARCHAR(200) NULL,
    ADD COLUMN `registradoPor` VARCHAR(150) NULL,
    ADD COLUMN `tenantId` VARCHAR(191) NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- CreateIndex
CREATE INDEX `escalas_trabalho_tenantId_idx` ON `escalas_trabalho`(`tenantId`);

-- CreateIndex
CREATE INDEX `escalas_trabalho_tenantId_ativo_idx` ON `escalas_trabalho`(`tenantId`, `ativo`);

-- CreateIndex
CREATE INDEX `servidores_escalas_servidorId_ativa_idx` ON `servidores_escalas`(`servidorId`, `ativa`);

-- CreateIndex
CREATE INDEX `servidores_escalas_tenantId_ativa_idx` ON `servidores_escalas`(`tenantId`, `ativa`);

-- AddForeignKey
ALTER TABLE `servidores_escalas` ADD CONSTRAINT `servidores_escalas_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `servidores_escalas` RENAME INDEX `servidores_escalas_escalaId_fkey` TO `servidores_escalas_escalaId_idx`;
