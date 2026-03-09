const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');
const { competenciaAtual } = require('../../shared/utils/date');

// Tabela IRRF 2024/2025 (faixas mensais em R$)
const TABELA_IRRF_PADRAO = [
  { ate: 2259.20,  aliquota: 0,     deducao: 0       },
  { ate: 2826.65,  aliquota: 0.075, deducao: 169.44  },
  { ate: 3751.05,  aliquota: 0.15,  deducao: 381.44  },
  { ate: 4664.68,  aliquota: 0.225, deducao: 662.77  },
  { ate: Infinity, aliquota: 0.275, deducao: 896.00  },
];

// Tabela INSS 2024 (faixas mensais em R$)
const TABELA_INSS_PADRAO = [
  { ate: 1412.00,  aliquota: 0.075 },
  { ate: 2666.68,  aliquota: 0.09  },
  { ate: 4000.03,  aliquota: 0.12  },
  { ate: 7786.02,  aliquota: 0.14  },
];

class FolhaService {

  // ── Verbas ─────────────────────────────────────────────────

  async listarVerbas(tenantId, query = {}) {
    const where = { tenantId };
    if (query.tipo)  where.tipo  = query.tipo;
    if (query.ativo !== undefined) where.ativo = query.ativo !== 'false';
    if (query.q)     where.nome  = { contains: query.q };
    return prisma.verba.findMany({ where, orderBy: [{ tipo: 'asc' }, { codigo: 'asc' }] });
  }

  async criarVerba(tenantId, dados) {
    if (dados.isSistema || dados.codigoSistema) throw Errors.FORBIDDEN('Verbas de sistema não podem ser criadas manualmente.');
    const dup = await prisma.verba.findFirst({ where: { tenantId, codigo: dados.codigo } });
    if (dup) throw Errors.ALREADY_EXISTS(`Verba com código ${dados.codigo}`);
    return prisma.verba.create({ data: { ...dados, tenantId } });
  }

  async atualizarVerba(tenantId, id, dados) {
    const v = await prisma.verba.findFirst({ where: { id, tenantId } });
    if (!v) throw Errors.NOT_FOUND('Verba');
    if (v.isSistema) throw Errors.FORBIDDEN('Verbas de sistema não podem ser editadas.');
    const { isSistema: _, codigoSistema: __, ...dadosSeguro } = dados;
    return prisma.verba.update({ where: { id }, data: dadosSeguro });
  }

  async desativarVerba(tenantId, id) {
    const v = await prisma.verba.findFirst({ where: { id, tenantId } });
    if (!v) throw Errors.NOT_FOUND('Verba');
    if (v.isSistema) throw Errors.FORBIDDEN('Verbas de sistema não podem ser desativadas.');
    return prisma.verba.update({ where: { id }, data: { ativo: false } });
  }

  // ── Configuração ───────────────────────────────────────────

  async getConfig(tenantId) {
    let config = await prisma.configuracaoFolha.findUnique({ where: { tenantId } });
    if (!config) {
      // Cria configuração padrão na primeira chamada
      config = await prisma.configuracaoFolha.create({
        data: {
          tenantId,
          tabelaIrrf: TABELA_IRRF_PADRAO,
          tabelaInss: TABELA_INSS_PADRAO,
        },
      });
    }
    return config;
  }

  async salvarConfig(tenantId, dados) {
    return prisma.configuracaoFolha.upsert({
      where: { tenantId },
      create: { tenantId, ...dados, tabelaIrrf: dados.tabelaIrrf || TABELA_IRRF_PADRAO, tabelaInss: dados.tabelaInss || TABELA_INSS_PADRAO },
      update: dados,
    });
  }

  // ── Consignados ────────────────────────────────────────────

  async listarConsignados(tenantId, servidorId) {
    // Valida que servidor pertence ao tenant
    const srv = await prisma.servidor.findFirst({ where: { id: servidorId, tenantId } });
    if (!srv) throw Errors.NOT_FOUND('Servidor');
    return prisma.consignado.findMany({
      where: { servidorId, ativo: true },
      orderBy: { dataInicio: 'desc' },
    });
  }

