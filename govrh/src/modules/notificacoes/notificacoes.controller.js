const NotificacoesService = require('./notificacoes.service');
const { ok, noContent, paginate } = require('../../shared/utils/response');
const { parsePagination } = require('../../shared/utils/pagination');

class NotificacoesController {
  constructor() {
    this.service = new NotificacoesService();
    Object.getOwnPropertyNames(NotificacoesController.prototype)
      .filter(m => m !== 'constructor')
      .forEach(m => (this[m] = this[m].bind(this)));
  }
  async listar(req, res, next) {
    try {
      const { skip, take, page, limit } = parsePagination(req.query);
      const { dados, total } = await this.service.listar(req.tenantId, req.userId, req.query, skip, take);
      paginate(res, dados, total, page, limit);
    } catch (e) { next(e); }
  }
  async naoLidas(req, res, next) {
    try { ok(res, await this.service.naoLidas(req.tenantId, req.userId)); } catch (e) { next(e); }
  }
  async marcarLida(req, res, next) {
    try { ok(res, await this.service.marcarLida(req.tenantId, req.userId, req.params.id)); } catch (e) { next(e); }
  }
  async marcarTodasLidas(req, res, next) {
    try { ok(res, await this.service.marcarTodasLidas(req.tenantId, req.userId)); } catch (e) { next(e); }
  }
  async remover(req, res, next) {
    try { await this.service.remover(req.tenantId, req.userId, req.params.id); noContent(res); } catch (e) { next(e); }
  }
}

module.exports = NotificacoesController;
