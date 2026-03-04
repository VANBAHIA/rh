const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');

// Penalidades que alteram situação funcional
const PENALIDADES_SITUACAO = {
  DEMISSAO:         'EXONERADO',
  CASSACAO:         'EXONERADO',
  DESTITUICAO:      'EXONERADO',
  SUSPENSAO:        'SUSPENSO',
};

class DisciplinarService {

  async listar(tenantId, query = {}, skip = 0, take = 20) {
    const where = { tenantId };
    if (query.tipo)       where.tipo       = query.tipo;
    if (query.status)     where.status     = query.status;
    if (query.servidorId) where.servidorId = query.servidorId;

    const [dados, total] = await prisma.$transaction([
      prisma.processoDisciplinar.findMany({
        where, skip, take,
        orderBy: { dataAbertura: 'desc' },
        include: {
          servidor: { select: { matricula: true, nome: true, lotacao: { select: { nome: true } } } },
          _count: { select: { documentos: true } },
        },
      }),
      prisma.processoDisciplinar.count({ where }),
    ]);
    return { dados, total };
  }

  async criar(tenantId, dados) {
    const srv = await prisma.servidor.findFirst({ where: { id: dados.servidorId, tenantId } });
    if (!srv) throw Errors.NOT_FOUND('Servidor');

    // Gera número de processo automático: ANO/SEQUENCIAL/TIPO
    const ano = new Date().getFullYear();
    const count = await prisma.processoDisciplinar.count({ where: { tenantId } });
    const numero = `${String(count + 1).padStart(4, '0')}/${ano}/${dados.tipo}`;

    return prisma.processoDisciplinar.create({
      data: {
        ...dados,
        tenantId,
        numero,
        status: 'INSTAURADO',
        dataAbertura: dados.dataAbertura ? new Date(dados.dataAbertura) : new Date(),
      },
    });
  }

  async buscar(tenantId, id) {
    const p = await prisma.processoDisciplinar.findFirst({
      where: { id, tenantId },
      include: {
        servidor: { select: { matricula: true, nome: true, cargo: { select: { nome: true } }, lotacao: { select: { nome: true } } } },
        documentos: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!p) throw Errors.NOT_FOUND('Processo Disciplinar');
    return p;
  }

  async atualizar(tenantId, id, dados) {
    await this.buscar(tenantId, id);
    return prisma.processoDisciplinar.update({ where: { id }, data: dados });
  }

  async addDocumento(tenantId, id, { tipo, descricao, url, dataDocumento }) {
    await this.buscar(tenantId, id);
    return prisma.docProcessoDisciplinar.create({
      data: { processoId: id, tipo, descricao, url, dataDocumento: dataDocumento ? new Date(dataDocumento) : new Date() },
    });
  }

  async removerDocumento(tenantId, id, docId) {
    await this.buscar(tenantId, id);
    const doc = await prisma.docProcessoDisciplinar.findFirst({ where: { id: docId, processoId: id } });
    if (!doc) throw Errors.NOT_FOUND('Documento');
    await prisma.docProcessoDisciplinar.delete({ where: { id: docId } });
  }

  async aplicarPenalidade(tenantId, id, { penalidade, portaria, dataAplicacao, diasSuspensao, fundamentacao }) {
    const proc = await this.buscar(tenantId, id);
    if (proc.status === 'ENCERRADO' || proc.status === 'ARQUIVADO') {
      throw Errors.VALIDATION('Processo já encerrado ou arquivado.');
    }

    const novaSituacao = PENALIDADES_SITUACAO[penalidade];

    await prisma.$transaction([
      prisma.processoDisciplinar.update({
        where: { id },
        data: {
          status: 'JULGADO',
          penalidade, portaria, fundamentacao,
          dataAplicacao: dataAplicacao ? new Date(dataAplicacao) : new Date(),
          diasSuspensao: penalidade === 'SUSPENSAO' ? diasSuspensao : null,
        },
      }),
      // Aplica impacto na situação funcional
      ...(novaSituacao ? [
        prisma.servidor.update({
          where: { id: proc.servidorId },
          data: {
            situacaoFuncional: novaSituacao,
            ...(novaSituacao === 'EXONERADO' ? { motivoExoneracao: `Penalidade: ${penalidade}. Portaria: ${portaria}` } : {}),
          },
        }),
        prisma.historicoFuncional.create({
          data: {
            servidorId: proc.servidorId, tenantId,
            dataAlteracao: new Date(),
            tipoAlteracao: 'PENALIDADE',
            descricao: `${penalidade} aplicada via Processo ${proc.numero}. Portaria: ${portaria}`,
            situacaoNova: novaSituacao,
          },
        }),
      ] : []),
    ]);

    return prisma.processoDisciplinar.findUnique({ where: { id } });
  }

  async arquivar(tenantId, id, { motivo }) {
    const proc = await this.buscar(tenantId, id);
    if (proc.status === 'ENCERRADO') throw Errors.VALIDATION('Processo já encerrado.');
    return prisma.processoDisciplinar.update({ where: { id }, data: { status: 'ARQUIVADO', observacao: motivo } });
  }

  async encerrar(tenantId, id, { observacao }) {
    await this.buscar(tenantId, id);
    return prisma.processoDisciplinar.update({ where: { id }, data: { status: 'ENCERRADO', observacao } });
  }
}

module.exports = DisciplinarService;