  async criarConsignado(tenantId, dados) {
    const srv = await prisma.servidor.findFirst({
      where: { id: dados.servidorId, tenantId },
      include: {
        vinculos: {
          where: { atual: true },
          take: 1,
          include: { nivelSalarial: true, nivelComissionado: true },
        },
      },
    });
    if (!srv) throw Errors.NOT_FOUND('Servidor');
    const vinculo = srv.vinculos[0];
    if (!vinculo) throw Errors.NOT_FOUND('Vínculo funcional do servidor');

    // Verifica margem consignável
    const config = await this.getConfig(tenantId);
    const vencBase = vinculo.regimeJuridico === 'COMISSIONADO' && vinculo.nivelComissionado
      ? Number(vinculo.nivelComissionado.vencimento)
      : Number(vinculo.nivelSalarial.vencimentoBase);
    const margem = vencBase * (Number(config.margemConsignavel) / 100);
    const consignadosAtivos = await prisma.consignado.aggregate({
      where: { servidorId: dados.servidorId, ativo: true },
      _sum: { valorParcela: true },
    });
    const totalAtual = Number(consignadosAtivos._sum.valorParcela || 0);
    if (totalAtual + Number(dados.valorParcela) > margem) {
      throw Errors.MARGEM_CONSIGNAVEL();
    }

    return prisma.consignado.create({ data: dados });
  }

  async atualizarConsignado(tenantId, id, dados) {
    const c = await prisma.consignado.findFirst({
      where: { id },
      include: { servidor: true },
    });
    if (!c || c.servidor.tenantId !== tenantId) throw Errors.NOT_FOUND('Consignado');
    return prisma.consignado.update({ where: { id }, data: dados });
  }

  async cancelarConsignado(tenantId, id) {
    const c = await prisma.consignado.findFirst({
      where: { id },
      include: { servidor: true },
    });
    if (!c || c.servidor.tenantId !== tenantId) throw Errors.NOT_FOUND('Consignado');
    await prisma.consignado.update({ where: { id }, data: { ativo: false } });
  }

  // ── Folha de Pagamento ─────────────────────────────────────

  async listarFolhas(tenantId, query = {}, skip = 0, take = 20) {
    const where = { tenantId };
    if (query.competencia) where.competencia = query.competencia;
    if (query.tipo)        where.tipo        = query.tipo;
    if (query.status)      where.status      = query.status;

    const [folhas, total] = await prisma.$transaction([
      prisma.folhaPagamento.findMany({
        where, skip, take,
        orderBy: [{ competencia: 'desc' }, { tipo: 'asc' }],
        include: { _count: { select: { itens: true } } },
      }),
      prisma.folhaPagamento.count({ where }),
    ]);
    return { folhas, total };
  }

