/*
  Warnings:

  - A unique constraint covering the columns `[servidorId,dataInicio]` on the table `periodos_aquisitivos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,nome]` on the table `roles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,nome]` on the table `tabelas_salariais` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `roles_nome_key` ON `roles`;

-- AlterTable
ALTER TABLE `roles` ADD COLUMN `tenantId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `periodos_aquisitivos_servidorId_dataInicio_key` ON `periodos_aquisitivos`(`servidorId`, `dataInicio`);

-- CreateIndex
CREATE INDEX `roles_tenantId_idx` ON `roles`(`tenantId`);

-- CreateIndex
CREATE UNIQUE INDEX `roles_tenantId_nome_key` ON `roles`(`tenantId`, `nome`);

-- CreateIndex
CREATE UNIQUE INDEX `tabelas_salariais_tenantId_nome_key` ON `tabelas_salariais`(`tenantId`, `nome`);

-- AddForeignKey
ALTER TABLE `roles` ADD CONSTRAINT `roles_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
