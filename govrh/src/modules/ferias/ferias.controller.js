const FeriasService = require('./ferias.service');
const { ok, created, noContent, paginate } = require('../../shared/utils/response');
const { parsePagination } = require('../../shared/utils/pagination');

class FeriasController {
  constructor() {
    this.service = new FeriasService();
    Object.getOwnPropertyNames(FeriasController.prototype)
      .filter(m => m !== 'constructor')
      .forEach(m => (this[m] = this[m].bind(this)));
  }
  async periodos(req, res, next) {
    try { ok(res, await this.service.periodos(req.tenantId, req.params.servidorId)); } catch (e) { next(e); }
  }
  async criarPeriodo(req, res, next) {
    try { created(res, await this.service.criarPeriodo(req.tenantId, req.body)); } catch (e) { next(e); }
  }
  async agendar(req, res, next) {
    try { created(res, await this.service.agendar(req.tenantId, req.body)); } catch (e) { next(e); }
  }
  async buscar(req, res, next) {
    try { ok(res, await this.service.buscar(req.tenantId, req.params.id)); } catch (e) { next(e); }
  }
  async aprovar(req, res, next) {
    try { ok(res, await this.service.aprovar(req.tenantId, req.params.id, req.userId, req.body)); } catch (e) { next(e); }
  }
  async cancelar(req, res, next) {
    try { ok(res, await this.service.cancelar(req.tenantId, req.params.id, req.body)); } catch (e) { next(e); }
  }
  async vencendo(req, res, next) {
    try {
      const { skip, take, page, limit } = parsePagination(req.query);
      const { dados, total } = await this.service.vencendo(req.tenantId, req.query, skip, take);
      paginate(res, dados, total, page, limit);
    } catch (e) { next(e); }
  }
  async programacao(req, res, next) {
    try { ok(res, await this.service.programacao(req.tenantId, req.params.mes)); } catch (e) { next(e); }
  }
}

module.exports = FeriasController;