  async processar(tenantId, { competencia, tipo = 'MENSAL', servidorIds }) {
    if (!competencia) competencia = competenciaAtual();

    // Verifica se já existe folha fechada para esta competência/tipo
    const existente = await prisma.folhaPagamento.findUnique({
      where: { tenantId_competencia_tipo: { tenantId, competencia, tipo } },
    });
    if (existente?.status === 'FECHADA') throw Errors.FOLHA_FECHADA();

    const config = await this.getConfig(tenantId);

    // Cria ou reabre a folha
    const folha = await prisma.folhaPagamento.upsert({
      where: { tenantId_competencia_tipo: { tenantId, competencia, tipo } },
      create: { tenantId, competencia, tipo, status: 'EM_PROCESSAMENTO' },
      update: { status: 'EM_PROCESSAMENTO', totalProventos: 0, totalDescontos: 0, totalLiquido: 0, totalServid: 0 },
    });

    // Busca servidores a processar (situacaoFuncional fica no VinculoFuncional)
    const where = {
      tenantId,
      vinculos: { some: { situacaoFuncional: 'ATIVO', atual: true } },
    };
    if (servidorIds?.length) where.id = { in: servidorIds };
    const servidores = await prisma.servidor.findMany({
      where,
      include: {
        vinculos: {
          where: { situacaoFuncional: 'ATIVO', atual: true },
          take: 1,
          include: {
              nivelSalarial: true,
              nivelComissionado: true,
              gratificacaoFuncao: true,
            },
        },
        consignados: { where: { ativo: true } },
        dependentes: { where: { ativo: true, irrf: true } },
      },
    });

    // Carrega mapa de verbas de sistema uma única vez por tenant
    const verbasSistema = await prisma.verba.findMany({
      where: { tenantId, isSistema: true },
      select: { id: true, codigoSistema: true },
    });
    const verbaMap = Object.fromEntries(verbasSistema.map(v => [v.codigoSistema, v.id]));

    const _codigosObrigatorios = [
      'SYS_VENC_BASE', 'SYS_GF', 'SYS_RPPS', 'SYS_INSS', 'SYS_IRRF', 'SYS_CONSIGNADO',
      'SYS_13_PRIMEIRA', 'SYS_13_SEGUNDA', 'SYS_FERIAS', 'SYS_ABONO_FERIAS',
    ];
    const _faltando = _codigosObrigatorios.filter(c => !verbaMap[c]);
    if (_faltando.length > 0) {
      throw new Error(`Verbas de sistema ausentes: ${_faltando.join(', ')}. Execute: node prisma/seed-verbas-sistema.js`);
    }

    let totalProventos = 0, totalDescontos = 0, totalServid = 0;

    for (const srv of servidores) {
      const resultado = await this._calcularServidor(srv, config, tipo, verbaMap);

      // Upsert item da folha
      const item = await prisma.itemFolha.upsert({
        where: { folhaPagamentoId_servidorId: { folhaPagamentoId: folha.id, servidorId: srv.id } },
        create: { folhaPagamentoId: folha.id, servidorId: srv.id, ...resultado.totais },
        update: resultado.totais,
      });

      // Remove verbas antigas e insere novas
      await prisma.itemFolhaVerba.deleteMany({ where: { itemFolhaId: item.id } });
      if (resultado.verbas.length > 0) {
        await prisma.itemFolhaVerba.createMany({
          data: resultado.verbas.map(v => ({ itemFolhaId: item.id, ...v })),
        });
      }

      totalProventos += resultado.totais.totalProventos;
      totalDescontos += resultado.totais.totalDescontos;
      totalServid++;
    }

    // Atualiza totais da folha
    const folhaFinal = await prisma.folhaPagamento.update({
      where: { id: folha.id },
      data: {
        status: 'PROCESSADA',
        totalProventos,
        totalDescontos,
        totalLiquido: totalProventos - totalDescontos,
        totalServid,
        processadaEm: new Date(),
      },
    });

    return { folha: folhaFinal, totalServid, totalProventos, totalDescontos, totalLiquido: totalProventos - totalDescontos };
  }

