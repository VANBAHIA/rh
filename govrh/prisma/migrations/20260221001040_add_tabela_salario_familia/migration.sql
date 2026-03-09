-- DropForeignKey
ALTER TABLE `itens_folha_verbas` DROP FOREIGN KEY `itens_folha_verbas_verbaId_fkey`;

-- AlterTable
ALTER TABLE `configuracoes_folha` ADD COLUMN `tabelaSalarioFamilia` JSON NULL;

-- AddForeignKey
ALTER TABLE `itens_folha_verbas` ADD CONSTRAINT `itens_folha_verbas_verbaId_fkey` FOREIGN KEY (`verbaId`) REFERENCES `verbas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
