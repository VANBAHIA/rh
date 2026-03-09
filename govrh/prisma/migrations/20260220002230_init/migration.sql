-- CreateTable
CREATE TABLE `tenants` (
    `id` VARCHAR(191) NOT NULL,
    `cnpj` VARCHAR(18) NOT NULL,
    `razaoSocial` VARCHAR(200) NOT NULL,
    `nomeFantasia` VARCHAR(200) NULL,
    `tipoOrgao` ENUM('PREFEITURA', 'CAMARA', 'AUTARQUIA', 'FUNDACAO', 'EMPRESA_PUBLICA', 'CONSORCIO') NOT NULL,
    `esfera` VARCHAR(20) NOT NULL,
    `uf` CHAR(2) NOT NULL,
    `municipio` VARCHAR(100) NOT NULL,
    `cep` VARCHAR(9) NULL,
    `endereco` VARCHAR(300) NULL,
    `telefone` VARCHAR(20) NULL,
    `emailContato` VARCHAR(150) NULL,
    `logoUrl` VARCHAR(500) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `plano` VARCHAR(50) NOT NULL DEFAULT 'BASICO',
    `limiteServidores` INTEGER NOT NULL DEFAULT 500,
    `exercicioAtual` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tenants_cnpj_key`(`cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `senhaHash` VARCHAR(255) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `mfaAtivado` BOOLEAN NOT NULL DEFAULT false,
    `mfaSecret` VARCHAR(100) NULL,
    `tentativasLogin` INTEGER NOT NULL DEFAULT 0,
    `bloqueadoAte` DATETIME(3) NULL,
    `ultimoLogin` DATETIME(3) NULL,
    `refreshToken` VARCHAR(500) NULL,
    `servidorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_servidorId_key`(`servidorId`),
    INDEX `usuarios_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `usuarios_tenantId_email_key`(`tenantId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(50) NOT NULL,
    `descricao` VARCHAR(200) NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `roles_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(191) NOT NULL,
    `recurso` VARCHAR(100) NOT NULL,
    `acao` VARCHAR(50) NOT NULL,
    `descricao` VARCHAR(200) NULL,

    UNIQUE INDEX `permissions_recurso_acao_key`(`recurso`, `acao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario_roles` (
    `usuarioId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`usuarioId`, `roleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`roleId`, `permissionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `recurso` VARCHAR(100) NOT NULL,
    `acao` VARCHAR(50) NOT NULL,
    `registroId` VARCHAR(100) NULL,
    `dadosAntes` JSON NULL,
    `dadosDepois` JSON NULL,
    `ip` VARCHAR(45) NULL,
    `userAgent` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_tenantId_idx`(`tenantId`),
    INDEX `audit_logs_tenantId_recurso_idx`(`tenantId`, `recurso`),
    INDEX `audit_logs_tenantId_usuarioId_idx`(`tenantId`, `usuarioId`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notificacoes` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('FERIAS_VENCENDO', 'PROGRESSAO_DISPONIVEL', 'APROVACAO_PENDENTE', 'APROVACAO_CONCLUIDA', 'DOCUMENTO_ASSINATURA', 'CONTRATO_VENCENDO', 'ESTAGIO_PROBATORIO', 'LICENCA_VENCENDO', 'FOLHA_PROCESSADA', 'SISTEMA') NOT NULL,
    `titulo` VARCHAR(200) NOT NULL,
    `mensagem` TEXT NOT NULL,
    `lida` BOOLEAN NOT NULL DEFAULT false,
    `lidaEm` DATETIME(3) NULL,
    `link` VARCHAR(500) NULL,
    `metadados` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notificacoes_tenantId_usuarioId_lida_idx`(`tenantId`, `usuarioId`, `lida`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grupos_ocupacionais` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(20) NOT NULL,
    `nome` VARCHAR(100) NOT NULL,
    `descricao` VARCHAR(300) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,

    INDEX `grupos_ocupacionais_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `grupos_ocupacionais_tenantId_codigo_key`(`tenantId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cargos` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `grupoOcupacionalId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(20) NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `descricao` TEXT NULL,
    `cbo` VARCHAR(10) NULL,
    `escolaridadeMinima` ENUM('FUNDAMENTAL_INCOMPLETO', 'FUNDAMENTAL_COMPLETO', 'MEDIO_INCOMPLETO', 'MEDIO_COMPLETO', 'TECNICO', 'SUPERIOR_INCOMPLETO', 'SUPERIOR_COMPLETO', 'POS_GRADUACAO', 'MESTRADO', 'DOUTORADO') NOT NULL,
    `regimeJuridico` ENUM('ESTATUTARIO', 'CELETISTA', 'COMISSIONADO', 'ESTAGIARIO', 'TEMPORARIO', 'AGENTE_POLITICO') NOT NULL,
    `cargaHorariaSemanal` INTEGER NOT NULL DEFAULT 40,
    `isComissionado` BOOLEAN NOT NULL DEFAULT false,
    `simboloCC` VARCHAR(10) NULL,
    `quantidadeVagas` INTEGER NOT NULL DEFAULT 0,
    `quantidadeProvida` INTEGER NOT NULL DEFAULT 0,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cargos_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `cargos_tenantId_codigo_key`(`tenantId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tabelas_salariais` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(100) NOT NULL,
    `descricao` VARCHAR(300) NULL,
    `vigenciaIni` DATE NOT NULL,
    `vigenciaFim` DATE NULL,
    `ativa` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tabelas_salariais_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `niveis_salariais` (
    `id` VARCHAR(191) NOT NULL,
    `tabelaSalarialId` VARCHAR(191) NOT NULL,
    `nivel` VARCHAR(10) NOT NULL,
    `classe` VARCHAR(5) NOT NULL,
    `vencimentoBase` DECIMAL(12, 2) NOT NULL,
    `percentualProxClasse` DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
    `percentualProxNivel` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `intersticio` INTEGER NOT NULL DEFAULT 24,

    INDEX `niveis_salariais_tabelaSalarialId_idx`(`tabelaSalarialId`),
    UNIQUE INDEX `niveis_salariais_tabelaSalarialId_nivel_classe_key`(`tabelaSalarialId`, `nivel`, `classe`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lotacoes` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(20) NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `sigla` VARCHAR(20) NULL,
    `lotacaoPaiId` VARCHAR(191) NULL,
    `nivel` INTEGER NOT NULL DEFAULT 1,
    `ativo` BOOLEAN NOT NULL DEFAULT true,

    INDEX `lotacoes_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `lotacoes_tenantId_codigo_key`(`tenantId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `servidores` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `matricula` VARCHAR(20) NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `nomeSocial` VARCHAR(150) NULL,
    `cpf` VARCHAR(14) NOT NULL,
    `rg` VARCHAR(20) NULL,
    `rgOrgaoEmissor` VARCHAR(20) NULL,
    `rgUf` CHAR(2) NULL,
    `rgDataEmissao` DATE NULL,
    `dataNascimento` DATE NOT NULL,
    `naturalidade` VARCHAR(100) NULL,
    `nacionalidade` VARCHAR(50) NOT NULL DEFAULT 'BRASILEIRA',
    `sexo` ENUM('MASCULINO', 'FEMININO', 'NAO_INFORMADO') NOT NULL,
    `estadoCivil` ENUM('SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL', 'SEPARADO') NOT NULL,
    `corRaca` ENUM('BRANCA', 'PRETA', 'PARDA', 'AMARELA', 'INDIGENA', 'NAO_INFORMADO') NOT NULL DEFAULT 'NAO_INFORMADO',
    `escolaridade` ENUM('FUNDAMENTAL_INCOMPLETO', 'FUNDAMENTAL_COMPLETO', 'MEDIO_INCOMPLETO', 'MEDIO_COMPLETO', 'TECNICO', 'SUPERIOR_INCOMPLETO', 'SUPERIOR_COMPLETO', 'POS_GRADUACAO', 'MESTRADO', 'DOUTORADO') NOT NULL,
    `pne` BOOLEAN NOT NULL DEFAULT false,
    `tipoPne` VARCHAR(200) NULL,
    `fotoUrl` VARCHAR(500) NULL,
    `emailPessoal` VARCHAR(150) NULL,
    `emailInstitucional` VARCHAR(150) NULL,
    `telefonePessoal` VARCHAR(20) NULL,
    `celular` VARCHAR(20) NULL,
    `cep` VARCHAR(9) NULL,
    `logradouro` VARCHAR(200) NULL,
    `numero` VARCHAR(10) NULL,
    `complemento` VARCHAR(100) NULL,
    `bairro` VARCHAR(100) NULL,
    `municipio` VARCHAR(100) NULL,
    `uf` CHAR(2) NULL,
    `regimeJuridico` ENUM('ESTATUTARIO', 'CELETISTA', 'COMISSIONADO', 'ESTAGIARIO', 'TEMPORARIO', 'AGENTE_POLITICO') NOT NULL,
    `situacaoFuncional` ENUM('ATIVO', 'AFASTADO', 'CEDIDO', 'LICENCA', 'SUSPENSO', 'EXONERADO', 'APOSENTADO', 'FALECIDO') NOT NULL DEFAULT 'ATIVO',
    `cargoId` VARCHAR(191) NOT NULL,
    `tabelaSalarialId` VARCHAR(191) NOT NULL,
    `nivelSalarialId` VARCHAR(191) NOT NULL,
    `lotacaoId` VARCHAR(191) NOT NULL,
    `dataAdmissao` DATE NOT NULL,
    `dataPosse` DATE NULL,
    `dataExercicio` DATE NULL,
    `dataTermino` DATE NULL,
    `dataExoneracao` DATE NULL,
    `motivoExoneracao` VARCHAR(300) NULL,
    `cargaHorariaSemanal` INTEGER NOT NULL DEFAULT 40,
    `turno` ENUM('MANHA', 'TARDE', 'NOITE', 'INTEGRAL', 'PLANTAO_12x36', 'PLANTAO_24x48') NOT NULL DEFAULT 'INTEGRAL',
    `numeroCtps` VARCHAR(20) NULL,
    `serieCtps` VARCHAR(10) NULL,
    `ufCtps` CHAR(2) NULL,
    `pisPasep` VARCHAR(14) NULL,
    `tituloEleitor` VARCHAR(20) NULL,
    `matriculaRpps` VARCHAR(20) NULL,
    `matriculaInss` VARCHAR(20) NULL,
    `inicioMandato` DATE NULL,
    `fimMandato` DATE NULL,
    `cargo_mandato` VARCHAR(100) NULL,
    `nivelTitulacao` VARCHAR(10) NULL,
    `titulacaoComprovada` ENUM('FUNDAMENTAL_INCOMPLETO', 'FUNDAMENTAL_COMPLETO', 'MEDIO_INCOMPLETO', 'MEDIO_COMPLETO', 'TECNICO', 'SUPERIOR_INCOMPLETO', 'SUPERIOR_COMPLETO', 'POS_GRADUACAO', 'MESTRADO', 'DOUTORADO') NULL,
    `dataTitulacao` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `servidores_tenantId_idx`(`tenantId`),
    INDEX `servidores_tenantId_situacaoFuncional_idx`(`tenantId`, `situacaoFuncional`),
    INDEX `servidores_tenantId_regimeJuridico_idx`(`tenantId`, `regimeJuridico`),
    INDEX `servidores_tenantId_lotacaoId_idx`(`tenantId`, `lotacaoId`),
    UNIQUE INDEX `servidores_tenantId_matricula_key`(`tenantId`, `matricula`),
    UNIQUE INDEX `servidores_tenantId_cpf_key`(`tenantId`, `cpf`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dados_bancarios` (
    `id` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `banco` VARCHAR(10) NOT NULL,
    `nomeBanco` VARCHAR(100) NOT NULL,
    `agencia` VARCHAR(10) NOT NULL,
    `conta` VARCHAR(20) NOT NULL,
    `digito` VARCHAR(2) NOT NULL,
    `tipoConta` VARCHAR(20) NOT NULL,
    `chavePix` VARCHAR(150) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dados_bancarios_servidorId_key`(`servidorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dependentes` (
    `id` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `cpf` VARCHAR(14) NULL,
    `dataNascimento` DATE NOT NULL,
    `tipoDependente` ENUM('CONJUGE', 'COMPANHEIRO', 'FILHO', 'ENTEADO', 'MENOR_TUTELA', 'PAI', 'MAE', 'IRMAO', 'OUTROS') NOT NULL,
    `grauParentesco` VARCHAR(50) NOT NULL,
    `irrf` BOOLEAN NOT NULL DEFAULT false,
    `planoSaude` BOOLEAN NOT NULL DEFAULT false,
    `pensaoAlimenticia` BOOLEAN NOT NULL DEFAULT false,
    `percentualPensao` DECIMAL(5, 2) NULL,
    `dataInicio` DATE NOT NULL,
    `dataFim` DATE NULL,
    `motivoFim` VARCHAR(200) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,

    INDEX `dependentes_servidorId_idx`(`servidorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documentos_servidores` (
    `id` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(100) NOT NULL,
    `descricao` VARCHAR(200) NULL,
    `nomeArquivo` VARCHAR(300) NOT NULL,
    `urlArquivo` VARCHAR(500) NOT NULL,
    `tamanhoBytes` INTEGER NULL,
    `mimeType` VARCHAR(100) NULL,
    `dataValidade` DATE NULL,
    `observacao` VARCHAR(500) NULL,
    `versao` INTEGER NOT NULL DEFAULT 1,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `documentos_servidores_servidorId_idx`(`servidorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historico_funcional` (
    `id` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `dataAlteracao` DATE NOT NULL,
    `tipoAlteracao` VARCHAR(100) NOT NULL,
    `descricao` VARCHAR(300) NOT NULL,
    `cargoAnteriorId` VARCHAR(191) NULL,
    `lotacaoAnteriorId` VARCHAR(191) NULL,
    `nivelSalarialAntId` VARCHAR(191) NULL,
    `vencimentoAnterior` DECIMAL(12, 2) NULL,
    `situacaoAnterior` ENUM('ATIVO', 'AFASTADO', 'CEDIDO', 'LICENCA', 'SUSPENSO', 'EXONERADO', 'APOSENTADO', 'FALECIDO') NULL,
    `jornadadAnterior` INTEGER NULL,
    `cargoNovoId` VARCHAR(191) NULL,
    `lotacaoNovaId` VARCHAR(191) NULL,
    `nivelSalarialNovoId` VARCHAR(191) NULL,
    `vencimentoNovo` DECIMAL(12, 2) NULL,
    `situacaoNova` ENUM('ATIVO', 'AFASTADO', 'CEDIDO', 'LICENCA', 'SUSPENSO', 'EXONERADO', 'APOSENTADO', 'FALECIDO') NULL,
    `jornadaNova` INTEGER NULL,
    `portaria` VARCHAR(100) NULL,
    `lei` VARCHAR(100) NULL,
    `observacao` VARCHAR(500) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `historico_funcional_servidorId_idx`(`servidorId`),
    INDEX `historico_funcional_tenantId_dataAlteracao_idx`(`tenantId`, `dataAlteracao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `progressoes` (
    `id` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `cargoId` VARCHAR(191) NOT NULL,
    `nivelSalarialOriId` VARCHAR(191) NOT NULL,
    `nivelSalarialDestId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('HORIZONTAL_ANTIGUIDADE', 'HORIZONTAL_MERITO', 'HORIZONTAL_CAPACITACAO', 'VERTICAL_TITULACAO', 'PROMOCAO_VERTICAL', 'ENQUADRAMENTO_INICIAL', 'ENQUADRAMENTO_TEMPO_SERVICO', 'REENQUADRAMENTO_LEI') NOT NULL,
    `nivelAnterior` VARCHAR(10) NULL,
    `nivelNovo` VARCHAR(10) NULL,
    `titulacaoApresentada` ENUM('FUNDAMENTAL_INCOMPLETO', 'FUNDAMENTAL_COMPLETO', 'MEDIO_INCOMPLETO', 'MEDIO_COMPLETO', 'TECNICO', 'SUPERIOR_INCOMPLETO', 'SUPERIOR_COMPLETO', 'POS_GRADUACAO', 'MESTRADO', 'DOUTORADO') NULL,
    `urlComprovante` VARCHAR(500) NULL,
    `pontosCapacitacao` INTEGER NULL,
    `anosServico` INTEGER NULL,
    `dataCompetencia` DATE NOT NULL,
    `dataEfetivacao` DATE NULL,
    `exercicioVigencia` INTEGER NULL,
    `portaria` VARCHAR(100) NULL,
    `lei` VARCHAR(100) NULL,
    `observacao` VARCHAR(500) NULL,
    `statusAprovacao` ENUM('PENDENTE', 'APROVADO', 'REJEITADO', 'CANCELADO', 'EM_ANALISE') NOT NULL DEFAULT 'PENDENTE',
    `aprovadoPor` VARCHAR(150) NULL,
    `aprovadoEm` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `progressoes_servidorId_idx`(`servidorId`),
    INDEX `progressoes_servidorId_tipo_idx`(`servidorId`, `tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configuracoes_folha` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `diaFechamentoFolha` INTEGER NOT NULL DEFAULT 25,
    `diaPagamento` INTEGER NOT NULL DEFAULT 30,
    `percentualRpps` DECIMAL(5, 2) NOT NULL DEFAULT 14.00,
    `percentualRppsPatronal` DECIMAL(5, 2) NOT NULL DEFAULT 22.00,
    `aliquotaFgts` DECIMAL(5, 2) NOT NULL DEFAULT 8.00,
    `margemConsignavel` DECIMAL(5, 2) NOT NULL DEFAULT 35.00,
    `adiantamentoPerc` DECIMAL(5, 2) NOT NULL DEFAULT 40.00,
    `tabelaIrrf` JSON NOT NULL,
    `tabelaInss` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `configuracoes_folha_tenantId_key`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verbas` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(10) NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `descricao` VARCHAR(300) NULL,
    `tipo` ENUM('PROVENTO', 'DESCONTO', 'INFORMATIVO') NOT NULL,
    `incideIrrf` BOOLEAN NOT NULL DEFAULT false,
    `incideRpps` BOOLEAN NOT NULL DEFAULT false,
    `incideInss` BOOLEAN NOT NULL DEFAULT false,
    `incideFgts` BOOLEAN NOT NULL DEFAULT false,
    `incide13` BOOLEAN NOT NULL DEFAULT false,
    `incideFerias` BOOLEAN NOT NULL DEFAULT false,
    `formula` TEXT NULL,
    `isFixo` BOOLEAN NOT NULL DEFAULT false,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `verbas_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `verbas_tenantId_codigo_key`(`tenantId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `folhas_pagamento` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `competencia` VARCHAR(7) NOT NULL,
    `tipo` ENUM('MENSAL', 'DECIMO_TERCEIRO_PRIMEIRA', 'DECIMO_TERCEIRO_SEGUNDA', 'FERIAS', 'RESCISAO', 'SUPLEMENTAR', 'INATIVO', 'PENSIONISTA') NOT NULL,
    `status` ENUM('ABERTA', 'EM_PROCESSAMENTO', 'PROCESSADA', 'FECHADA', 'RETIFICADA') NOT NULL DEFAULT 'ABERTA',
    `totalProventos` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `totalDescontos` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `totalLiquido` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `totalServid` INTEGER NOT NULL DEFAULT 0,
    `processadaEm` DATETIME(3) NULL,
    `fechadaEm` DATETIME(3) NULL,
    `observacao` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `folhas_pagamento_tenantId_idx`(`tenantId`),
    INDEX `folhas_pagamento_tenantId_competencia_idx`(`tenantId`, `competencia`),
    UNIQUE INDEX `folhas_pagamento_tenantId_competencia_tipo_key`(`tenantId`, `competencia`, `tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itens_folha` (
    `id` VARCHAR(191) NOT NULL,
    `folhaPagamentoId` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `totalProventos` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalDescontos` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalLiquido` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `baseIrrf` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `baseRppsInss` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `baseFgts` DECIMAL(12, 2) NOT NULL DEFAULT 0,

    INDEX `itens_folha_servidorId_idx`(`servidorId`),
    UNIQUE INDEX `itens_folha_folhaPagamentoId_servidorId_key`(`folhaPagamentoId`, `servidorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itens_folha_verbas` (
    `id` VARCHAR(191) NOT NULL,
    `itemFolhaId` VARCHAR(191) NOT NULL,
    `verbaId` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(12, 2) NOT NULL,
    `quantidade` DECIMAL(8, 2) NULL,
    `referencia` DECIMAL(12, 2) NULL,
    `observacao` VARCHAR(300) NULL,

    INDEX `itens_folha_verbas_itemFolhaId_idx`(`itemFolhaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consignados` (
    `id` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `credor` VARCHAR(150) NOT NULL,
    `numeroContrato` VARCHAR(50) NOT NULL,
    `valorParcela` DECIMAL(10, 2) NOT NULL,
    `totalParcelas` INTEGER NOT NULL,
    `parcelaAtual` INTEGER NOT NULL DEFAULT 1,
    `dataInicio` DATE NOT NULL,
    `dataFim` DATE NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `consignados_servidorId_idx`(`servidorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `escalas_trabalho` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NULL,
    `nome` VARCHAR(100) NOT NULL,
    `turno` ENUM('MANHA', 'TARDE', 'NOITE', 'INTEGRAL', 'PLANTAO_12x36', 'PLANTAO_24x48') NOT NULL,
    `horaEntrada` VARCHAR(5) NOT NULL,
    `horaSaida` VARCHAR(5) NOT NULL,
    `intervaloMin` INTEGER NOT NULL DEFAULT 60,
    `horasDiarias` DECIMAL(4, 2) NOT NULL,
    `diasSemana` JSON NOT NULL,
    `toleranciaAtraso` INTEGER NOT NULL DEFAULT 10,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `servidores_escalas` (
    `id` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `escalaId` VARCHAR(191) NOT NULL,
    `dataInicio` DATE NOT NULL,
    `dataFim` DATE NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,

    INDEX `servidores_escalas_servidorId_idx`(`servidorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registros_ponto` (
    `id` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `escalaId` VARCHAR(191) NULL,
    `data` DATE NOT NULL,
    `entrada` DATETIME(3) NULL,
    `saidaAlmoco` DATETIME(3) NULL,
    `retornoAlmoco` DATETIME(3) NULL,
    `saida` DATETIME(3) NULL,
    `horasTrabalhadas` DECIMAL(5, 2) NULL,
    `horasExtras` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `horasFalta` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `ocorrencia` ENUM('FALTA_JUSTIFICADA', 'FALTA_INJUSTIFICADA', 'ATRASO', 'SAIDA_ANTECIPADA', 'HORA_EXTRA', 'COMPENSACAO', 'FERIADO', 'RECESSO', 'AFASTAMENTO') NULL,
    `justificativa` VARCHAR(300) NULL,
    `abonado` BOOLEAN NOT NULL DEFAULT false,
    `abonadoPor` VARCHAR(150) NULL,
    `abonadoEm` DATETIME(3) NULL,
    `origem` VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `registros_ponto_servidorId_idx`(`servidorId`),
    INDEX `registros_ponto_servidorId_data_idx`(`servidorId`, `data`),
    UNIQUE INDEX `registros_ponto_servidorId_data_key`(`servidorId`, `data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `banco_horas` (
    `id` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `data` DATE NOT NULL,
    `tipo` VARCHAR(20) NOT NULL,
    `horas` DECIMAL(6, 2) NOT NULL,
    `saldo` DECIMAL(8, 2) NOT NULL,
    `descricao` VARCHAR(200) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `banco_horas_servidorId_idx`(`servidorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `periodos_aquisitivos` (
    `id` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `dataInicio` DATE NOT NULL,
    `dataFim` DATE NOT NULL,
    `diasDireito` INTEGER NOT NULL DEFAULT 30,
    `diasGozados` INTEGER NOT NULL DEFAULT 0,
    `diasAbono` INTEGER NOT NULL DEFAULT 0,
    `saldoDias` INTEGER NOT NULL DEFAULT 30,
    `vencido` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `periodos_aquisitivos_servidorId_idx`(`servidorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ferias` (
    `id` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `periodoAquisitivoId` VARCHAR(191) NOT NULL,
    `dataInicio` DATE NOT NULL,
    `dataFim` DATE NOT NULL,
    `diasGozo` INTEGER NOT NULL,
    `diasAbono` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('PENDENTE', 'APROVADO', 'REJEITADO', 'CANCELADO', 'EM_ANALISE') NOT NULL DEFAULT 'PENDENTE',
    `portaria` VARCHAR(100) NULL,
    `observacao` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ferias_servidorId_idx`(`servidorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `licencas` (
    `id` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('SAUDE', 'PREMIO', 'MATERNIDADE', 'PATERNIDADE', 'MANDATO_ELETIVO', 'CAPACITACAO', 'ACIDENTE_SERVICO', 'DEPENDENTE', 'SEM_VENCIMENTOS', 'GESTANTE', 'ADOTANTE', 'NOJO', 'GALA') NOT NULL,
    `dataInicio` DATE NOT NULL,
    `dataFim` DATE NULL,
    `diasPrevistos` INTEGER NULL,
    `comOnus` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('PENDENTE', 'APROVADO', 'REJEITADO', 'CANCELADO', 'EM_ANALISE') NOT NULL DEFAULT 'PENDENTE',
    `portaria` VARCHAR(100) NULL,
    `cid` VARCHAR(10) NULL,
    `laudo` VARCHAR(500) NULL,
    `observacao` VARCHAR(500) NULL,
    `prorrogacoes` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `licencas_servidorId_idx`(`servidorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `solicitacoes_aprovacao` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('FERIAS', 'LICENCA', 'HORA_EXTRA', 'ABONO_PONTO', 'PROGRESSAO', 'AFASTAMENTO', 'RESCISAO') NOT NULL,
    `status` ENUM('PENDENTE', 'APROVADO', 'REJEITADO', 'CANCELADO', 'EM_ANALISE') NOT NULL DEFAULT 'PENDENTE',
    `titulo` VARCHAR(200) NOT NULL,
    `descricao` TEXT NULL,
    `feriasId` VARCHAR(191) NULL,
    `licencaId` VARCHAR(191) NULL,
    `dadosExtra` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `solicitacoes_aprovacao_feriasId_key`(`feriasId`),
    UNIQUE INDEX `solicitacoes_aprovacao_licencaId_key`(`licencaId`),
    INDEX `solicitacoes_aprovacao_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `solicitacoes_aprovacao_servidorId_idx`(`servidorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `etapas_aprovacao` (
    `id` VARCHAR(191) NOT NULL,
    `solicitacaoId` VARCHAR(191) NOT NULL,
    `ordem` INTEGER NOT NULL,
    `aprovadorId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDENTE', 'APROVADO', 'REJEITADO', 'CANCELADO', 'EM_ANALISE') NOT NULL DEFAULT 'PENDENTE',
    `parecer` TEXT NULL,
    `dataResposta` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `etapas_aprovacao_solicitacaoId_idx`(`solicitacaoId`),
    INDEX `etapas_aprovacao_aprovadorId_status_idx`(`aprovadorId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `concursos_publicos` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(30) NOT NULL,
    `descricao` VARCHAR(300) NOT NULL,
    `status` ENUM('PLANEJAMENTO', 'INSCRICAO', 'EM_ANDAMENTO', 'HOMOLOGADO', 'VENCIDO', 'PRORROGADO', 'CANCELADO') NOT NULL DEFAULT 'PLANEJAMENTO',
    `dataAbertura` DATE NOT NULL,
    `dataValidade` DATE NOT NULL,
    `dataHomologacao` DATE NULL,
    `editalUrl` VARCHAR(500) NULL,
    `banca` VARCHAR(150) NULL,
    `observacao` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `concursos_publicos_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `concursos_publicos_tenantId_numero_key`(`tenantId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `candidatos` (
    `id` VARCHAR(191) NOT NULL,
    `concursoId` VARCHAR(191) NOT NULL,
    `cargoId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `cpf` VARCHAR(14) NOT NULL,
    `classificacao` INTEGER NOT NULL,
    `nota` DECIMAL(6, 2) NULL,
    `convocado` BOOLEAN NOT NULL DEFAULT false,
    `dataConvocacao` DATE NULL,
    `prazoResposta` DATE NULL,
    `statusConvocacao` VARCHAR(50) NULL,
    `dataPosse` DATE NULL,
    `servidorId` VARCHAR(191) NULL,
    `observacao` VARCHAR(300) NULL,

    UNIQUE INDEX `candidatos_servidorId_key`(`servidorId`),
    INDEX `candidatos_concursoId_idx`(`concursoId`),
    UNIQUE INDEX `candidatos_concursoId_cargoId_classificacao_key`(`concursoId`, `cargoId`, `classificacao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estagios_probatorios` (
    `id` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `dataInicio` DATE NOT NULL,
    `dataFim` DATE NOT NULL,
    `status` VARCHAR(30) NOT NULL,

    UNIQUE INDEX `estagios_probatorios_servidorId_key`(`servidorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `avaliacoes_estagio` (
    `id` VARCHAR(191) NOT NULL,
    `estagioProbId` VARCHAR(191) NOT NULL,
    `periodo` INTEGER NOT NULL,
    `dataAvaliacao` DATE NOT NULL,
    `notaGeral` DECIMAL(4, 2) NULL,
    `resultado` VARCHAR(20) NOT NULL,
    `avaliadorNome` VARCHAR(150) NULL,
    `observacao` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aposentadorias` (
    `id` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('VOLUNTARIA', 'COMPULSORIA', 'INVALIDEZ', 'ESPECIAL') NOT NULL,
    `status` ENUM('SIMULACAO', 'REQUERIDA', 'EM_ANALISE', 'CONCEDIDA', 'INDEFERIDA', 'SUSPENSA') NOT NULL DEFAULT 'REQUERIDA',
    `dataRequerimento` DATE NOT NULL,
    `dataConcessao` DATE NULL,
    `dataInicioBeneficio` DATE NULL,
    `tempoContribuicao` INTEGER NULL,
    `idadeNaConcessao` INTEGER NULL,
    `mediaRemuneracao` DECIMAL(12, 2) NULL,
    `valorBeneficio` DECIMAL(12, 2) NULL,
    `portaria` VARCHAR(100) NULL,
    `fundamentoLegal` VARCHAR(300) NULL,
    `observacao` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `aposentadorias_servidorId_key`(`servidorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pensoes` (
    `id` VARCHAR(191) NOT NULL,
    `servidorOrigemId` VARCHAR(191) NOT NULL,
    `dependenteId` VARCHAR(191) NOT NULL,
    `dataInicio` DATE NOT NULL,
    `dataFim` DATE NULL,
    `motivoFim` VARCHAR(200) NULL,
    `valorBeneficio` DECIMAL(12, 2) NOT NULL,
    `percentual` DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
    `portaria` VARCHAR(100) NULL,
    `ativa` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `pensoes_servidorOrigemId_key`(`servidorOrigemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `processos_disciplinares` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(30) NOT NULL,
    `tipo` ENUM('SINDICANCIA', 'PAD', 'INVESTIGACAO_PRELIMINAR') NOT NULL,
    `status` ENUM('INSTAURADO', 'EM_INSTRUCAO', 'RELATORIO', 'JULGAMENTO', 'ENCERRADO', 'ARQUIVADO') NOT NULL DEFAULT 'INSTAURADO',
    `dataInstauracao` DATE NOT NULL,
    `dataEncerramento` DATE NULL,
    `portariaInstaur` VARCHAR(100) NULL,
    `presidente` VARCHAR(150) NULL,
    `descricaoFatos` TEXT NOT NULL,
    `penalidade` ENUM('ADVERTENCIA', 'SUSPENSAO', 'DEMISSAO', 'CASSACAO_APOSENTADORIA', 'DESTITUICAO_CARGO', 'MULTA') NULL,
    `valorMulta` DECIMAL(10, 2) NULL,
    `diasSuspensao` INTEGER NULL,
    `portariaJulg` VARCHAR(100) NULL,
    `recurso` BOOLEAN NOT NULL DEFAULT false,
    `dataRecurso` DATE NULL,
    `resultadoRecurso` VARCHAR(300) NULL,
    `observacao` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `processos_disciplinares_tenantId_idx`(`tenantId`),
    INDEX `processos_disciplinares_servidorId_idx`(`servidorId`),
    UNIQUE INDEX `processos_disciplinares_tenantId_numero_key`(`tenantId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `docs_processos_disciplinares` (
    `id` VARCHAR(191) NOT NULL,
    `processoId` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(100) NOT NULL,
    `descricao` VARCHAR(300) NOT NULL,
    `urlArquivo` VARCHAR(500) NOT NULL,
    `dataDoc` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documentos_assinatura` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(200) NOT NULL,
    `tipo` ENUM('PORTARIA', 'CONTRATO', 'TERMO_POSSE', 'FICHA_FUNCIONAL', 'RECIBO_FERIAS', 'HOLERITE', 'TERMO_RESCISAO', 'ATO_ADMINISTRATIVO', 'OUTROS') NOT NULL,
    `urlDocumento` VARCHAR(500) NOT NULL,
    `hashDocumento` VARCHAR(128) NOT NULL,
    `expiracaoEm` DATETIME(3) NULL,
    `criadoPor` VARCHAR(150) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `documentos_assinatura_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assinaturas_digitais` (
    `id` VARCHAR(191) NOT NULL,
    `documentoId` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NULL,
    `status` ENUM('PENDENTE', 'ASSINADO', 'RECUSADO', 'EXPIRADO') NOT NULL DEFAULT 'PENDENTE',
    `ordem` INTEGER NOT NULL DEFAULT 1,
    `assinadoEm` DATETIME(3) NULL,
    `ip` VARCHAR(45) NULL,
    `hashAssinatura` VARCHAR(500) NULL,
    `certificado` TEXT NULL,
    `recusadoEm` DATETIME(3) NULL,
    `motivoRecusa` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `assinaturas_digitais_documentoId_idx`(`documentoId`),
    INDEX `assinaturas_digitais_usuarioId_status_idx`(`usuarioId`, `status`),
    UNIQUE INDEX `assinaturas_digitais_documentoId_usuarioId_key`(`documentoId`, `usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configuracoes_transparencia` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `nomePortal` VARCHAR(200) NOT NULL,
    `urlPortal` VARCHAR(500) NULL,
    `atualizacaoAutomat` BOOLEAN NOT NULL DEFAULT true,
    `exibirNome` BOOLEAN NOT NULL DEFAULT true,
    `exibirCargo` BOOLEAN NOT NULL DEFAULT true,
    `exibirLotacao` BOOLEAN NOT NULL DEFAULT true,
    `exibirVinculos` BOOLEAN NOT NULL DEFAULT true,
    `exibirRemuneracao` BOOLEAN NOT NULL DEFAULT true,
    `exibirDescontos` BOOLEAN NOT NULL DEFAULT true,
    `exibirLiquido` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `configuracoes_transparencia_tenantId_key`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `publicacoes_transparencia` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `folhaPagamentoId` VARCHAR(191) NOT NULL,
    `competencia` VARCHAR(7) NOT NULL,
    `dados` JSON NOT NULL,
    `geradaEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ativa` BOOLEAN NOT NULL DEFAULT true,

    INDEX `publicacoes_transparencia_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `publicacoes_transparencia_tenantId_competencia_key`(`tenantId`, `competencia`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_DocumentoServidor` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_DocumentoServidor_AB_unique`(`A`, `B`),
    INDEX `_DocumentoServidor_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario_roles` ADD CONSTRAINT `usuario_roles_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario_roles` ADD CONSTRAINT `usuario_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacoes` ADD CONSTRAINT `notificacoes_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacoes` ADD CONSTRAINT `notificacoes_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grupos_ocupacionais` ADD CONSTRAINT `grupos_ocupacionais_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cargos` ADD CONSTRAINT `cargos_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cargos` ADD CONSTRAINT `cargos_grupoOcupacionalId_fkey` FOREIGN KEY (`grupoOcupacionalId`) REFERENCES `grupos_ocupacionais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tabelas_salariais` ADD CONSTRAINT `tabelas_salariais_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `niveis_salariais` ADD CONSTRAINT `niveis_salariais_tabelaSalarialId_fkey` FOREIGN KEY (`tabelaSalarialId`) REFERENCES `tabelas_salariais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lotacoes` ADD CONSTRAINT `lotacoes_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lotacoes` ADD CONSTRAINT `lotacoes_lotacaoPaiId_fkey` FOREIGN KEY (`lotacaoPaiId`) REFERENCES `lotacoes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `servidores` ADD CONSTRAINT `servidores_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `servidores` ADD CONSTRAINT `servidores_cargoId_fkey` FOREIGN KEY (`cargoId`) REFERENCES `cargos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `servidores` ADD CONSTRAINT `servidores_tabelaSalarialId_fkey` FOREIGN KEY (`tabelaSalarialId`) REFERENCES `tabelas_salariais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `servidores` ADD CONSTRAINT `servidores_nivelSalarialId_fkey` FOREIGN KEY (`nivelSalarialId`) REFERENCES `niveis_salariais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `servidores` ADD CONSTRAINT `servidores_lotacaoId_fkey` FOREIGN KEY (`lotacaoId`) REFERENCES `lotacoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dados_bancarios` ADD CONSTRAINT `dados_bancarios_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dependentes` ADD CONSTRAINT `dependentes_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos_servidores` ADD CONSTRAINT `documentos_servidores_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historico_funcional` ADD CONSTRAINT `historico_funcional_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historico_funcional` ADD CONSTRAINT `historico_funcional_cargoAnteriorId_fkey` FOREIGN KEY (`cargoAnteriorId`) REFERENCES `cargos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historico_funcional` ADD CONSTRAINT `historico_funcional_lotacaoAnteriorId_fkey` FOREIGN KEY (`lotacaoAnteriorId`) REFERENCES `lotacoes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `progressoes` ADD CONSTRAINT `progressoes_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `progressoes` ADD CONSTRAINT `progressoes_cargoId_fkey` FOREIGN KEY (`cargoId`) REFERENCES `cargos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `progressoes` ADD CONSTRAINT `progressoes_nivelSalarialOriId_fkey` FOREIGN KEY (`nivelSalarialOriId`) REFERENCES `niveis_salariais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `progressoes` ADD CONSTRAINT `progressoes_nivelSalarialDestId_fkey` FOREIGN KEY (`nivelSalarialDestId`) REFERENCES `niveis_salariais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `configuracoes_folha` ADD CONSTRAINT `configuracoes_folha_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `verbas` ADD CONSTRAINT `verbas_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `folhas_pagamento` ADD CONSTRAINT `folhas_pagamento_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens_folha` ADD CONSTRAINT `itens_folha_folhaPagamentoId_fkey` FOREIGN KEY (`folhaPagamentoId`) REFERENCES `folhas_pagamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens_folha` ADD CONSTRAINT `itens_folha_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens_folha_verbas` ADD CONSTRAINT `itens_folha_verbas_itemFolhaId_fkey` FOREIGN KEY (`itemFolhaId`) REFERENCES `itens_folha`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens_folha_verbas` ADD CONSTRAINT `itens_folha_verbas_verbaId_fkey` FOREIGN KEY (`verbaId`) REFERENCES `verbas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consignados` ADD CONSTRAINT `consignados_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `servidores_escalas` ADD CONSTRAINT `servidores_escalas_escalaId_fkey` FOREIGN KEY (`escalaId`) REFERENCES `escalas_trabalho`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros_ponto` ADD CONSTRAINT `registros_ponto_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros_ponto` ADD CONSTRAINT `registros_ponto_escalaId_fkey` FOREIGN KEY (`escalaId`) REFERENCES `escalas_trabalho`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `banco_horas` ADD CONSTRAINT `banco_horas_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `periodos_aquisitivos` ADD CONSTRAINT `periodos_aquisitivos_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ferias` ADD CONSTRAINT `ferias_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ferias` ADD CONSTRAINT `ferias_periodoAquisitivoId_fkey` FOREIGN KEY (`periodoAquisitivoId`) REFERENCES `periodos_aquisitivos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `licencas` ADD CONSTRAINT `licencas_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitacoes_aprovacao` ADD CONSTRAINT `solicitacoes_aprovacao_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitacoes_aprovacao` ADD CONSTRAINT `solicitacoes_aprovacao_feriasId_fkey` FOREIGN KEY (`feriasId`) REFERENCES `ferias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitacoes_aprovacao` ADD CONSTRAINT `solicitacoes_aprovacao_licencaId_fkey` FOREIGN KEY (`licencaId`) REFERENCES `licencas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `etapas_aprovacao` ADD CONSTRAINT `etapas_aprovacao_solicitacaoId_fkey` FOREIGN KEY (`solicitacaoId`) REFERENCES `solicitacoes_aprovacao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `etapas_aprovacao` ADD CONSTRAINT `etapas_aprovacao_aprovadorId_fkey` FOREIGN KEY (`aprovadorId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `concursos_publicos` ADD CONSTRAINT `concursos_publicos_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidatos` ADD CONSTRAINT `candidatos_concursoId_fkey` FOREIGN KEY (`concursoId`) REFERENCES `concursos_publicos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidatos` ADD CONSTRAINT `candidatos_cargoId_fkey` FOREIGN KEY (`cargoId`) REFERENCES `cargos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidatos` ADD CONSTRAINT `candidatos_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estagios_probatorios` ADD CONSTRAINT `estagios_probatorios_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avaliacoes_estagio` ADD CONSTRAINT `avaliacoes_estagio_estagioProbId_fkey` FOREIGN KEY (`estagioProbId`) REFERENCES `estagios_probatorios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aposentadorias` ADD CONSTRAINT `aposentadorias_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pensoes` ADD CONSTRAINT `pensoes_servidorOrigemId_fkey` FOREIGN KEY (`servidorOrigemId`) REFERENCES `servidores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pensoes` ADD CONSTRAINT `pensoes_dependenteId_fkey` FOREIGN KEY (`dependenteId`) REFERENCES `dependentes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `processos_disciplinares` ADD CONSTRAINT `processos_disciplinares_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `docs_processos_disciplinares` ADD CONSTRAINT `docs_processos_disciplinares_processoId_fkey` FOREIGN KEY (`processoId`) REFERENCES `processos_disciplinares`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assinaturas_digitais` ADD CONSTRAINT `assinaturas_digitais_documentoId_fkey` FOREIGN KEY (`documentoId`) REFERENCES `documentos_assinatura`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assinaturas_digitais` ADD CONSTRAINT `assinaturas_digitais_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assinaturas_digitais` ADD CONSTRAINT `assinaturas_digitais_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `servidores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `configuracoes_transparencia` ADD CONSTRAINT `configuracoes_transparencia_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publicacoes_transparencia` ADD CONSTRAINT `publicacoes_transparencia_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publicacoes_transparencia` ADD CONSTRAINT `publicacoes_transparencia_folhaPagamentoId_fkey` FOREIGN KEY (`folhaPagamentoId`) REFERENCES `folhas_pagamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DocumentoServidor` ADD CONSTRAINT `_DocumentoServidor_A_fkey` FOREIGN KEY (`A`) REFERENCES `documentos_assinatura`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DocumentoServidor` ADD CONSTRAINT `_DocumentoServidor_B_fkey` FOREIGN KEY (`B`) REFERENCES `servidores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
