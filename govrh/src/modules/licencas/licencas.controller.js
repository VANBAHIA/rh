const LicencasService = require('./licencas.service');
const { ok, created, noContent, paginate } = require('../../shared/utils/response');
const { parsePagination } = require('../../shared/utils/pagination');

class LicencasController {
  constructor() {
    this.service = new LicencasService();
    Object.getOwnPropertyNames(LicencasController.prototype)
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
  async listarPorServidor(req, res, next) {
    try { ok(res, await this.service.listarPorServidor(req.tenantId, req.params.servidorId)); } catch (e) { next(e); }
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
  async aprovar(req, res, next) {
    try { ok(res, await this.service.aprovar(req.tenantId, req.params.id, req.body)); } catch (e) { next(e); }
  }
  async encerrar(req, res, next) {
    try { ok(res, await this.service.encerrar(req.tenantId, req.params.id, req.body)); } catch (e) { next(e); }
  }
  async prorrogar(req, res, next) {
    try { ok(res, await this.service.prorrogar(req.tenantId, req.params.id, req.body)); } catch (e) { next(e); }
  }
  async vencendo(req, res, next) {
    try { ok(res, await this.service.vencendo(req.tenantId, req.query)); } catch (e) { next(e); }
  }
}

module.exports = LicencasController;
