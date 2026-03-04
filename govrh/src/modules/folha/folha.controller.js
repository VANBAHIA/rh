const FolhaService = require('./folha.service');
const { ok, created, noContent, paginate } = require('../../shared/utils/response');
const { parsePagination } = require('../../shared/utils/pagination');

class FolhaController {
  constructor() {
    this.service = new FolhaService();
    Object.getOwnPropertyNames(FolhaController.prototype)
      .filter(m => m !== 'constructor')
      .forEach(m => (this[m] = this[m].bind(this)));
  }

  async listarVerbas(req, res, next) {
    try { ok(res, await this.service.listarVerbas(req.tenantId, req.query)); }
    catch (err) { next(err); }
  }
  async criarVerba(req, res, next) {
    try { created(res, await this.service.criarVerba(req.tenantId, req.body)); }
    catch (err) { next(err); }
  }
  async atualizarVerba(req, res, next) {
    try { ok(res, await this.service.atualizarVerba(req.tenantId, req.params.id, req.body)); }
    catch (err) { next(err); }
  }
  async getConfig(req, res, next) {
    try { ok(res, await this.service.getConfig(req.tenantId)); }
    catch (err) { next(err); }
  }
  async salvarConfig(req, res, next) {
    try { ok(res, await this.service.salvarConfig(req.tenantId, req.body)); }
    catch (err) { next(err); }
  }
  async listarConsignados(req, res, next) {
    try { ok(res, await this.service.listarConsignados(req.tenantId, req.params.servidorId)); }
    catch (err) { next(err); }
  }
  async criarConsignado(req, res, next) {
    try { created(res, await this.service.criarConsignado(req.tenantId, req.body)); }
    catch (err) { next(err); }
  }
  async atualizarConsignado(req, res, next) {
    try { ok(res, await this.service.atualizarConsignado(req.tenantId, req.params.id, req.body)); }
    catch (err) { next(err); }
  }
  async cancelarConsignado(req, res, next) {
    try { await this.service.cancelarConsignado(req.tenantId, req.params.id); noContent(res); }
    catch (err) { next(err); }
  }
  async listarFolhas(req, res, next) {
    try {
      const { skip, take, page, limit } = parsePagination(req.query);
      const { folhas, total } = await this.service.listarFolhas(req.tenantId, req.query, skip, take);
      paginate(res, folhas, total, page, limit);
    } catch (err) { next(err); }
  }
  async processar(req, res, next) {
    try { ok(res, await this.service.processar(req.tenantId, req.body)); }
    catch (err) { next(err); }
  }
  async buscarFolha(req, res, next) {
    try { ok(res, await this.service.buscarFolha(req.tenantId, req.params.competencia, req.params.tipo)); }
    catch (err) { next(err); }
  }
  async listarItens(req, res, next) {
    try {
      const { skip, take, page, limit } = parsePagination(req.query);
      const { itens, total } = await this.service.listarItens(req.tenantId, req.params.competencia, req.params.tipo, req.query, skip, take);
      paginate(res, itens, total, page, limit);
    } catch (err) { next(err); }
  }
  async fechar(req, res, next) {
    try { ok(res, await this.service.fechar(req.tenantId, req.params.competencia, req.params.tipo)); }
    catch (err) { next(err); }
  }
  async reabrir(req, res, next) {
    try { ok(res, await this.service.reabrir(req.tenantId, req.params.competencia, req.params.tipo)); }
    catch (err) { next(err); }
  }
  async holerite(req, res, next) {
    try { ok(res, await this.service.holerite(req.tenantId, req.params.servidorId, req.params.competencia)); }
    catch (err) { next(err); }
  }
}

module.exports = FolhaController;