  async _calcularServidor(srv, config, tipoFolha, verbaMap) {
    const vinculo = srv.vinculos[0];
    if (!vinculo) throw new Error(`Servidor ${srv.matricula} sem vínculo ativo.`);
    const regimeJuridico = vinculo.regimeJuridico;

    // Para comissionados, o vencimento vem do NivelComissionado; para os demais, do NivelSalarial
    let vencimentoBase;
    if (regimeJuridico === 'COMISSIONADO' && vinculo.nivelComissionado) {
      vencimentoBase = Number(vinculo.nivelComissionado.vencimento);
    } else {
      vencimentoBase = Number(vinculo.nivelSalarial.vencimentoBase);
    }

    const verbas = [];
    let totalProventos = 0;
    let totalDescontos = 0;

    // ── PROVENTOS ─────────────────────────────────────────────

    // Vencimento base
    verbas.push({ verbaId: verbaMap['SYS_VENC_BASE'], valor: vencimentoBase, referencia: vencimentoBase, observacao: 'Vencimento Base' });
    totalProventos += vencimentoBase;

    // Gratificação de Função (somente comissionados)
    if (regimeJuridico === 'COMISSIONADO' && vinculo.gratificacaoFuncao) {
      const percGf = Number(vinculo.gratificacaoFuncao.percentual) / 100;
      const valorGf = parseFloat((vencimentoBase * percGf).toFixed(2));
      verbas.push({ verbaId: verbaMap['SYS_GF'], valor: valorGf, referencia: percGf * 100, observacao: `GF - ${vinculo.gratificacaoFuncao.simbolo} (${Number(vinculo.gratificacaoFuncao.percentual).toFixed(0)}%)` });
      totalProventos += valorGf;
    }

    // 13º salário
    if (tipoFolha === 'DECIMO_TERCEIRO_PRIMEIRA') {
      const adiantamento = parseFloat((vencimentoBase / 2).toFixed(2));
      verbas.push({ verbaId: verbaMap['SYS_13_PRIMEIRA'], valor: adiantamento, referencia: vencimentoBase, observacao: '13º Salário - 1ª Parcela' });
      totalProventos += adiantamento;
    }
    if (tipoFolha === 'DECIMO_TERCEIRO_SEGUNDA') {
      const decimo = vencimentoBase;
      verbas.push({ verbaId: verbaMap['SYS_13_SEGUNDA'], valor: decimo, referencia: vencimentoBase, observacao: '13º Salário - 2ª Parcela' });
      totalProventos += decimo;
    }

    // ── DESCONTOS ─────────────────────────────────────────────

    // RPPS ou INSS conforme regime
    const basePrevidencia = vencimentoBase;
    let descontoPrevidencia = 0;

    if (['ESTATUTARIO', 'COMISSIONADO'].includes(regimeJuridico)) {
      descontoPrevidencia = this._calcularRpps(basePrevidencia, config);
      verbas.push({ verbaId: verbaMap['SYS_RPPS'], valor: descontoPrevidencia, referencia: basePrevidencia, observacao: 'RPPS' });
    } else if (['CELETISTA', 'ESTAGIARIO', 'TEMPORARIO'].includes(regimeJuridico)) {
      descontoPrevidencia = this._calcularInss(basePrevidencia, config.tabelaInss);
      verbas.push({ verbaId: verbaMap['SYS_INSS'], valor: descontoPrevidencia, referencia: basePrevidencia, observacao: 'INSS' });
    }
    totalDescontos += descontoPrevidencia;

    // IRRF
    const numDependentes = srv.dependentes?.length || 0;
    const deducaoDependentes = numDependentes * 189.59;
    const baseIrrf = Math.max(0, totalProventos - descontoPrevidencia - deducaoDependentes);
    const irrf = this._calcularIrrf(baseIrrf, config.tabelaIrrf);
    if (irrf > 0) {
      verbas.push({ verbaId: verbaMap['SYS_IRRF'], valor: irrf, referencia: baseIrrf, observacao: `IRRF (${numDependentes} dep.)` });
      totalDescontos += irrf;
    }

    // Consignados
    for (const c of srv.consignados || []) {
      const parcela = Number(c.valorParcela);
      verbas.push({ verbaId: verbaMap['SYS_CONSIGNADO'], valor: parcela, observacao: `Consignado - ${c.credor}` });
      totalDescontos += parcela;
    }

    return {
      verbas,
      totais: {
        totalProventos,
        totalDescontos,
        totalLiquido: totalProventos - totalDescontos,
        baseIrrf,
        baseRppsInss: basePrevidencia,
        baseFgts: ['CELETISTA'].includes(regimeJuridico) ? vencimentoBase : 0,
      },
    };
  }

  _calcularRpps(base, config) {
    // Alíquota progressiva conforme EC 103/2019
    const aliquotaRpps = Number(config.percentualRpps) / 100;
    return parseFloat((base * aliquotaRpps).toFixed(2));
  }

  _calcularInss(base, tabelaInss) {
    // Cálculo progressivo por faixas
    const tabela = Array.isArray(tabelaInss) ? tabelaInss : TABELA_INSS_PADRAO;
    let desconto = 0;
    let baseRestante = base;
    let faixaAnterior = 0;

    for (const faixa of tabela) {
      if (baseRestante <= 0) break;
      const teto = Math.min(base, faixa.ate);
      const baseNaFaixa = Math.max(0, teto - faixaAnterior);
      desconto += baseNaFaixa * faixa.aliquota;
      faixaAnterior = faixa.ate;
      if (base <= faixa.ate) break;
    }
    return parseFloat(desconto.toFixed(2));
  }

