const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');
const { gerarMatricula } = require('../../shared/utils/matricula');
const { anosDeServico } = require('../../shared/utils/date');

class ServidorService {
  async listar(tenantId, filtros, skip, take) {
    const where = { tenantId };

    if (filtros.situacao) where.situacaoFuncional = filtros.situacao;
    if (filtros.regime)   where.regimeJuridico    = filtros.regime;
    if (filtros.lotacaoId) where.lotacaoId        = filtros.lotacaoId;
    if (filtros.cargoId)   where.cargoId          = filtros.cargoId;
    if (filtros.search) {
      where.OR = [
        { nome:      { contains: filtros.search } },
        { matricula: { contains: filtros.search } },
        { cpf:       { contains: filtros.search } },
      ];
    }

    const [servidores, total] = await prisma.$transaction([
      prisma.servidor.findMany({
        where, skip, take,
        orderBy: { nome: 'asc' },
        select: {
          id: true, matricula: true, nome: true, cpf: true,
          regimeJuridico: true, situacaoFuncional: true,
          dataAdmissao: true, nivelTitulacao: true,
          cargo:    { select: { nome: true, codigo: true } },
          lotacao:  { select: { nome: true, sigla: true } },
          nivelSalarial: { select: { nivel: true, classe: true, vencimentoBase: true } },
        },
      }),
      prisma.servidor.count({ where }),
    ]);

    return { servidores, total };
  }

  async criar(tenantId, dados) {
    // Verifica limite do plano
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const totalAtivos = await prisma.servidor.count({
      where: { tenantId, situacaoFuncional: 'ATIVO' },
    });
    if (totalAtivos >= tenant.limiteServidores) throw Errors.TENANT_LIMIT();

    // Verifica CPF único no tenant
    const existente = await prisma.servidor.findFirst({ where: { tenantId, cpf: dados.cpf } });
    if (existente) throw Errors.ALREADY_EXISTS('CPF');

    const matricula = await gerarMatricula(tenantId);

    const servidor = await prisma.servidor.create({
      data: { ...dados, tenantId, matricula },
    });

    // Registra histórico funcional inicial
    await prisma.historicoFuncional.create({
      data: {
        servidorId: servidor.id,
        tenantId,
        dataAlteracao: new Date(),
        tipoAlteracao: 'ADMISSAO',
        descricao: 'Admissão / Posse inicial do servidor',
        cargoNovoId: dados.cargoId,
        lotacaoNovaId: dados.lotacaoId,
        nivelSalarialNovoId: dados.nivelSalarialId,
        situacaoNova: 'ATIVO',
      },
    });

    return servidor;
  }

  async buscarPorId(tenantId, id) {
    const servidor = await prisma.servidor.findFirst({
      where: { id, tenantId },
      include: {
        cargo: { include: { grupoOcupacional: true } },
        lotacao: true,
        nivelSalarial: { include: { tabelaSalarial: true } },
        dadosBancarios: true,
        dependentes: { where: { ativo: true } },
      },
    });
    if (!servidor) throw Errors.NOT_FOUND('Servidor');
    return servidor;
  }

  async atualizar(tenantId, id, dados) {
    const atual = await this.buscarPorId(tenantId, id);

    const servidor = await prisma.servidor.update({
      where: { id },
      data: dados,
    });

    // Detecta e registra alterações funcionais relevantes
    const alteracoes = [];
    if (dados.cargoId && dados.cargoId !== atual.cargoId) alteracoes.push('CARGO');
    if (dados.lotacaoId && dados.lotacaoId !== atual.lotacaoId) alteracoes.push('LOTACAO');
    if (dados.nivelSalarialId && dados.nivelSalarialId !== atual.nivelSalarialId) alteracoes.push('SALARIO');
    if (dados.situacaoFuncional && dados.situacaoFuncional !== atual.situacaoFuncional) alteracoes.push('SITUACAO');

    if (alteracoes.length > 0) {
      await prisma.historicoFuncional.create({
        data: {
          servidorId: id,
          tenantId,
          dataAlteracao: new Date(),
          tipoAlteracao: alteracoes.join('_'),
          descricao: `Alteração: ${alteracoes.join(', ')}`,
          cargoAnteriorId: atual.cargoId,
          cargoNovoId: dados.cargoId || atual.cargoId,
          lotacaoAnteriorId: atual.lotacaoId,
          lotacaoNovaId: dados.lotacaoId || atual.lotacaoId,
          situacaoAnterior: atual.situacaoFuncional,
          situacaoNova: dados.situacaoFuncional || atual.situacaoFuncional,
          observacao: dados.motivoAlteracao || null,
        },
      });
    }

    return servidor;
  }

  async desativar(tenantId, id, { motivo, dataExoneracao }) {
    const servidor = await this.buscarPorId(tenantId, id);
    await prisma.servidor.update({
      where: { id },
      data: {
        situacaoFuncional: 'EXONERADO',
        dataExoneracao: dataExoneracao ? new Date(dataExoneracao) : new Date(),
        motivoExoneracao: motivo,
      },
    });
  }

  async historico(tenantId, servidorId) {
    await this.buscarPorId(tenantId, servidorId); // Valida acesso ao tenant
    return prisma.historicoFuncional.findMany({
      where: { servidorId },
      orderBy: { dataAlteracao: 'desc' },
    });
  }

  async documentos(tenantId, servidorId) {
    await this.buscarPorId(tenantId, servidorId);
    return prisma.documentoServidor.findMany({
      where: { servidorId, ativo: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadDocumento(tenantId, servidorId, dados) {
    await this.buscarPorId(tenantId, servidorId);
    return prisma.documentoServidor.create({
      data: { servidorId, ...dados },
    });
  }

  async progressoes(tenantId, servidorId) {
    await this.buscarPorId(tenantId, servidorId);
    return prisma.progressao.findMany({
      where: { servidorId },
      include: { nivelOrigem: true, nivelDestino: true, cargo: true },
      orderBy: { dataCompetencia: 'desc' },
    });
  }

  async extrato(tenantId, servidorId) {
    const servidor = await this.buscarPorId(tenantId, servidorId);
    const [historico, progressoes, ferias, licencas] = await prisma.$transaction([
      prisma.historicoFuncional.findMany({ where: { servidorId }, orderBy: { dataAlteracao: 'desc' } }),
      prisma.progressao.findMany({ where: { servidorId }, orderBy: { dataCompetencia: 'desc' } }),
      prisma.ferias.findMany({ where: { servidorId }, include: { periodoAquisitivo: true } }),
      prisma.licenca.findMany({ where: { servidorId }, orderBy: { dataInicio: 'desc' } }),
    ]);
    return { servidor, historico, progressoes, ferias, licencas, anosServico: anosDeServico(servidor.dataAdmissao) };
  }

  async exportarXlsx(tenantId, filtros) {
    // Placeholder — implementar com a lib xlsx
    return Buffer.from('');
  }
}

module.exports = ServidorService;
