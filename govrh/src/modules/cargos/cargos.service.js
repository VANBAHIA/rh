const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');

class CargosService {

  // ── Grupos Ocupacionais ────────────────────────────────────

  async listarGrupos(tenantId, query = {}) {
    const where = { tenantId };
    if (query.ativo !== undefined) where.ativo = query.ativo === 'true';
    if (query.q) where.nome = { contains: query.q };

    return prisma.grupoOcupacional.findMany({
      where,
      orderBy: { nome: 'asc' },
      include: { _count: { select: { cargos: true } } },
    });
  }

  async criarGrupo(tenantId, dados) {
    const existente = await prisma.grupoOcupacional.findFirst({
      where: { tenantId, codigo: dados.codigo },
    });
    if (existente) throw Errors.ALREADY_EXISTS('Grupo com este código');

    return prisma.grupoOcupacional.create({
      data: { ...dados, tenantId },
    });
  }

  async atualizarGrupo(tenantId, id, dados) {
    await this._findGrupo(tenantId, id);
    return prisma.grupoOcupacional.update({ where: { id }, data: dados });
  }

  async desativarGrupo(tenantId, id) {
    await this._findGrupo(tenantId, id);
    // Verifica se há cargos ativos vinculados
    const cargosAtivos = await prisma.cargo.count({ where: { grupoOcupacionalId: id, ativo: true } });
    if (cargosAtivos > 0) throw Errors.VALIDATION(`Grupo possui ${cargosAtivos} cargo(s) ativo(s). Desative-os primeiro.`);
    await prisma.grupoOcupacional.update({ where: { id }, data: { ativo: false } });
  }

  async _findGrupo(tenantId, id) {
    const g = await prisma.grupoOcupacional.findFirst({ where: { id, tenantId } });
    if (!g) throw Errors.NOT_FOUND('Grupo Ocupacional');
    return g;
  }

  // ── Cargos ─────────────────────────────────────────────────

  async listarCargos(tenantId, query = {}, skip = 0, take = 20) {
    const where = { tenantId };
    if (query.ativo !== undefined) where.ativo = query.ativo !== 'false';
    if (query.grupoId)  where.grupoOcupacionalId = query.grupoId;
    if (query.regime)   where.regimeJuridico = query.regime;
    if (query.q) {
      where.OR = [
        { nome:   { contains: query.q } },
        { codigo: { contains: query.q } },
      ];
    }

    const [cargos, total] = await prisma.$transaction([
      prisma.cargo.findMany({
        where, skip, take,
        orderBy: [{ grupoOcupacional: { nome: 'asc' } }, { nome: 'asc' }],
        include: {
          grupoOcupacional: { select: { nome: true, codigo: true } },
          _count: { select: { servidores: true } },
        },
      }),
      prisma.cargo.count({ where }),
    ]);

    return { cargos, total };
  }

  async criarCargo(tenantId, dados) {
    const existente = await prisma.cargo.findFirst({
      where: { tenantId, codigo: dados.codigo },
    });
    if (existente) throw Errors.ALREADY_EXISTS('Cargo com este código');

    // Valida grupo
    const grupo = await prisma.grupoOcupacional.findFirst({
      where: { id: dados.grupoOcupacionalId, tenantId },
    });
    if (!grupo) throw Errors.NOT_FOUND('Grupo Ocupacional');

    return prisma.cargo.create({
      data: { ...dados, tenantId },
      include: { grupoOcupacional: true },
    });
  }

  async buscarCargo(tenantId, id) {
    const cargo = await prisma.cargo.findFirst({
      where: { id, tenantId },
      include: {
        grupoOcupacional: true,
        _count: { select: { servidores: true } },
      },
    });
    if (!cargo) throw Errors.NOT_FOUND('Cargo');
    return cargo;
  }

  async atualizarCargo(tenantId, id, dados) {
    await this.buscarCargo(tenantId, id);

    // Se está mudando o código, verifica duplicidade
    if (dados.codigo) {
      const dup = await prisma.cargo.findFirst({
        where: { tenantId, codigo: dados.codigo, NOT: { id } },
      });
      if (dup) throw Errors.ALREADY_EXISTS('Cargo com este código');
    }

    return prisma.cargo.update({
      where: { id },
      data: dados,
      include: { grupoOcupacional: true },
    });
  }

