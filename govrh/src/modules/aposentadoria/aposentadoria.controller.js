const AposentadoriaService = require('./aposentadoria.service');
const { ok, created, paginate } = require('../../shared/utils/response');
const { parsePagination } = require('../../shared/utils/pagination');

class AposentadoriaController {
  constructor() {
    this.service = new AposentadoriaService();
    Object.getOwnPropertyNames(AposentadoriaController.prototype)
      .filter(m => m !== 'constructor')
      .forEach(m => (this[m] = this[m].bind(this)));
  }
  async simular(req, res, next) {
    try { ok(res, await this.service.simular(req.tenantId, req.params.servidorId)); } catch (e) { next(e); }
  }
  async listar(req, res, next) {
    try {
      const { skip, take, page, limit } = parsePagination(req.query);
      const { dados, total } = await this.service.listar(req.tenantId, req.query, skip, take);
      paginate(res, dados, total, page, limit);
    } catch (e) { next(e); }
  }
  async pedido(req, res, next) {
    try { created(res, await this.service.pedido(req.tenantId, req.body)); } catch (e) { next(e); }
  }
  async buscar(req, res, next) {
    try { ok(res, await this.service.buscar(req.tenantId, req.params.id)); } catch (e) { next(e); }
  }
  async conceder(req, res, next) {
    try { ok(res, await this.service.conceder(req.tenantId, req.params.id, req.body)); } catch (e) { next(e); }
  }
  async indeferir(req, res, next) {
    try { ok(res, await this.service.indeferir(req.tenantId, req.params.id, req.body)); } catch (e) { next(e); }
  }
  async pensionistas(req, res, next) {
    try {
      const { skip, take, page, limit } = parsePagination(req.query);
      const { dados, total } = await this.service.pensionistas(req.tenantId, req.query, skip, take);
      paginate(res, dados, total, page, limit);
    } catch (e) { next(e); }
  }
  async criarPensao(req, res, next) {
    try { created(res, await this.service.criarPensao(req.tenantId, req.body)); } catch (e) { next(e); }
  }
  async cessarPensao(req, res, next) {
    try { ok(res, await this.service.cessarPensao(req.tenantId, req.params.id, req.body)); } catch (e) { next(e); }
  }
}

module.exports = AposentadoriaController;
