const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');

class NotificacoesService {

  async listar(tenantId, userId, query = {}, skip = 0, take = 20) {
    const where = { tenantId, usuarioId: userId };
    if (query.lida !== undefined) where.lida = query.lida === 'true';
    if (query.tipo) where.tipo = query.tipo;

    const [dados, total] = await prisma.$transaction([
      prisma.notificacao.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.notificacao.count({ where }),
    ]);
    return { dados, total };
  }

  async naoLidas(tenantId, userId) {
    const total = await prisma.notificacao.count({ where: { tenantId, usuarioId: userId, lida: false } });
    const recentes = await prisma.notificacao.findMany({
      where: { tenantId, usuarioId: userId, lida: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return { total, recentes };
  }

  async marcarLida(tenantId, userId, id) {
    const n = await prisma.notificacao.findFirst({ where: { id, tenantId, usuarioId: userId } });
    if (!n) throw Errors.NOT_FOUND('Notificação');
    return prisma.notificacao.update({ where: { id }, data: { lida: true, lidaEm: new Date() } });
  }

  async marcarTodasLidas(tenantId, userId) {
    const { count } = await prisma.notificacao.updateMany({
      where: { tenantId, usuarioId: userId, lida: false },
      data: { lida: true, lidaEm: new Date() },
    });
    return { marcadas: count };
  }

  async remover(tenantId, userId, id) {
    const n = await prisma.notificacao.findFirst({ where: { id, tenantId, usuarioId: userId } });
    if (!n) throw Errors.NOT_FOUND('Notificação');
    await prisma.notificacao.delete({ where: { id } });
  }

  // Método estático para criar notificações de outros serviços
  static async criar(tenantId, { usuarioId, titulo, mensagem, tipo = 'INFO', link }) {
    return prisma.notificacao.create({
      data: { tenantId, usuarioId, titulo, mensagem, tipo, link, lida: false },
    });
  }

  // Notificação em massa para múltiplos usuários
  static async criarParaVarios(tenantId, usuarioIds, { titulo, mensagem, tipo = 'INFO', link }) {
    if (!usuarioIds?.length) return;
    await prisma.notificacao.createMany({
      data: usuarioIds.map(uid => ({ tenantId, usuarioId: uid, titulo, mensagem, tipo, link, lida: false })),
    });
  }
}

module.exports = NotificacoesService;
