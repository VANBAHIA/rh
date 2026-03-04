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
    const dup = await prisma.verba.findFirst({ where: { tenantId, codigo: dados.codigo } });
    if (dup) throw Errors.ALREADY_EXISTS(`Verba com código ${dados.codigo}`);
    return prisma.verba.create({ data: { ...dados, tenantId } });
  }

  async atualizarVerba(tenantId, id, dados) {
    const v = await prisma.verba.findFirst({ where: { id, tenantId } });
    if (!v) throw Errors.NOT_FOUND('Verba');
    return prisma.verba.update({ where: { id }, data: dados });
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
      include: { nivelSalarial: true },
    });
    if (!srv) throw Errors.NOT_FOUND('Servidor');

    // Verifica margem consignável
    const config = await this.getConfig(tenantId);
    const margem = Number(srv.nivelSalarial.vencimentoBase) * (Number(config.margemConsignavel) / 100);
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

    // Busca servidores a processar
    const where = { tenantId, situacaoFuncional: 'ATIVO' };
    if (servidorIds?.length) where.id = { in: servidorIds };
    const servidores = await prisma.servidor.findMany({
      where,
      include: {
        nivelSalarial: true,
        consignados: { where: { ativo: true } },
        dependentes: { where: { ativo: true, irrf: true } },
      },
    });

    let totalProventos = 0, totalDescontos = 0, totalServid = 0;

    for (const srv of servidores) {
      const resultado = await this._calcularServidor(srv, config, tipo);

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

  async _calcularServidor(srv, config, tipoFolha) {
    const vencimentoBase = Number(srv.nivelSalarial.vencimentoBase);
    const verbas = [];
    let totalProventos = 0;
    let totalDescontos = 0;

    // ── PROVENTOS ─────────────────────────────────────────────

    // Vencimento base
    verbas.push({ verbaId: null, valor: vencimentoBase, referencia: vencimentoBase, observacao: 'Vencimento Base' });
    totalProventos += vencimentoBase;

    // 13º salário
    if (tipoFolha === 'DECIMO_TERCEIRO_SEGUNDA') {
      const decimo = vencimentoBase;
      verbas.push({ verbaId: null, valor: decimo, referencia: vencimentoBase, observacao: '13º Salário - 2ª Parcela' });
      totalProventos += decimo;
    }

    // ── DESCONTOS ─────────────────────────────────────────────

    // RPPS ou INSS conforme regime
    let basePrevidencia = vencimentoBase;
    let descontoPrevidencia = 0;

    if (['ESTATUTARIO', 'COMISSIONADO'].includes(srv.regimeJuridico)) {
      // RPPS — alíquota progressiva (EC 103/2019)
      descontoPrevidencia = this._calcularRpps(basePrevidencia, config);
      verbas.push({ verbaId: null, valor: descontoPrevidencia, observacao: 'RPPS' });
    } else if (['CELETISTA', 'ESTAGIARIO', 'TEMPORARIO'].includes(srv.regimeJuridico)) {
      // INSS — tabela progressiva
      descontoPrevidencia = this._calcularInss(basePrevidencia, config.tabelaInss);
      verbas.push({ verbaId: null, valor: descontoPrevidencia, observacao: 'INSS' });
    }
    totalDescontos += descontoPrevidencia;

    // IRRF
    const numDependentes = srv.dependentes?.length || 0;
    const deducaoDependentes = numDependentes * 189.59; // Valor 2024
    const baseIrrf = Math.max(0, totalProventos - descontoPrevidencia - deducaoDependentes);
    const irrf = this._calcularIrrf(baseIrrf, config.tabelaIrrf);
    if (irrf > 0) {
      verbas.push({ verbaId: null, valor: irrf, referencia: baseIrrf, observacao: `IRRF (${numDependentes} dep.)` });
      totalDescontos += irrf;
    }

    // Consignados
    for (const c of srv.consignados || []) {
      const parcela = Number(c.valorParcela);
      verbas.push({ verbaId: null, valor: parcela, observacao: `Consignado - ${c.credor}` });
      totalDescontos += parcela;
    }

    return {
      verbas: verbas.filter(v => v.verbaId !== null || v.observacao), // filtra apenas os que têm info
      totais: {
        totalProventos,
        totalDescontos,
        totalLiquido: totalProventos - totalDescontos,
        baseIrrf,
        baseRppsInss: basePrevidencia,
        baseFgts: ['CELETISTA'].includes(srv.regimeJuridico) ? vencimentoBase : 0,
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

  async listarItens(tenantId, competencia, tipo, query = {}, skip = 0, take = 20) {
    const folha = await this.buscarFolha(tenantId, competencia, tipo);
    const where = { folhaPagamentoId: folha.id };
    if (query.servidorId) where.servidorId = query.servidorId;

    const [itens, total] = await prisma.$transaction([
      prisma.itemFolha.findMany({
        where, skip, take,
        include: {
          servidor: { select: { id: true, matricula: true, nome: true, regimeJuridico: true,
            cargo: { select: { nome: true } }, lotacao: { select: { nome: true } } } },
          verbas: true,
        },
      }),
      prisma.itemFolha.count({ where }),
    ]);
    return { itens, total };
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

  async holerite(tenantId, servidorId, competencia) {
    const srv = await prisma.servidor.findFirst({
      where: { id: servidorId, tenantId },
      include: {
        cargo: true, lotacao: true,
        nivelSalarial: { include: { tabelaSalarial: true } },
      },
    });
    if (!srv) throw Errors.NOT_FOUND('Servidor');

    const item = await prisma.itemFolha.findFirst({
      where: {
        servidorId,
        folhaPagamento: { tenantId, competencia, tipo: 'MENSAL' },
      },
      include: {
        verbas: true,
        folhaPagamento: { select: { competencia: true, tipo: true, status: true } },
      },
    });
    if (!item) throw Errors.NOT_FOUND(`Holerite para competência ${competencia}`);

    return {
      servidor: {
        matricula: srv.matricula, nome: srv.nome,
        cargo: srv.cargo.nome, lotacao: srv.lotacao.nome,
        regime: srv.regimeJuridico,
        nivel: srv.nivelSalarial.nivel, classe: srv.nivelSalarial.classe,
      },
      competencia: item.folhaPagamento.competencia,
      proventos: item.verbas.filter(v => v.valor > 0),
      descontos: item.verbas.filter(v => v.valor < 0).map(v => ({ ...v, valor: Math.abs(v.valor) })),
      totais: {
        bruto: item.totalProventos,
        descontos: item.totalDescontos,
        liquido: item.totalLiquido,
        baseIrrf: item.baseIrrf,
        basePrevidencia: item.baseRppsInss,
      },
    };
  }
}

module.exports = FolhaService;
