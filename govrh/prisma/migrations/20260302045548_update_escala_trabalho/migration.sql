/*
  Warnings:

  - Added the required column `turnos` to the `escalas_trabalho` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `escalas_trabalho` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `escalas_trabalho` ADD COLUMN `cargaHorariaSemanal` DECIMAL(5, 2) NOT NULL DEFAULT 40,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `descricao` VARCHAR(500) NULL,
    ADD COLUMN `tipo` VARCHAR(30) NOT NULL DEFAULT 'FIXO',
    ADD COLUMN `turnos` JSON NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `turno` ENUM('MANHA', 'TARDE', 'NOITE', 'INTEGRAL', 'PLANTAO_12x36', 'PLANTAO_24x48') NULL,
    MODIFY `horaEntrada` VARCHAR(5) NULL,
    MODIFY `horaSaida` VARCHAR(5) NULL,
    MODIFY `horasDiarias` DECIMAL(4, 2) NULL,
    MODIFY `diasSemana` JSON NULL;

-- Fill null turnos for existing rows
UPDATE `escalas_trabalho` SET `turnos` = '[]' WHERE `turnos` IS NULL;