  _calcularIrrf(base, tabelaIrrf) {
    const tabela = Array.isArray(tabelaIrrf) ? tabelaIrrf : TABELA_IRRF_PADRAO;
    if (base <= tabela[0].ate) return 0;
    for (const faixa of tabela) {
      if (base <= faixa.ate) {
        return parseFloat((base * faixa.aliquota - faixa.deducao).toFixed(2));
      }
    }
    const ultima = tabela[tabela.length - 1];
    return parseFloat((base * ultima.aliquota - ultima.deducao).toFixed(2));
  }

  async buscarFolha(tenantId, competencia, tipo) {
    const folha = await prisma.folhaPagamento.findFirst({
      where: { tenantId, competencia, tipo },
      include: { _count: { select: { itens: true } } },
    });
    if (!folha) throw Errors.NOT_FOUND('Folha de Pagamento');
    return folha;
  }

  async excluir(tenantId, competencia, tipo) {
    const folha = await prisma.folhaPagamento.findFirst({ where: { tenantId, competencia, tipo } });
    if (!folha) throw Errors.NOT_FOUND('Folha de Pagamento');

    await prisma.$transaction([
      prisma.itemFolhaVerba.deleteMany({ where: { itemFolha: { folhaPagamentoId: folha.id } } }),
      prisma.itemFolha.deleteMany({ where: { folhaPagamentoId: folha.id } }),
      prisma.folhaPagamento.delete({ where: { id: folha.id } }),
    ]);

    return { message: 'Folha excluída' };
  }

  async reprocessarServidor(tenantId, competencia, tipo, servidorId) {
    const folha = await prisma.folhaPagamento.findFirst({ where: { tenantId, competencia, tipo } });
    if (!folha) throw Errors.NOT_FOUND('Folha de Pagamento');
    if (folha.status === 'FECHADA') throw Errors.FOLHA_FECHADA();

    const srv = await prisma.servidor.findFirst({
      where: {
        tenantId,
        id: servidorId,
        vinculos: { some: { situacaoFuncional: 'ATIVO', atual: true } },
      },
      include: {
        vinculos: {
          where: { situacaoFuncional: 'ATIVO', atual: true },
          take: 1,
          include: {
            nivelSalarial: true,
            nivelComissionado: true,
            gratificacaoFuncao: true,
          },
        },
        consignados: { where: { ativo: true } },
        dependentes: { where: { ativo: true, irrf: true } },
      },
    });
    if (!srv) throw Errors.NOT_FOUND('Servidor');

    const config = await this.getConfig(tenantId);
    const verbasSistema = await prisma.verba.findMany({ where: { tenantId, isSistema: true }, select: { id: true, codigoSistema: true } });
    const verbaMap = Object.fromEntries(verbasSistema.map(v => [v.codigoSistema, v.id]));

    const resultado = await this._calcularServidor(srv, config, tipo, verbaMap);

    const item = await prisma.itemFolha.upsert({
      where: { folhaPagamentoId_servidorId: { folhaPagamentoId: folha.id, servidorId: srv.id } },
      create: { folhaPagamentoId: folha.id, servidorId: srv.id, ...resultado.totais },
      update: resultado.totais,
    });

    await prisma.itemFolhaVerba.deleteMany({ where: { itemFolhaId: item.id } });
    if (resultado.verbas.length) {
      await prisma.itemFolhaVerba.createMany({ data: resultado.verbas.map(v => ({ itemFolhaId: item.id, ...v })) });
    }

    const totals = await prisma.itemFolha.aggregate({
      where: { folhaPagamentoId: folha.id },
      _sum: { totalProventos: true, totalDescontos: true, totalLiquido: true },
      _count: { servidorId: true },
    });
    await prisma.folhaPagamento.update({
      where: { id: folha.id },
      data: {
        totalProventos: totals._sum.totalProventos || 0,
        totalDescontos: totals._sum.totalDescontos || 0,
        totalLiquido: totals._sum.totalLiquido || 0,
        totalServid: totals._count.servidorId || 0,
      },
    });

    return { servidorId: srv.id, folhaId: folha.id };
  }

