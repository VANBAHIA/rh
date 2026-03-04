const ConcursoService = require('./concurso.service');
const { ok, created, paginate } = require('../../shared/utils/response');
const { parsePagination } = require('../../shared/utils/pagination');

class ConcursoController {
  constructor() {
    this.service = new ConcursoService();
    Object.getOwnPropertyNames(ConcursoController.prototype)
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
  async candidatos(req, res, next) {
    try {
      const { skip, take, page, limit } = parsePagination(req.query);
      const { dados, total } = await this.service.candidatos(req.tenantId, req.params.id, req.query, skip, take);
      paginate(res, dados, total, page, limit);
    } catch (e) { next(e); }
  }
  async importarCandidatos(req, res, next) {
    try { ok(res, await this.service.importarCandidatos(req.tenantId, req.params.id, req.body)); } catch (e) { next(e); }
  }
  async buscarCandidato(req, res, next) {
    try { ok(res, await this.service.buscarCandidato(req.tenantId, req.params.id, req.params.candId)); } catch (e) { next(e); }
  }
  async convocar(req, res, next) {
    try { ok(res, await this.service.convocar(req.tenantId, req.params.id, req.body)); } catch (e) { next(e); }
  }
  async registrarPosse(req, res, next) {
    try { created(res, await this.service.registrarPosse(req.tenantId, req.params.id, req.body)); } catch (e) { next(e); }
  }
  async estagiosEmAndamento(req, res, next) {
    try {
      const { skip, take, page, limit } = parsePagination(req.query);
      const { dados, total } = await this.service.estagiosEmAndamento(req.tenantId, req.query, skip, take);
      paginate(res, dados, total, page, limit);
    } catch (e) { next(e); }
  }
  async registrarAvaliacao(req, res, next) {
    try { created(res, await this.service.registrarAvaliacao(req.tenantId, req.params.servidorId, req.body)); } catch (e) { next(e); }
  }
  async concluirEstagio(req, res, next) {
    try { ok(res, await this.service.concluirEstagio(req.tenantId, req.params.servidorId, req.body)); } catch (e) { next(e); }
  }
}

module.exports = ConcursoController;
