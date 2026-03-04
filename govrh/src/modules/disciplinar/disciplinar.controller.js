const DisciplinarService = require('./disciplinar.service');
const { ok, created, noContent, paginate } = require('../../shared/utils/response');
const { parsePagination } = require('../../shared/utils/pagination');

class DisciplinarController {
  constructor() {
    this.service = new DisciplinarService();
    Object.getOwnPropertyNames(DisciplinarController.prototype)
      .filter(m => m !== 'constructor')
      .forEach(m => (this[m] = this[m].bind(this)));
  }
  async listar(req, res, next) {
    try {
      const { skip, take, page, limit } = parsePagination(req.query);
      const { dados, total } = await this.service.listar(req.tenantId, req.query, skip, take);
      paginate(res, dados, total, page, limit);
    } catch (e) { next(e); }
  }
  async criar(req, res, next) {
    try { created(res, await this.service.criar(req.tenantId, req.body)); } catch (e) { next(e); }
  }
  async buscar(req, res, next) {
    try { ok(res, await this.service.buscar(req.tenantId, req.params.id)); } catch (e) { next(e); }
  }
  async atualizar(req, res, next) {
    try { ok(res, await this.service.atualizar(req.tenantId, req.params.id, req.body)); } catch (e) { next(e); }
  }
  async addDocumento(req, res, next) {
    try { created(res, await this.service.addDocumento(req.tenantId, req.params.id, req.body)); } catch (e) { next(e); }
  }
  async removerDocumento(req, res, next) {
    try { await this.service.removerDocumento(req.tenantId, req.params.id, req.params.docId); noContent(res); } catch (e) { next(e); }
  }
  async aplicarPenalidade(req, res, next) {
    try { ok(res, await this.service.aplicarPenalidade(req.tenantId, req.params.id, req.body)); } catch (e) { next(e); }
  }
  async arquivar(req, res, next) {
    try { ok(res, await this.service.arquivar(req.tenantId, req.params.id, req.body)); } catch (e) { next(e); }
  }
  async encerrar(req, res, next) {
    try { ok(res, await this.service.encerrar(req.tenantId, req.params.id, req.body)); } catch (e) { next(e); }
  }
}

module.exports = DisciplinarController;
