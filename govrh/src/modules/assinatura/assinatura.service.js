const crypto = require('crypto');
const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');

class AssinaturaService {

  async pendentes(tenantId, userId) {
    return prisma.assinaturaDigital.findMany({
      where: { usuarioId: userId, status: 'PENDENTE', documento: { tenantId } },
      include: { documento: { select: { tipo: true, titulo: true, url: true } } },
      orderBy: { ordem: 'asc' },
    });
  }

  async listar(tenantId, query = {}, skip = 0, take = 20) {
    const where = { tenantId };
    if (query.tipo) where.tipo = query.tipo;
    if (query.status) where.status = query.status;

    const [dados, total] = await prisma.$transaction([
      prisma.documentoAssinatura.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: {
          assinaturas: { include: { usuario: { select: { nome: true } } } },
          _count: { select: { assinaturas: true } },
        },
      }),
      prisma.documentoAssinatura.count({ where }),
    ]);
    return { dados, total };
  }

  async criar(tenantId, { tipo, titulo, url, descricao, signatariosIds }, criadorId) {
    if (!signatariosIds?.length) throw Errors.VALIDATION('Ao menos um signatário é necessário.');

    const hash = crypto.createHash('sha256').update(`${tipo}:${titulo}:${Date.now()}`).digest('hex');

    const doc = await prisma.documentoAssinatura.create({
      data: {
        tenantId, tipo, titulo, url, descricao,
        hash, status: 'PENDENTE',
        totalSignatarios: signatariosIds.length,
        assinaturas: {
          create: signatariosIds.map((uid, idx) => ({
            usuarioId: uid,
            ordem: idx + 1,
            status: idx === 0 ? 'PENDENTE' : 'AGUARDANDO', // Apenas o primeiro fica pendente
          })),
        },
      },
      include: { assinaturas: true },
    });

    return doc;
  }

  async buscar(tenantId, id) {
    const doc = await prisma.documentoAssinatura.findFirst({
      where: { id, tenantId },
      include: {
        assinaturas: {
          include: { usuario: { select: { nome: true, email: true } } },
          orderBy: { ordem: 'asc' },
        },
      },
    });
    if (!doc) throw Errors.NOT_FOUND('Documento para Assinatura');
    return doc;
  }

  async assinar(tenantId, docId, userId, { certificado, codigoMfa }) {
    const doc = await this.buscar(tenantId, docId);
    if (doc.status === 'ASSINADO') throw Errors.VALIDATION('Documento já totalmente assinado.');
    if (doc.status === 'CANCELADO') throw Errors.VALIDATION('Documento cancelado.');

    const minhaAssinatura = doc.assinaturas.find(
      a => a.usuarioId === userId && a.status === 'PENDENTE'
    );
    if (!minhaAssinatura) throw Errors.FORBIDDEN();

    const hash = crypto.createHash('sha256')
      .update(`${doc.hash}:${userId}:${Date.now()}`)
      .digest('hex');

    await prisma.$transaction(async (tx) => {
      // Registra esta assinatura
      await tx.assinaturaDigital.update({
        where: { id: minhaAssinatura.id },
        data: {
          status: 'ASSINADO',
          hash,
          certificado: certificado || 'GOV.BR',
          assinadoEm: new Date(),
        },
      });

      // Ativa próximo signatário (se houver)
      const proxima = doc.assinaturas.find(a => a.ordem === minhaAssinatura.ordem + 1);
      if (proxima) {
        await tx.assinaturaDigital.update({
          where: { id: proxima.id },
          data: { status: 'PENDENTE' },
        });
      }

      // Verifica se todas as assinaturas foram concluídas
      const totalAssinadas = doc.assinaturas.filter(a => a.status === 'ASSINADO').length + 1;
      if (totalAssinadas >= doc.totalSignatarios) {
        await tx.documentoAssinatura.update({
          where: { id: docId },
          data: { status: 'ASSINADO', assinadoEm: new Date() },
        });
      }
    });

    return prisma.documentoAssinatura.findUnique({
      where: { id: docId },
      include: { assinaturas: true },
    });
  }

  async recusar(tenantId, docId, userId, { motivo }) {
    const doc = await this.buscar(tenantId, docId);
    const minhaAssinatura = doc.assinaturas.find(a => a.usuarioId === userId && a.status === 'PENDENTE');
    if (!minhaAssinatura) throw Errors.FORBIDDEN();

    await prisma.$transaction([
      prisma.assinaturaDigital.update({
        where: { id: minhaAssinatura.id },
        data: { status: 'RECUSADO', motivoRecusa: motivo, assinadoEm: new Date() },
      }),
      prisma.documentoAssinatura.update({
        where: { id: docId },
        data: { status: 'CANCELADO' },
      }),
    ]);

    return prisma.documentoAssinatura.findUnique({ where: { id: docId } });
  }
}

module.exports = AssinaturaService;
