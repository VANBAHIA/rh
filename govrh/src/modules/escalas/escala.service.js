// src/modules/escalas/escala.service.js

const EscalaRepository    = require('./escala.repository');
const { Errors }          = require('../../shared/errors/AppError');
const { parsePagination } = require('../../shared/utils/pagination');

const repo = new EscalaRepository();

class EscalaService {

  // ── Catálogo de escalas ───────────────────────────────────────

  async listar(tenantId, query) {
    const { skip, take, page, limit } = parsePagination(query);
    const { nome, tipo, ativo } = query;
    const { escalas, total } = await repo.findAll(tenantId, { skip, take, nome, tipo, ativo });
    return { escalas, total, page, limit };
  }

  async buscarPorId(tenantId, id) {
    const escala = await repo.findById(id, tenantId);
    if (!escala) throw Errors.NOT_FOUND('Escala');
    return escala;
  }

  async criar(tenantId, data) {
    const { turnos, ...resto } = data;
    if (!Array.isArray(turnos) || turnos.length === 0) {
      throw Errors.VALIDATION('O campo turnos deve ter ao menos um dia configurado.');
    }
    _validarTurnos(turnos);
    return repo.create(tenantId, { ...resto, turnos });
  }

  async atualizar(tenantId, id, data) {
    await this.buscarPorId(tenantId, id);
    if (data.turnos !== undefined) {
      if (!Array.isArray(data.turnos) || data.turnos.length === 0) {
        throw Errors.VALIDATION('O campo turnos deve ter ao menos um dia configurado.');
      }
      _validarTurnos(data.turnos);
    }
    return repo.update(id, tenantId, data);
  }

  async desativar(tenantId, id) {
    const escala = await this.buscarPorId(tenantId, id);
    if (escala._count.servidores > 0) {
      throw Errors.CONFLICT(
        `Não é possível desativar: ${escala._count.servidores} servidor(es) estão nessa escala. ` +
        'Reatribua-os antes de desativar.'
      );
    }
    return repo.desativar(id);
  }

  // ── Vínculo servidor ↔ escala ─────────────────────────────────

  async buscarEscalaAtiva(tenantId, servidorId) {
    await _garantirServidorDoTenant(tenantId, servidorId);
    return repo.findEscalaAtiva(servidorId);
  }

  async historicoEscalas(tenantId, servidorId) {
    await _garantirServidorDoTenant(tenantId, servidorId);
    return repo.findHistorico(servidorId);
  }

  async servidoresDaEscala(tenantId, id, query) {
    await this.buscarPorId(tenantId, id);
    const { skip, take } = parsePagination(query);
    return repo.findServidoresByEscala(id, { skip, take });
  }

  async atribuir(tenantId, servidorId, { escalaId, dataInicio, motivoAlteracao }, usuarioId) {
    await _garantirServidorDoTenant(tenantId, servidorId);

    const escala = await repo.findById(escalaId, tenantId);
    if (!escala)       throw Errors.NOT_FOUND('Escala');
    if (!escala.ativo) throw Errors.CONFLICT('Escala inativa. Escolha uma escala ativa.');
    if (!dataInicio)   throw Errors.VALIDATION('dataInicio é obrigatório.');

    return repo.atribuir(tenantId, servidorId, escalaId, dataInicio, {
      motivoAlteracao,
      registradoPor: usuarioId,
    });
  }

  async encerrarEscalaAtiva(servidorId, dataFim) {
    return repo.encerrarEscalaAtiva(servidorId, dataFim || new Date());
  }

  async alertaSemEscala(tenantId) {
    const total = await repo.countServidoresSemEscala(tenantId);
    return { servidoresSemEscala: total };
  }
}

// ── Helpers privados ────────────────────────────────────────────

async function _garantirServidorDoTenant(tenantId, servidorId) {
  const prisma = require('../../config/prisma');
  const servidor = await prisma.servidor.findFirst({ where: { id: servidorId, tenantId } });
  if (!servidor) throw Errors.NOT_FOUND('Servidor');
  return servidor;
}

/**
 * Valida estrutura dos turnos.
 * diaSemana: 0 (Dom) a 6 (Sáb) — alinhado com new Date().getDay() e a front.
 * almoco é opcional — ignorado na validação de horário principal.
 */
function _validarTurnos(turnos) {
  const reHora = /^\d{2}:\d{2}$/;
  for (const t of turnos) {
    if (t.diaSemana < 0 || t.diaSemana > 6) {
      throw Errors.VALIDATION(`diaSemana inválido: ${t.diaSemana}. Use 0 (Dom) a 6 (Sáb).`);
    }
    if (!reHora.test(t.entrada) || !reHora.test(t.saida)) {
      throw Errors.VALIDATION(`Horário inválido no dia ${t.diaSemana}. Use o formato HH:mm.`);
    }
    if (t.entrada >= t.saida) {
      throw Errors.VALIDATION(`Horário de entrada deve ser anterior à saída no dia ${t.diaSemana}.`);
    }
    if (t.almoco) {
      if (!reHora.test(t.almoco.inicio) || !reHora.test(t.almoco.fim)) {
        throw Errors.VALIDATION(`Horário de almoço inválido no dia ${t.diaSemana}. Use o formato HH:mm.`);
      }
      if (t.almoco.inicio >= t.almoco.fim) {
        throw Errors.VALIDATION(`Início do almoço deve ser anterior ao fim no dia ${t.diaSemana}.`);
      }
    }
  }
}

module.exports = EscalaService;
