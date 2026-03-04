const AssinaturaService = require('./assinatura.service');
const { ok, created, paginate } = require('../../shared/utils/response');
const { parsePagination } = require('../../shared/utils/pagination');

class AssinaturaController {
  constructor() {
    this.service = new AssinaturaService();
    Object.getOwnPropertyNames(AssinaturaController.prototype)
      .filter(m => m !== 'constructor')
      .forEach(m => (this[m] = this[m].bind(this)));
  }
  async pendentes(req, res, next) {
    try { ok(res, await this.service.pendentes(req.tenantId, req.userId)); } catch (e) { next(e); }
  }
  async listar(req, res, next) {
    try {
      const { skip, take, page, limit } = parsePagination(req.query);
      const { dados, total } = await this.service.listar(req.tenantId, req.query, skip, take);
      paginate(res, dados, total, page, limit);
    } catch (e) { next(e); }
  }
  async criar(req, res, next) {
    try { created(res, await this.service.criar(req.tenantId, req.body, req.userId)); } catch (e) { next(e); }
  }
  async buscar(req, res, next) {
    try { ok(res, await this.service.buscar(req.tenantId, req.params.id)); } catch (e) { next(e); }
  }
  async assinar(req, res, next) {
    try { ok(res, await this.service.assinar(req.tenantId, req.params.id, req.userId, req.body)); } catch (e) { next(e); }
  }
  async recusar(req, res, next) {
    try { ok(res, await this.service.recusar(req.tenantId, req.params.id, req.userId, req.body)); } catch (e) { next(e); }
  }
}

module.exports = AssinaturaController;
