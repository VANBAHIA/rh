// src/modules/escalas/escala.repository.js
// Camada de acesso ao banco — apenas queries, sem regras de negócio

const prisma = require('../../config/prisma');

const ESCALA_INCLUDE = {
  escala: true,
};

class EscalaRepository {

  // ── EscalaTrabalho (catálogo) ─────────────────────────────────

  async findAll(tenantId, { skip, take, nome, tipo, ativo }) {
    const where = { tenantId };
    if (nome)            where.nome = { contains: nome };
    if (tipo)            where.tipo = tipo;
    if (ativo !== undefined) where.ativo = ativo === 'true' || ativo === true;

    const [escalas, total] = await prisma.$transaction([
      prisma.escalaTrabalho.findMany({
        where, skip, take,
        orderBy: { nome: 'asc' },
        select: {
          id:                  true,
          nome:                true,
          tipo:                true,
          cargaHorariaSemanal: true,
          toleranciaAtraso:    true,
          ativo:               true,
          turnos:              true,
          descricao:           true,
          createdAt:           true,
          _count: { select: { servidores: { where: { ativa: true } } } },
        },
      }),
      prisma.escalaTrabalho.count({ where }),
    ]);

    return { escalas, total };
  }

  async findById(id, tenantId) {
    return prisma.escalaTrabalho.findFirst({
      where: { id },
      include: {
        _count: { select: { servidores: { where: { ativa: true } } } },
      },
    });
  }

  async create(tenantId, data) {
    return prisma.escalaTrabalho.create({
      data: { tenantId, ...data },
    });
  }

  async update(id, tenantId, data) {
    return prisma.escalaTrabalho.update({
      where: { id },
      data,
    });
  }

  async desativar(id) {
    return prisma.escalaTrabalho.update({
      where: { id },
      data: { ativo: false },
    });
  }

  // ── ServidorEscala (vínculos servidor ↔ escala) ───────────────

  /**
   * Retorna a escala ativa do servidor.
   * Regra: deve existir exatamente uma (enforced no service).
   */
  async findEscalaAtiva(servidorId) {
    return prisma.servidorEscala.findFirst({
      where: { servidorId, ativa: true },
      include: ESCALA_INCLUDE,
    });
  }

  /**
   * Histórico completo de escalas do servidor, mais recente primeiro.
   */
  async findHistorico(servidorId) {
    return prisma.servidorEscala.findMany({
      where: { servidorId },
      orderBy: { dataInicio: 'desc' },
      include: ESCALA_INCLUDE,
    });
  }

  /**
   * Lista todos os servidores vinculados a uma escala.
   * Útil para gestão da escala (quem está nessa escala hoje).
   */
  async findServidoresByEscala(escalaId, { skip, take } = {}) {
    return prisma.servidorEscala.findMany({
      where: { escalaId, ativa: true },
      skip,
      take,
      include: {
        servidor: {
          select: {
            id: true, matricula: true, nome: true, fotoUrl: true,
            vinculos: {
              where: { atual: true }, take: 1,
              select: {
                situacaoFuncional: true,
                cargo:   { select: { nome: true } },
                lotacao: { select: { nome: true, sigla: true } },
              },
            },
          },
        },
      },
      orderBy: { servidor: { nome: 'asc' } },
    });
  }

  /**
   * Atribui escala ao servidor.
   * Encerra a escala anterior (se houver) e cria a nova — tudo em transaction.
   */
  async atribuir(tenantId, servidorId, escalaId, dataInicio, { motivoAlteracao, registradoPor } = {}) {
    return prisma.$transaction(async (tx) => {
      // Encerra escala anterior
      await tx.servidorEscala.updateMany({
        where: { servidorId, ativa: true },
        data: {
          ativa:   false,
          dataFim: new Date(dataInicio), // encerra no mesmo dia que a nova começa
        },
      });

      // Cria nova escala ativa
      return tx.servidorEscala.create({
        data: {
          tenantId,
          servidorId,
          escalaId,
          dataInicio:     new Date(dataInicio),
          ativa:          true,
          motivoAlteracao: motivoAlteracao || null,
          registradoPor:   registradoPor   || null,
        },
        include: ESCALA_INCLUDE,
      });
    });
  }

  /**
   * Encerra a escala ativa do servidor (usado ao exonerar/aposentar).
   * Chamado internamente pelo service de servidores ao alterar situação.
   */
  async encerrarEscalaAtiva(servidorId, dataFim, tx = prisma) {
    return tx.servidorEscala.updateMany({
      where: { servidorId, ativa: true },
      data: {
        ativa:   false,
        dataFim: new Date(dataFim),
      },
    });
  }

  /**
   * Contagem de servidores sem escala ativa (relatório / alerta).
   */
  async countServidoresSemEscala(tenantId) {
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as total
      FROM servidores s
      JOIN vinculos_funcionais vf
        ON vf.servidorId = s.id AND vf.atual = 1 AND vf.situacaoFuncional = 'ATIVO'
      WHERE s.tenantId = ${tenantId}
        AND NOT EXISTS (
          SELECT 1 FROM servidores_escalas se
          WHERE se.servidorId = s.id AND se.ativa = 1
        )
    `;
    return Number(result[0]?.total ?? 0);
  }
}

module.exports = EscalaRepository;
