/*
  Warnings:

  - You are about to drop the column `bairro` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `cargaHorariaSemanal` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `cargoId` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `celular` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `cep` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `complemento` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `dataAdmissao` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `dataExercicio` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `dataExoneracao` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `dataPosse` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `dataTermino` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `dataTitulacao` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `emailInstitucional` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `emailPessoal` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `escolaridade` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `logradouro` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `lotacaoId` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `motivoExoneracao` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `municipio` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `nivelSalarialId` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `nivelTitulacao` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `nomeMae` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `nomePai` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `numero` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `regimeJuridico` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `situacaoFuncional` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `tabelaSalarialId` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `telefonePessoal` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `titulacaoComprovada` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `turno` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the column `uf` on the `servidores` table. All the data in the column will be lost.
  - You are about to drop the `historico_funcional` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `historico_funcional` DROP FOREIGN KEY `historico_funcional_cargoAnteriorId_fkey`;

-- DropForeignKey
ALTER TABLE `historico_funcional` DROP FOREIGN KEY `historico_funcional_lotacaoAnteriorId_fkey`;

-- DropForeignKey
ALTER TABLE `historico_funcional` DROP FOREIGN KEY `historico_funcional_servidorId_fkey`;

-- DropForeignKey
ALTER TABLE `servidores` DROP FOREIGN KEY `servidores_cargoId_fkey`;

-- DropForeignKey
ALTER TABLE `servidores` DROP FOREIGN KEY `servidores_lotacaoId_fkey`;

-- DropForeignKey
ALTER TABLE `servidores` DROP FOREIGN KEY `servidores_nivelSalarialId_fkey`;

-- DropForeignKey
ALTER TABLE `servidores` DROP FOREIGN KEY `servidores_tabelaSalarialId_fkey`;

-- DropIndex
DROP INDEX `servidores_tenantId_lotacaoId_idx` ON `servidores`;

-- DropIndex
DROP INDEX `servidores_tenantId_regimeJuridico_idx` ON `servidores`;

-- DropIndex
DROP INDEX `servidores_tenantId_situacaoFuncional_idx` ON `servidores`;

-- AlterTable
ALTER TABLE `servidores` DROP COLUMN `bairro`,
    DROP COLUMN `cargaHorariaSemanal`,
    DROP COLUMN `cargoId`,
    DROP COLUMN `celular`,
    DROP COLUMN `cep`,
    DROP COLUMN `complemento`,
    DROP COLUMN `dataAdmissao`,
    DROP COLUMN `dataExercicio`,
    DROP COLUMN `dataExoneracao`,
    DROP COLUMN `dataPosse`,
    DROP COLUMN `dataTermino`,
    DROP COLUMN `dataTitulacao`,
    DROP COLUMN `emailInstitucional`,
    DROP COLUMN `emailPessoal`,
    DROP COLUMN `escolaridade`,
    DROP COLUMN `logradouro`,
    DROP COLUMN `lotacaoId`,
    DROP COLUMN `motivoExoneracao`,
    DROP COLUMN `municipio`,
    DROP COLUMN `nivelSalarialId`,
    DROP COLUMN `nivelTitulacao`,
    DROP COLUMN `nomeMae`,
    DROP COLUMN `nomePai`,
    DROP COLUMN `numero`,
    DROP COLUMN `regimeJuridico`,
    DROP COLUMN `situacaoFuncional`,
    DROP COLUMN `tabelaSalarialId`,
    DROP COLUMN `telefonePessoal`,
    DROP COLUMN `titulacaoComprovada`,
    DROP COLUMN `turno`,
    DROP COLUMN `uf`;

-- DropTable
DROP TABLE `historico_funcional`;

-- CreateTable
CREATE TABLE `vinculos_funcionais` (
    `id` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `regimeJuridico` ENUM('ESTATUTARIO', 'CELETISTA', 'COMISSIONADO', 'ESTAGIARIO', 'TEMPORARIO', 'AGENTE_POLITICO') NOT NULL,
    `situacaoFuncional` ENUM('ATIVO', 'AFASTADO', 'CEDIDO', 'LICENCA', 'SUSPENSO', 'EXONERADO', 'APOSENTADO', 'FALECIDO') NOT NULL DEFAULT 'ATIVO',
    `cargoId` VARCHAR(191) NOT NULL,
    `tabelaSalarialId` VARCHAR(191) NOT NULL,
    `nivelSalarialId` VARCHAR(191) NOT NULL,
    `lotacaoId` VARCHAR(191) NOT NULL,
    `cargaHoraria` INTEGER NOT NULL DEFAULT 40,
    `turno` ENUM('MANHA', 'TARDE', 'NOITE', 'INTEGRAL', 'PLANTAO_12x36', 'PLANTAO_24x48') NOT NULL DEFAULT 'INTEGRAL',
    `nivelTitulacao` VARCHAR(10) NULL,
    `titulacaoComprovada` ENUM('FUNDAMENTAL_INCOMPLETO', 'FUNDAMENTAL_COMPLETO', 'MEDIO_INCOMPLETO', 'MEDIO_COMPLETO', 'TECNICO', 'SUPERIOR_INCOMPLETO', 'SUPERIOR_COMPLETO', 'POS_GRADUACAO', 'MESTRADO', 'DOUTORADO') NULL,
    `urlComprovante` VARCHAR(500) NULL,
    `dataAdmissao` DATE NOT NULL,
    `dataPosse` DATE NULL,
    `dataExercicio` DATE NULL,
    `dataTermino` DATE NULL,
    `dataEncerramento` DATE NULL,
    `motivoEncerramento` VARCHAR(300) NULL,
    `atual` BOOLEAN NOT NULL DEFAULT true,
    `tipoAlteracao` ENUM('ADMISSAO', 'REINTEGRACAO', 'POSSE', 'EXERCICIO', 'PROGRESSAO_HORIZONTAL', 'PROGRESSAO_VERTICAL', 'ENQUADRAMENTO', 'TRANSFERENCIA_LOTACAO', 'MUDANCA_REGIME', 'MUDANCA_JORNADA', 'MUDANCA_CARGO', 'AFASTAMENTO', 'RETORNO_AFASTAMENTO', 'SUSPENSAO', 'CESSAO', 'APOSENTADORIA', 'EXONERACAO', 'FALECIMENTO', 'RESCISAO') NOT NULL,
    `portaria` VARCHAR(100) NULL,
    `lei` VARCHAR(100) NULL,
    `observacao` VARCHAR(500) NULL,
    `registradoPor` VARCHAR(150) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vinculos_funcionais_servidorId_idx`(`servidorId`),
    INDEX `vinculos_funcionais_servidorId_atual_idx`(`servidorId`, `atual`),
    INDEX `vinculos_funcionais_tenantId_situacaoFuncional_idx`(`tenantId`, `situacaoFuncional`),
    INDEX `vinculos_funcionais_tenantId_lotacaoId_idx`(`tenantId`, `lotacaoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contatos_servidores` (
    `id` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('EMAIL_PESSOAL', 'EMAIL_INSTITUCIONAL', 'CELULAR', 'TELEFONE_FIXO', 'WHATSAPP') NOT NULL,
    `valor` VARCHAR(200) NOT NULL,
    `principal` BOOLEAN NOT NULL DEFAULT false,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `contatos_servidores_servidorId_idx`(`servidorId`),
    INDEX `contatos_servidores_servidorId_tipo_idx`(`servidorId`, `tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `enderecos_servidores` (
    `id` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `cep` VARCHAR(9) NULL,
    `logradouro` VARCHAR(200) NOT NULL,
    `numero` VARCHAR(10) NOT NULL,
    `complemento` VARCHAR(100) NULL,
    `bairro` VARCHAR(100) NOT NULL,
    `municipio` VARCHAR(100) NOT NULL,
    `uf` CHAR(2) NOT NULL,
    `principal` BOOLEAN NOT NULL DEFAULT false,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `enderecos_servidores_servidorId_idx`(`servidorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vinculos_funcionais` ADD CONSTRAINT `vinculos_funcionais_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vinculos_funcionais` ADD CONSTRAINT `vinculos_funcionais_cargoId_fkey` FOREIGN KEY (`cargoId`) REFERENCES `cargos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vinculos_funcionais` ADD CONSTRAINT `vinculos_funcionais_tabelaSalarialId_fkey` FOREIGN KEY (`tabelaSalarialId`) REFERENCES `tabelas_salariais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vinculos_funcionais` ADD CONSTRAINT `vinculos_funcionais_nivelSalarialId_fkey` FOREIGN KEY (`nivelSalarialId`) REFERENCES `niveis_salariais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vinculos_funcionais` ADD CONSTRAINT `vinculos_funcionais_lotacaoId_fkey` FOREIGN KEY (`lotacaoId`) REFERENCES `lotacoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contatos_servidores` ADD CONSTRAINT `contatos_servidores_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enderecos_servidores` ADD CONSTRAINT `enderecos_servidores_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
