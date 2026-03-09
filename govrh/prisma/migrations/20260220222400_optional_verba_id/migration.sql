-- DropForeignKey
ALTER TABLE `itens_folha_verbas` DROP FOREIGN KEY `itens_folha_verbas_verbaId_fkey`;

-- AlterTable
ALTER TABLE `itens_folha_verbas` MODIFY `verbaId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `itens_folha_verbas` ADD CONSTRAINT `itens_folha_verbas_verbaId_fkey` FOREIGN KEY (`verbaId`) REFERENCES `verbas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
