const PontoService = require('./ponto.service');
const { ok, created, noContent, paginate } = require('../../shared/utils/response');
const { parsePagination } = require('../../shared/utils/pagination');

class PontoController {
  constructor() {
    this.service = new PontoService();
    Object.getOwnPropertyNames(PontoController.prototype)
      .filter(m => m !== 'constructor')
      .forEach(m => (this[m] = this[m].bind(this)));
  }
  async listarEscalas(req, res, next) {
    try { ok(res, await this.service.listarEscalas(req.tenantId)); } catch (e) { next(e); }
  }
  async criarEscala(req, res, next) {
    try { created(res, await this.service.criarEscala(req.tenantId, req.body)); } catch (e) { next(e); }
  }
  async atualizarEscala(req, res, next) {
    try { ok(res, await this.service.atualizarEscala(req.tenantId, req.params.id, req.body)); } catch (e) { next(e); }
  }
  async excluirEscala(req, res, next) {
    try { noContent(res, await this.service.excluirEscala(req.tenantId, req.params.id)); } catch (e) { next(e); }
  }
  async vincularServidorEscala(req, res, next) {
    try { ok(res, await this.service.vincularServidorEscala(req.tenantId, req.params.id, req.body)); } catch (e) { next(e); }
  }
  async espelho(req, res, next) {
    try { ok(res, await this.service.espelho(req.tenantId, req.params.servidorId, req.params.mes)); } catch (e) { next(e); }
  }
  async lancar(req, res, next) {
    try { created(res, await this.service.lancar(req.tenantId, req.body)); } catch (e) { next(e); }
  }
  async bater(req, res, next) {
    try {
      // SEGURANÇA: data e hora NÃO são lidas do body — o service usa new Date() do servidor
      const { servidorId } = req.body;
      const batida = await this.service.bater(req.tenantId, { servidorId });
      created(res, batida);
    } catch (e) { next(e); }
  }
  // Valida escala e horário ANTES de registrar — chamado pelo terminal de ponto
  async validarBatida(req, res, next) {
    try {
      // SEGURANÇA: data e hora NÃO são lidas do body — o service usa new Date() do servidor
      const { servidorId } = req.body;
      ok(res, await this.service.validarBatida(req.tenantId, { servidorId }));
    } catch (e) { next(e); }
  }
  async importar(req, res, next) {
    try { ok(res, await this.service.importar(req.tenantId, req.body)); } catch (e) { next(e); }
  }
  async abonar(req, res, next) {
    try { ok(res, await this.service.abonar(req.tenantId, req.params.id, req.body, req.userId)); } catch (e) { next(e); }
  }
  async registrarOcorrencia(req, res, next) {
    try { ok(res, await this.service.registrarOcorrencia(req.tenantId, req.params.id, req.body)); } catch (e) { next(e); }
  }
  async bancohoras(req, res, next) {
    try { ok(res, await this.service.bancohoras(req.tenantId, req.params.servidorId)); } catch (e) { next(e); }
  }
  async compensar(req, res, next) {
    try { ok(res, await this.service.compensar(req.tenantId, req.params.servidorId, req.body)); } catch (e) { next(e); }
  }
  async resumoMensal(req, res, next) {
    try {
      const { skip, take, page, limit } = parsePagination(req.query);
      const { dados, total } = await this.service.resumoMensal(req.tenantId, req.params.mes, req.query, skip, take);
      paginate(res, dados, total, page, limit);
    } catch (e) { next(e); }
  }
  async pendencias(req, res, next) {
    try { ok(res, await this.service.pendencias(req.tenantId, req.query)); } catch (e) { next(e); }
  }
}

module.exports = PontoController;