  async listarItens(tenantId, competencia, tipo, query = {}, skip = 0, take = 20) {
    const folha = await this.buscarFolha(tenantId, competencia, tipo);
    return this._listarItensPorFolhaId(tenantId, folha.id, query, skip, take);
  }

  async listarItensPorId(tenantId, folhaId, query = {}, skip = 0, take = 20) {
    const folha = await prisma.folhaPagamento.findFirst({ where: { id: folhaId, tenantId } });
    if (!folha) throw Errors.NOT_FOUND('Folha de Pagamento');
    return this._listarItensPorFolhaId(tenantId, folhaId, query, skip, take);
  }

  async _listarItensPorFolhaId(tenantId, folhaId, query = {}, skip = 0, take = 20) {
    const where = { folhaPagamentoId: folhaId };
    if (query.servidorId) where.servidorId = query.servidorId;
    if (query.search) {
      where.servidor = {
        OR: [
          { nome:      { contains: query.search } },
          { matricula: { contains: query.search } },
        ],
      };
    }

    const [itens, total] = await prisma.$transaction([
      prisma.itemFolha.findMany({
        where, skip, take,
        orderBy: { servidor: { nome: 'asc' } },
        include: {
          servidor: {
            select: {
              id: true,
              matricula: true,
              nome: true,
              vinculos: {
                where: { atual: true },
                take: 1,
                select: {
                  cargo:   { select: { nome: true } },
                  lotacao: { select: { nome: true } },
                },
              },
            },
          },
          verbas: {
            include: { verba: { select: { id: true, codigo: true, nome: true, tipo: true, codigoSistema: true } } },
          },
        },
      }),
      prisma.itemFolha.count({ where }),
    ]);

    const itensFormatados = itens.map(item => ({
      ...item,
      servidor: {
        id:        item.servidor.id,
        matricula: item.servidor.matricula,
        nome:      item.servidor.nome,
        cargo:     item.servidor.vinculos[0]?.cargo?.nome  ?? '—',
        lotacao:   item.servidor.vinculos[0]?.lotacao?.nome ?? '—',
      },
      verbas: item.verbas.map(v => ({
        id:           v.id,
        verbaId:      v.verbaId,
        codigo:       v.verba?.codigo,
        nome:         v.verba?.nome,
        tipo:         v.verba?.tipo,
        codigoSistema: v.verba?.codigoSistema,
        valor:        Number(v.valor),
        quantidade:   v.quantidade ? Number(v.quantidade) : null,
        referencia:   v.referencia ? Number(v.referencia) : null,
        observacao:   v.observacao,
      })),
    }));

    return { itens: itensFormatados, total };
  }

  async fechar(tenantId, competencia, tipo) {
    const folha = await this.buscarFolha(tenantId, competencia, tipo);
    if (folha.status === 'FECHADA') throw Errors.FOLHA_FECHADA();
    if (folha.status !== 'PROCESSADA') throw Errors.VALIDATION('Folha precisa estar processada antes de fechar.');

    return prisma.folhaPagamento.update({
      where: { id: folha.id },
      data: { status: 'FECHADA', fechadaEm: new Date() },
    });
  }

  async reabrir(tenantId, competencia, tipo) {
    const folha = await this.buscarFolha(tenantId, competencia, tipo);
    if (folha.status !== 'FECHADA') throw Errors.VALIDATION('Apenas folhas fechadas podem ser reabertas.');
    return prisma.folhaPagamento.update({
      where: { id: folha.id },
      data: { status: 'PROCESSADA' },
    });
  }

  async excluir(tenantId, competencia, tipo) {
    // somente permite exclusão de folhas que não estejam fechadas
    const folha = await this.buscarFolha(tenantId, competencia, tipo);
    if (folha.status === 'FECHADA') throw Errors.VALIDATION('Não é possível excluir folha fechada.');

    // apaga itens e verbas manualmente porque não há cascade na relação
    await prisma.itemFolhaVerba.deleteMany({
      where: { itemFolha: { folhaPagamentoId: folha.id } },
    });
    await prisma.itemFolha.deleteMany({
      where: { folhaPagamentoId: folha.id },
    });
    await prisma.folhaPagamento.delete({ where: { id: folha.id } });
    return { success: true };
  }

