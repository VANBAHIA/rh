-- Adiciona campos isSistema e codigoSistema na tabela verbas
ALTER TABLE `verbas` ADD COLUMN `isSistema` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `verbas` ADD COLUMN `codigoSistema` VARCHAR(30) NULL;
ALTER TABLE `verbas` ADD UNIQUE INDEX `verbas_codigoSistema_key`(`codigoSistema`);

-- Remove registros orfaos de itens_folha_verbas com verbaId NULL
-- (originados de processamentos anteriores sem verbas de sistema)
DELETE FROM `itens_folha_verbas` WHERE `verbaId` IS NULL;

-- Remove FK existente (SET NULL) para poder tornar verbaId NOT NULL
ALTER TABLE `itens_folha_verbas` DROP FOREIGN KEY `itens_folha_verbas_verbaId_fkey`;

-- Torna verbaId obrigatorio
ALTER TABLE `itens_folha_verbas` MODIFY COLUMN `verbaId` VARCHAR(191) NOT NULL;

-- Recria FK sem SET NULL (sem ON DELETE SET NULL)
ALTER TABLE `itens_folha_verbas` ADD CONSTRAINT `itens_folha_verbas_verbaId_fkey`
  FOREIGN KEY (`verbaId`) REFERENCES `verbas`(`id`);
