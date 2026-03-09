-- AlterTable
ALTER TABLE `tabelas_salariais` ADD COLUMN `regime` VARCHAR(30) NOT NULL DEFAULT 'ESTATUTARIO';

-- AlterTable
ALTER TABLE `vinculos_funcionais` ADD COLUMN `gratificacaoFuncaoId` VARCHAR(191) NULL,
    ADD COLUMN `nivelComissionadoId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `niveis_comissionados` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `simbolo` VARCHAR(20) NOT NULL,
    `denominacao` VARCHAR(150) NOT NULL,
    `vencimento` DECIMAL(12, 2) NOT NULL,
    `vigenciaIni` DATE NOT NULL,
    `vigenciaFim` DATE NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `niveis_comissionados_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `niveis_comissionados_tenantId_simbolo_vigenciaIni_key`(`tenantId`, `simbolo`, `vigenciaIni`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gratificacoes_funcao` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `simbolo` VARCHAR(10) NOT NULL,
    `descricao` VARCHAR(150) NULL,
    `percentual` DECIMAL(6, 2) NOT NULL,
    `vigenciaIni` DATE NOT NULL,
    `vigenciaFim` DATE NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `gratificacoes_funcao_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `gratificacoes_funcao_tenantId_simbolo_vigenciaIni_key`(`tenantId`, `simbolo`, `vigenciaIni`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vinculos_funcionais` ADD CONSTRAINT `vinculos_funcionais_nivelComissionadoId_fkey` FOREIGN KEY (`nivelComissionadoId`) REFERENCES `niveis_comissionados`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vinculos_funcionais` ADD CONSTRAINT `vinculos_funcionais_gratificacaoFuncaoId_fkey` FOREIGN KEY (`gratificacaoFuncaoId`) REFERENCES `gratificacoes_funcao`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `niveis_comissionados` ADD CONSTRAINT `niveis_comissionados_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gratificacoes_funcao` ADD CONSTRAINT `gratificacoes_funcao_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