  async holerite(tenantId, servidorId, competencia, tipo) {
    const srv = await prisma.servidor.findFirst({
      where: { id: servidorId, tenantId },
      include: {
        vinculos: {
          where: { atual: true },
          take: 1,
          include: {
            cargo: true,
            lotacao: true,
            nivelSalarial: { include: { tabelaSalarial: true } },
          },
        },
      },
    });
    if (!srv) throw Errors.NOT_FOUND('Servidor');
    const vinculo = srv.vinculos[0];
    if (!vinculo) throw Errors.NOT_FOUND('Vínculo funcional do servidor');

    const folhaWhere = { tenantId, competencia };
    if (tipo) folhaWhere.tipo = tipo;

    const item = await prisma.itemFolha.findFirst({
      where: {
        servidorId,
        folhaPagamento: folhaWhere,
      },
      orderBy: { folhaPagamento: { processadaEm: 'desc' } },
      include: {
        verbas: {
          include: { verba: { select: { id: true, codigo: true, nome: true, tipo: true, codigoSistema: true } } },
        },
        folhaPagamento: { select: { id: true, competencia: true, tipo: true, status: true } },
      },
    });
    if (!item) throw Errors.NOT_FOUND(`Holerite para competência ${competencia}`);

    const verbas = item.verbas.map(v => ({
      id:           v.id,
      codigo:       v.verba?.codigo,
      nome:         v.verba?.nome ?? v.observacao,
      tipo:         v.verba?.tipo,
      codigoSistema: v.verba?.codigoSistema,
      valor:        Number(v.valor),
      referencia:   v.referencia ? Number(v.referencia) : null,
      quantidade:   v.quantidade ? Number(v.quantidade) : null,
      observacao:   v.observacao,
    }));

    return {
      folhaId:     item.folhaPagamento.id,
      competencia: item.folhaPagamento.competencia,
      tipo:        item.folhaPagamento.tipo,
      status:      item.folhaPagamento.status,
      servidor: {
        id:        srv.id,
        matricula: srv.matricula,
        nome:      srv.nome,
        cpf:       srv.cpf,
        cargo:     vinculo.cargo?.nome,
        lotacao:   vinculo.lotacao?.nome,
        regime:    vinculo.regimeJuridico,
        nivel:     vinculo.nivelSalarial?.nivel,
        classe:    vinculo.nivelSalarial?.classe,
        tabela:    vinculo.nivelSalarial?.tabelaSalarial?.nome,
      },
      proventos:  verbas.filter(v => v.tipo === 'PROVENTO'),
      descontos:  verbas.filter(v => v.tipo === 'DESCONTO'),
      informativos: verbas.filter(v => v.tipo === 'INFORMATIVO'),
      totais: {
        bruto:          Number(item.totalProventos),
        descontos:      Number(item.totalDescontos),
        liquido:        Number(item.totalLiquido),
        baseIrrf:       item.baseIrrf    ? Number(item.baseIrrf)    : null,
        basePrevidencia: item.baseRppsInss ? Number(item.baseRppsInss) : null,
        baseFgts:       item.baseFgts    ? Number(item.baseFgts)    : null,
      },
    };
  }

