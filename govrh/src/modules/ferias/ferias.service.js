const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');
const { mesesEntreatas } = require('../../shared/utils/date');

class FeriasService {

  async periodos(tenantId, servidorId) {
    const srv = await prisma.servidor.findFirst({ where: { id: servidorId, tenantId } });
    if (!srv) throw Errors.NOT_FOUND('Servidor');

    return prisma.periodoAquisitivo.findMany({
      where: { servidorId },
      orderBy: { dataInicio: 'desc' },
      include: { gozos: { orderBy: { dataInicio: 'asc' } } },
    });
  }

  async criarPeriodo(tenantId, dados) {
    const srv = await prisma.servidor.findFirst({ where: { id: dados.servidorId, tenantId } });
    if (!srv) throw Errors.NOT_FOUND('Servidor');
    return prisma.periodoAquisitivo.create({ data: dados });
  }

  async agendar(tenantId, { servidorId, periodoAquisitivoId, dataInicio, dataFim, diasAbono = 0 }) {
    const srv = await prisma.servidor.findFirst({ where: { id: servidorId, tenantId } });
    if (!srv) throw Errors.NOT_FOUND('Servidor');

    const periodo = await prisma.periodoAquisitivo.findFirst({
      where: { id: periodoAquisitivoId, servidorId },
    });
    if (!periodo) throw Errors.NOT_FOUND('Período Aquisitivo');

    const inicio = new Date(dataInicio);
    const fim    = new Date(dataFim);
    const diasGozo = Math.ceil((fim - inicio) / 86400000) + 1;

    // Valida saldo
    if (diasGozo + diasAbono > periodo.saldoDias) {
      throw Errors.FERIAS_INSUFICIENTE();
    }
    // Máximo 1/3 em abono
    if (diasAbono > Math.floor(periodo.diasDireito / 3)) {
      throw Errors.VALIDATION('Abono pecuniário não pode exceder 1/3 dos dias de direito.');
    }

    const ferias = await prisma.ferias.create({
      data: { servidorId, periodoAquisitivoId, dataInicio: inicio, dataFim: fim, diasGozo, diasAbono, status: 'PENDENTE' },
    });

    // Cria solicitação de aprovação
    await prisma.solicitacaoAprovacao.create({
      data: {
        tenantId,
        servidorId,
        tipo: 'FERIAS',
        status: 'PENDENTE',
        titulo: `Férias — ${srv.nome} — ${dataInicio} a ${dataFim}`,
        descricao: `${diasGozo} dias de gozo + ${diasAbono} dias de abono.`,
        feriasId: ferias.id,
      },
    });

    return ferias;
  }

  async buscar(tenantId, id) {
    const ferias = await prisma.ferias.findFirst({
      where: { id, servidor: { tenantId } },
      include: {
        servidor: { select: { matricula: true, nome: true, cargo: { select: { nome: true } } } },
        periodoAquisitivo: true,
        solicitacao: true,
      },
    });
    if (!ferias) throw Errors.NOT_FOUND('Férias');
    return ferias;
  }

  async aprovar(tenantId, id, userId, { portaria, observacao }) {
    const ferias = await this.buscar(tenantId, id);
    if (ferias.status !== 'PENDENTE') throw Errors.VALIDATION('Apenas férias pendentes podem ser aprovadas.');

    // Atualiza férias e período aquisitivo em transação
    const [feriasAtual] = await prisma.$transaction([
      prisma.ferias.update({
        where: { id },
        data: { status: 'APROVADO', portaria },
      }),
      prisma.periodoAquisitivo.update({
        where: { id: ferias.periodoAquisitivoId },
        data: {
          diasGozados: { increment: ferias.diasGozo },
          diasAbono:   { increment: ferias.diasAbono },
          saldoDias:   { decrement: ferias.diasGozo + ferias.diasAbono },
        },
      }),
      prisma.solicitacaoAprovacao.updateMany({
        where: { feriasId: id },
        data: { status: 'APROVADO' },
      }),
    ]);

    return feriasAtual;
  }

  async cancelar(tenantId, id, { motivo }) {
    const ferias = await this.buscar(tenantId, id);
    if (ferias.status === 'APROVADO') {
      // Estorna o saldo se já havia sido debitado
      await prisma.periodoAquisitivo.update({
        where: { id: ferias.periodoAquisitivoId },
        data: {
          diasGozados: { decrement: ferias.diasGozo },
          diasAbono:   { decrement: ferias.diasAbono },
          saldoDias:   { increment: ferias.diasGozo + ferias.diasAbono },
        },
      });
    }
    return prisma.ferias.update({
      where: { id },
      data: { status: 'CANCELADO', observacao: motivo },
    });
  }

  async vencendo(tenantId, query = {}, skip = 0, take = 20) {
    // Períodos aquisitivos com saldo > 0 que vencem nos próximos 90 dias
    const limite = new Date();
    limite.setDate(limite.getDate() + (parseInt(query.dias) || 90));

    const where = {
      servidor: { tenantId, situacaoFuncional: 'ATIVO' },
      saldoDias: { gt: 0 },
      dataFim: { lte: limite },
    };
    if (query.lotacaoId) where.servidor = { ...where.servidor, lotacaoId: query.lotacaoId };

    const [dados, total] = await prisma.$transaction([
      prisma.periodoAquisitivo.findMany({
        where, skip, take,
        orderBy: { dataFim: 'asc' },
        include: {
          servidor: { select: { matricula: true, nome: true, lotacao: { select: { nome: true } } } },
        },
      }),
      prisma.periodoAquisitivo.count({ where }),
    ]);

    return { dados, total };
  }

  async programacao(tenantId, mes) {
    // Férias agendadas/aprovadas que ocorrem no mês informado
    const [ano, mesNum] = mes.split('-').map(Number);
    const dataInicio = new Date(ano, mesNum - 1, 1);
    const dataFim    = new Date(ano, mesNum, 0);

    return prisma.ferias.findMany({
      where: {
        servidor: { tenantId },
        status: { in: ['PENDENTE', 'APROVADO'] },
        OR: [
          { dataInicio: { gte: dataInicio, lte: dataFim } },
          { dataFim:    { gte: dataInicio, lte: dataFim } },
          { dataInicio: { lte: dataInicio }, dataFim: { gte: dataFim } },
        ],
      },
      include: {
        servidor: { select: { matricula: true, nome: true, cargo: { select: { nome: true } }, lotacao: { select: { nome: true, sigla: true } } } },
      },
      orderBy: { dataInicio: 'asc' },
    });
  }
}

module.exports = FeriasService;