  async desativarCargo(tenantId, id) {
    const cargo = await this.buscarCargo(tenantId, id);
    const servidoresAtivos = await prisma.servidor.count({
      where: { cargoId: id, situacaoFuncional: 'ATIVO' },
    });
    if (servidoresAtivos > 0) {
      throw Errors.VALIDATION(`Cargo possui ${servidoresAtivos} servidor(es) ativo(s). Remaneje-os antes de desativar.`);
    }
    await prisma.cargo.update({ where: { id }, data: { ativo: false } });
  }

  async servidoresDoCargo(tenantId, cargoId, skip, take) {
    await this.buscarCargo(tenantId, cargoId);
    const where = { tenantId, cargoId, situacaoFuncional: 'ATIVO' };
    const [servidores, total] = await prisma.$transaction([
      prisma.servidor.findMany({
        where, skip, take,
        orderBy: { nome: 'asc' },
        select: {
          id: true, matricula: true, nome: true, situacaoFuncional: true,
          nivelSalarial: { select: { nivel: true, classe: true, vencimentoBase: true } },
          lotacao: { select: { nome: true, sigla: true } },
        },
      }),
      prisma.servidor.count({ where }),
    ]);
    return { servidores, total };
  }

  // ── Tabelas Salariais ──────────────────────────────────────

  async listarTabelas(tenantId, query = {}) {
    const where = { tenantId };
    if (query.ativa !== undefined) where.ativa = query.ativa !== 'false';

    return prisma.tabelaSalarial.findMany({
      where,
      orderBy: { vigenciaIni: 'desc' },
      include: { _count: { select: { niveis: true, servidores: true } } },
    });
  }

  async criarTabela(tenantId, dados) {
    // Desativa outras tabelas ativas se esta for marcada como ativa
    if (dados.ativa !== false) {
      await prisma.tabelaSalarial.updateMany({
        where: { tenantId, ativa: true },
        data: { ativa: false, vigenciaFim: new Date() },
      });
    }

    return prisma.tabelaSalarial.create({
      data: { ...dados, tenantId, ativa: dados.ativa !== false },
    });
  }

  async buscarTabela(tenantId, id) {
    const tabela = await prisma.tabelaSalarial.findFirst({
      where: { id, tenantId },
      include: {
        niveis: { orderBy: [{ nivel: 'asc' }, { classe: 'asc' }] },
        _count: { select: { servidores: true } },
      },
    });
    if (!tabela) throw Errors.NOT_FOUND('Tabela Salarial');
    return tabela;
  }

  async atualizarTabela(tenantId, id, dados) {
    await this.buscarTabela(tenantId, id);
    return prisma.tabelaSalarial.update({ where: { id }, data: dados });
  }

  // ── Níveis Salariais ───────────────────────────────────────

  async listarNiveis(tenantId, tabelaId) {
    await this.buscarTabela(tenantId, tabelaId); // Valida acesso ao tenant
    return prisma.nivelSalarial.findMany({
      where: { tabelaSalarialId: tabelaId },
      orderBy: [{ nivel: 'asc' }, { classe: 'asc' }],
    });
  }

  async criarNivel(tenantId, tabelaId, dados) {
    await this.buscarTabela(tenantId, tabelaId);

    // Verifica duplicidade de nível+classe na mesma tabela
    const existente = await prisma.nivelSalarial.findFirst({
      where: { tabelaSalarialId: tabelaId, nivel: dados.nivel, classe: dados.classe },
    });
    if (existente) throw Errors.ALREADY_EXISTS(`Nível ${dados.nivel} Classe ${dados.classe}`);

    return prisma.nivelSalarial.create({
      data: { ...dados, tabelaSalarialId: tabelaId },
    });
  }

  async atualizarNivel(tenantId, tabelaId, id, dados) {
    await this.buscarTabela(tenantId, tabelaId);
    const nivel = await prisma.nivelSalarial.findFirst({ where: { id, tabelaSalarialId: tabelaId } });
    if (!nivel) throw Errors.NOT_FOUND('Nível Salarial');
    return prisma.nivelSalarial.update({ where: { id }, data: dados });
  }

