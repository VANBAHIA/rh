-- Primeiro remove a FK, depois o índice único, depois recria a FK
ALTER TABLE `dados_bancarios` DROP FOREIGN KEY `dados_bancarios_servidorId_fkey`;
ALTER TABLE `dados_bancarios` DROP INDEX `dados_bancarios_servidorId_key`;
ALTER TABLE `dados_bancarios` ADD COLUMN `ativa` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `dados_bancarios` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
ALTER TABLE `dados_bancarios` ADD INDEX `dados_bancarios_servidorId_idx`(`servidorId`);
ALTER TABLE `dados_bancarios` ADD CONSTRAINT `dados_bancarios_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;