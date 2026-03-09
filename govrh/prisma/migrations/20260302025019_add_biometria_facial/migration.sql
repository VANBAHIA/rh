-- CreateTable
CREATE TABLE `biometrias_faciais` (
    `id` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `embedding` JSON NOT NULL,
    `modelo` VARCHAR(191) NOT NULL DEFAULT 'face-api.js',
    `capturaEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadaEm` DATETIME(3) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `cadastradoPor` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `biometrias_faciais_servidorId_key`(`servidorId`),
    INDEX `biometrias_faciais_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `biometrias_faciais` ADD CONSTRAINT `biometrias_faciais_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