  async removerNivel(tenantId, tabelaId, id) {
    await this.buscarTabela(tenantId, tabelaId);
    const nivel = await prisma.nivelSalarial.findFirst({ where: { id, tabelaSalarialId: tabelaId } });
    if (!nivel) throw Errors.NOT_FOUND('Nível Salarial');

    // Verifica se há servidores neste nível
    const emUso = await prisma.servidor.count({ where: { nivelSalarialId: id } });
    if (emUso > 0) throw Errors.VALIDATION(`Nível em uso por ${emUso} servidor(es). Remaneje-os primeiro.`);

    await prisma.nivelSalarial.delete({ where: { id } });
  }

  // ── Matriz Salarial (visão consolidada PCCV) ───────────────

  async matrizSalarial(tenantId, tabelaId) {
    const tabela = await this.buscarTabela(tenantId, tabelaId);

    // Agrupa os níveis em formato de matriz: { nivel: { classe: { vencimento, ... } } }
    const niveis = tabela.niveis;
    const niveisUnicos  = [...new Set(niveis.map(n => n.nivel))].sort();
    const classesUnicas = [...new Set(niveis.map(n => n.classe))].sort();

    const matriz = {};
    for (const nivel of niveisUnicos) {
      matriz[nivel] = {};
      for (const classe of classesUnicas) {
        const celula = niveis.find(n => n.nivel === nivel && n.classe === classe);
        matriz[nivel][classe] = celula
          ? {
              id: celula.id,
              vencimentoBase: celula.vencimentoBase,
              percentualProxClasse: celula.percentualProxClasse,
              percentualProxNivel: celula.percentualProxNivel,
              intersticio: celula.intersticio,
            }
          : null; // Célula não cadastrada
      }
    }

    return {
      tabela: { id: tabela.id, nome: tabela.nome, vigenciaIni: tabela.vigenciaIni, ativa: tabela.ativa },
      niveis: niveisUnicos,
      classes: classesUnicas,
      matriz,
      totalCelulas: niveis.length,
    };
  }

  // ── Lotações ───────────────────────────────────────────────

  async listarLotacoes(tenantId, query = {}) {
    const where = { tenantId };
    if (query.ativo !== undefined) where.ativo = query.ativo !== 'false';
    if (query.nivel) where.nivel = parseInt(query.nivel);
    if (query.paiId) where.lotacaoPaiId = query.paiId;
    if (query.q) {
      where.OR = [
        { nome:  { contains: query.q } },
        { sigla: { contains: query.q } },
      ];
    }

    return prisma.lotacao.findMany({
      where,
      orderBy: [{ nivel: 'asc' }, { nome: 'asc' }],
      include: {
        lotacaoPai: { select: { nome: true, sigla: true } },
        _count: { select: { servidores: true, sublotacoes: true } },
      },
    });
  }

  async criarLotacao(tenantId, dados) {
    const existente = await prisma.lotacao.findFirst({
      where: { tenantId, codigo: dados.codigo },
    });
    if (existente) throw Errors.ALREADY_EXISTS('Lotação com este código');

    // Valida pai se informado
    if (dados.lotacaoPaiId) {
      const pai = await prisma.lotacao.findFirst({ where: { id: dados.lotacaoPaiId, tenantId } });
      if (!pai) throw Errors.NOT_FOUND('Lotação pai');
      // Nível filho = pai + 1
      dados.nivel = pai.nivel + 1;
    }

    return prisma.lotacao.create({ data: { ...dados, tenantId } });
  }

  async atualizarLotacao(tenantId, id, dados) {
    const lotacao = await prisma.lotacao.findFirst({ where: { id, tenantId } });
    if (!lotacao) throw Errors.NOT_FOUND('Lotação');
    return prisma.lotacao.update({ where: { id }, data: dados });
  }

  async desativarLotacao(tenantId, id) {
    const lotacao = await prisma.lotacao.findFirst({ where: { id, tenantId } });
    if (!lotacao) throw Errors.NOT_FOUND('Lotação');

    const [servidores, sublotacoes] = await prisma.$transaction([
      prisma.servidor.count({ where: { lotacaoId: id, situacaoFuncional: 'ATIVO' } }),
      prisma.lotacao.count({ where: { lotacaoPaiId: id, ativo: true } }),
    ]);
    if (servidores > 0) throw Errors.VALIDATION(`Lotação possui ${servidores} servidor(es) ativo(s).`);
    if (sublotacoes > 0) throw Errors.VALIDATION(`Lotação possui ${sublotacoes} sublotação(ões) ativa(s).`);

    await prisma.lotacao.update({ where: { id }, data: { ativo: false } });
  }
}

module.exports = CargosService;