  async relatorioAnalitico(tenantId, competencia, tipo) {
    const folha = await this.buscarFolha(tenantId, competencia, tipo);

    const itens = await prisma.itemFolha.findMany({
      where: { folhaPagamentoId: folha.id },
      orderBy: [
        { servidor: { vinculos: { _count: 'asc' } } },
        { servidor: { nome: 'asc' } },
      ],
      include: {
        servidor: {
          select: {
            id: true, matricula: true, nome: true, cpf: true,
            vinculos: {
              where: { atual: true },
              take: 1,
              select: {
                regimeJuridico: true,
                dataAdmissao: true,
                cargo:   { select: { nome: true } },
                lotacao: { select: { nome: true, sigla: true } },
                nivelSalarial: { select: { nivel: true, classe: true } },
              },
            },
          },
        },
        verbas: {
          include: { verba: { select: { codigo: true, nome: true, tipo: true, codigoSistema: true } } },
          orderBy: [{ verba: { tipo: 'asc' } }, { verba: { codigo: 'asc' } }],
        },
      },
    });

    const servidoresFormatados = itens.map(item => {
      const vinculo = item.servidor.vinculos[0];
      return {
        id:        item.id,
        matricula: item.servidor.matricula,
        nome:      item.servidor.nome,
        cpf:       item.servidor.cpf,
        cargo:     vinculo?.cargo?.nome    ?? '—',
        lotacao:   vinculo?.lotacao?.nome  ?? '—',
        lotacaoSigla: vinculo?.lotacao?.sigla ?? '—',
        regime:    vinculo?.regimeJuridico ?? '—',
        admissao:  vinculo?.dataAdmissao   ?? null,
        nivel:     vinculo?.nivelSalarial?.nivel ?? null,
        classe:    vinculo?.nivelSalarial?.classe ?? null,
        proventos: item.verbas
          .filter(v => v.verba?.tipo === 'PROVENTO')
          .map(v => ({
            codigo: v.verba?.codigo, nome: v.verba?.nome ?? v.observacao,
            valor: Number(v.valor), referencia: v.referencia ? Number(v.referencia) : null,
            fator: v.quantidade ? Number(v.quantidade) : 1,
          })),
        descontos: item.verbas
          .filter(v => v.verba?.tipo === 'DESCONTO')
          .map(v => ({
            codigo: v.verba?.codigo, nome: v.verba?.nome ?? v.observacao,
            valor: Number(v.valor), referencia: v.referencia ? Number(v.referencia) : null,
            fator: v.quantidade ? Number(v.quantidade) : null,
          })),
        totalProventos: Number(item.totalProventos),
        totalDescontos: Number(item.totalDescontos),
        totalLiquido:   Number(item.totalLiquido),
        baseIrrf:       item.baseIrrf    ? Number(item.baseIrrf)    : null,
        basePrevidencia: item.baseRppsInss ? Number(item.baseRppsInss) : null,
      };
    });

    return {
      folha: {
        id: folha.id, competencia: folha.competencia, tipo: folha.tipo,
        status: folha.status, processadaEm: folha.processadaEm,
        totalProventos: Number(folha.totalProventos),
        totalDescontos: Number(folha.totalDescontos),
        totalLiquido:   Number(folha.totalLiquido),
        totalServid:    folha.totalServid,
      },
      servidores: servidoresFormatados,
    };
  }

  async relatorioSintetico(tenantId, competencia, tipo) {
    const folha = await this.buscarFolha(tenantId, competencia, tipo);

    const itens = await prisma.itemFolha.findMany({
      where: { folhaPagamentoId: folha.id },
      orderBy: { servidor: { nome: 'asc' } },
      include: {
        servidor: {
          select: {
            id: true, matricula: true, nome: true,
            vinculos: {
              where: { atual: true },
              take: 1,
              select: {
                cargo:   { select: { nome: true } },
                lotacao: { select: { nome: true, sigla: true } },
              },
            },
          },
        },
      },
    });

    const linhas = itens.map(item => {
      const vinculo = item.servidor.vinculos[0];
      return {
        id:            item.id,
        matricula:     item.servidor.matricula,
        nome:          item.servidor.nome,
        cargo:         vinculo?.cargo?.nome   ?? '—',
        lotacao:       vinculo?.lotacao?.nome ?? '—',
        totalProventos: Number(item.totalProventos),
        totalDescontos: Number(item.totalDescontos),
        totalLiquido:   Number(item.totalLiquido),
      };
    });

    return {
      folha: {
        id: folha.id, competencia: folha.competencia, tipo: folha.tipo,
        status: folha.status, processadaEm: folha.processadaEm,
        totalProventos: Number(folha.totalProventos),
        totalDescontos: Number(folha.totalDescontos),
        totalLiquido:   Number(folha.totalLiquido),
        totalServid:    folha.totalServid,
      },
      linhas,
    };
  }
}

module.exports = FolhaService;
