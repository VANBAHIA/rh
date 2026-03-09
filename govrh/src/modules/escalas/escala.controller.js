// src/modules/escalas/escala.controller.js

const EscalaService      = require('./escala.service');
const { ok, created, noContent, paginate } = require('../../shared/utils/response');
const { parsePagination } = require('../../shared/utils/pagination');

class EscalaController {
  constructor() {
    this.service = new EscalaService();
    // Bind automático de todos os métodos (evita perder contexto no Express)
    Object.getOwnPropertyNames(EscalaController.prototype)
      .filter(m => m !== 'constructor')
      .forEach(m => (this[m] = this[m].bind(this)));
  }

  // ── Catálogo de escalas ───────────────────────────────────────

  async listar(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const { escalas, total } = await this.service.listar(req.tenantId, req.query);
      paginate(res, escalas, total, page, limit);
    } catch (err) { next(err); }
  }

  async buscarPorId(req, res, next) {
    try {
      const data = await this.service.buscarPorId(req.tenantId, req.params.id);
      ok(res, data);
    } catch (err) { next(err); }
  }

  async criar(req, res, next) {
    try {
      const data = await this.service.criar(req.tenantId, req.body);
      created(res, data);
    } catch (err) { next(err); }
  }

  async atualizar(req, res, next) {
    try {
      const data = await this.service.atualizar(req.tenantId, req.params.id, req.body);
      ok(res, data);
    } catch (err) { next(err); }
  }

  async desativar(req, res, next) {
    try {
      await this.service.desativar(req.tenantId, req.params.id);
      noContent(res);
    } catch (err) { next(err); }
  }

  // ── Servidores da escala ──────────────────────────────────────

  async servidoresDaEscala(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const servidores = await this.service.servidoresDaEscala(
        req.tenantId, req.params.id, req.query
      );
      paginate(res, servidores, servidores.length, page, limit);
    } catch (err) { next(err); }
  }

  // ── Vínculo servidor ↔ escala (rotas montadas em /servidores) ─

  async buscarEscalaAtiva(req, res, next) {
    try {
      const data = await this.service.buscarEscalaAtiva(req.tenantId, req.params.id);
      ok(res, data);
    } catch (err) { next(err); }
  }

  async historicoEscalas(req, res, next) {
    try {
      const data = await this.service.historicoEscalas(req.tenantId, req.params.id);
      ok(res, data);
    } catch (err) { next(err); }
  }

  async atribuirEscala(req, res, next) {
    try {
      const data = await this.service.atribuir(
        req.tenantId,
        req.params.id,
        req.body,
        req.user?.id
      );
      created(res, data);
    } catch (err) { next(err); }
  }

  // ── Relatórios ────────────────────────────────────────────────

  async alertaSemEscala(req, res, next) {
    try {
      const data = await this.service.alertaSemEscala(req.tenantId);
      ok(res, data);
    } catch (err) { next(err); }
  }
}

module.exports = EscalaController;
