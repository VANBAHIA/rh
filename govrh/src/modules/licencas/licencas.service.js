const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');

// Licenças que suspendem a remuneração
const LICENCAS_SEM_ONUS = ['SEM_VENCIMENTOS'];
// Licenças que alteram situação funcional
const LICENCAS_AFASTAMENTO = ['MANDATO_ELETIVO', 'CAPACITACAO', 'SEM_VENCIMENTOS'];

class LicencasService {

  async listar(tenantId, query = {}, skip = 0, take = 20) {
    const where = { servidor: { tenantId } };
    if (query.tipo)   where.tipo   = query.tipo;
    if (query.status) where.status = query.status;
    if (query.lotacaoId) where.servidor = { ...where.servidor, lotacaoId: query.lotacaoId };

    const [dados, total] = await prisma.$transaction([
      prisma.licenca.findMany({
        where, skip, take,
        orderBy: { dataInicio: 'desc' },
        include: {
          servidor: { select: { matricula: true, nome: true, lotacao: { select: { nome: true } } } },
        },
      }),
      prisma.licenca.count({ where }),
    ]);
    return { dados, total };
  }

  async listarPorServidor(tenantId, servidorId) {
    const srv = await prisma.servidor.findFirst({ where: { id: servidorId, tenantId } });
    if (!srv) throw Errors.NOT_FOUND('Servidor');
    return prisma.licenca.findMany({
      where: { servidorId },
      orderBy: { dataInicio: 'desc' },
    });
  }

  async criar(tenantId, dados) {
    const srv = await prisma.servidor.findFirst({ where: { id: dados.servidorId, tenantId } });
    if (!srv) throw Errors.NOT_FOUND('Servidor');

    // Verifica sobreposição de licenças ativas
    if (dados.dataInicio && dados.dataFim) {
      const sobreposicao = await prisma.licenca.findFirst({
        where: {
          servidorId: dados.servidorId,
          status: { in: ['PENDENTE', 'APROVADO'] },
          dataInicio: { lte: new Date(dados.dataFim) },
          dataFim:    { gte: new Date(dados.dataInicio) },
        },
      });
      if (sobreposicao) throw Errors.VALIDATION('Já existe uma licença ativa neste período.');
    }

    const comOnus = !LICENCAS_SEM_ONUS.includes(dados.tipo);
    const licenca = await prisma.licenca.create({
      data: { ...dados, comOnus, status: 'PENDENTE',
        dataInicio: new Date(dados.dataInicio),
        dataFim: dados.dataFim ? new Date(dados.dataFim) : null,
      },
    });

    // Cria workflow de aprovação
    await prisma.solicitacaoAprovacao.create({
      data: {
        tenantId, servidorId: dados.servidorId,
        tipo: 'LICENCA', status: 'PENDENTE',
        titulo: `Licença ${dados.tipo} — ${srv.nome}`,
        descricao: dados.observacao || `Solicitação de licença ${dados.tipo}`,
        licencaId: licenca.id,
      },
    });

    return licenca;
  }

  async buscar(tenantId, id) {
    const licenca = await prisma.licenca.findFirst({
      where: { id, servidor: { tenantId } },
      include: {
        servidor: { select: { matricula: true, nome: true, cargo: { select: { nome: true } }, lotacao: { select: { nome: true } } } },
        solicitacao: true,
      },
    });
    if (!licenca) throw Errors.NOT_FOUND('Licença');
    return licenca;
  }

  async atualizar(tenantId, id, dados) {
    await this.buscar(tenantId, id);
    return prisma.licenca.update({ where: { id }, data: dados });
  }

  async aprovar(tenantId, id, { portaria, observacao }) {
    const licenca = await this.buscar(tenantId, id);
    if (licenca.status !== 'PENDENTE') throw Errors.VALIDATION('Apenas licenças pendentes podem ser aprovadas.');

    const [licencaAtual] = await prisma.$transaction([
      prisma.licenca.update({ where: { id }, data: { status: 'APROVADO', portaria } }),
      // Altera situação funcional se necessário
      ...(LICENCAS_AFASTAMENTO.includes(licenca.tipo)
        ? [prisma.servidor.update({ where: { id: licenca.servidorId }, data: { situacaoFuncional: 'AFASTADO' } })]
        : []),
      prisma.solicitacaoAprovacao.updateMany({ where: { licencaId: id }, data: { status: 'APROVADO' } }),
    ]);

    return licencaAtual;
  }

  async encerrar(tenantId, id, { dataFimReal, observacao }) {
    const licenca = await this.buscar(tenantId, id);
    if (licenca.status !== 'APROVADO') throw Errors.VALIDATION('Apenas licenças aprovadas podem ser encerradas.');

    await prisma.$transaction([
      prisma.licenca.update({ where: { id }, data: { status: 'ENCERRADA', dataFim: new Date(dataFimReal), observacao } }),
      // Restaura situação ativa
      ...(LICENCAS_AFASTAMENTO.includes(licenca.tipo)
        ? [prisma.servidor.update({ where: { id: licenca.servidorId }, data: { situacaoFuncional: 'ATIVO' } })]
        : []),
    ]);

    return prisma.licenca.findUnique({ where: { id } });
  }

  async prorrogar(tenantId, id, { novaDataFim, observacao }) {
    const licenca = await this.buscar(tenantId, id);
    if (licenca.status !== 'APROVADO') throw Errors.VALIDATION('Apenas licenças aprovadas podem ser prorrogadas.');

    return prisma.licenca.update({
      where: { id },
      data: {
        dataFim: new Date(novaDataFim),
        prorrogacoes: { increment: 1 },
        observacao,
      },
    });
  }

  async vencendo(tenantId, query = {}) {
    const dias = parseInt(query.dias) || 15;
    const limite = new Date();
    limite.setDate(limite.getDate() + dias);

    return prisma.licenca.findMany({
      where: {
        servidor: { tenantId, situacaoFuncional: 'AFASTADO' },
        status: 'APROVADO',
        dataFim: { gte: new Date(), lte: limite },
      },
      include: {
        servidor: { select: { matricula: true, nome: true, lotacao: { select: { nome: true } } } },
      },
      orderBy: { dataFim: 'asc' },
    });
  }
}

module.exports = LicencasService;
