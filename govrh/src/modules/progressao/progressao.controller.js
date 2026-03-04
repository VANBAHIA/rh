const ProgressaoService = require('./progressao.service');
const { ok, created, paginate } = require('../../shared/utils/response');
const { parsePagination } = require('../../shared/utils/pagination');

class ProgressaoController {
  constructor() {
    this.service = new ProgressaoService();
    Object.getOwnPropertyNames(ProgressaoController.prototype)
      .filter(m => m !== 'constructor')
      .forEach(m => (this[m] = this[m].bind(this)));
  }

  async aptos(req, res, next) {
    try {
      const { skip, take, page, limit } = parsePagination(req.query);
      const { dados, total } = await this.service.aptos(req.tenantId, req.query, skip, take);
      paginate(res, dados, total, page, limit);
    } catch (e) { next(e); }
  }

  async simular(req, res, next) {
    try { ok(res, await this.service.simular(req.tenantId, req.params.servidorId)); }
    catch (e) { next(e); }
  }

  async listarPorServidor(req, res, next) {
    try { ok(res, await this.service.listarPorServidor(req.tenantId, req.params.servidorId)); }
    catch (e) { next(e); }
  }

  async processarHorizontal(req, res, next) {
    try { created(res, await this.service.processarHorizontal(req.tenantId, req.body)); }
    catch (e) { next(e); }
  }

  async processarVerticalTitulacao(req, res, next) {
    try { created(res, await this.service.processarVerticalTitulacao(req.tenantId, req.body)); }
    catch (e) { next(e); }
  }

  async processarEnquadramento(req, res, next) {
    try { created(res, await this.service.processarEnquadramento(req.tenantId, req.body)); }
    catch (e) { next(e); }
  }

  async aprovar(req, res, next) {
    try { ok(res, await this.service.aprovar(req.tenantId, req.params.id, req.userId, req.body)); }
    catch (e) { next(e); }
  }

  async rejeitar(req, res, next) {
    try { ok(res, await this.service.rejeitar(req.tenantId, req.params.id, req.userId, req.body)); }
    catch (e) { next(e); }
  }

  async processarLote(req, res, next) {
    try { ok(res, await this.service.processarLote(req.tenantId, req.body)); }
    catch (e) { next(e); }
  }
}

module.exports = ProgressaoController;
