const TenantsService = require('./tenants.service');
const { ok, created, noContent, paginate } = require('../../shared/utils/response');
const { parsePagination } = require('../../shared/utils/pagination');
const { Errors } = require('../../shared/errors/AppError');

class TenantsController {
  constructor() {
    this.service = new TenantsService();
    Object.getOwnPropertyNames(TenantsController.prototype)
      .filter(m => m !== 'constructor')
      .forEach(m => (this[m] = this[m].bind(this)));
  }

  _checkSuperAdmin(req) {
    if (!req.isSuperAdmin) throw Errors.FORBIDDEN();
  }

  async listar(req, res, next) {
    try {
      this._checkSuperAdmin(req);
      const { skip, take, page, limit } = parsePagination(req.query);
      const { dados, total } = await this.service.listar(req.query, skip, take);
      paginate(res, dados, total, page, limit);
    } catch (e) { next(e); }
  }
  async criar(req, res, next) {
    try {
      this._checkSuperAdmin(req);
      created(res, await this.service.criar(req.body));
    } catch (e) { next(e); }
  }
  async buscar(req, res, next) {
    try {
      this._checkSuperAdmin(req);
      ok(res, await this.service.buscar(req.params.id));
    } catch (e) { next(e); }
  }
  async atualizar(req, res, next) {
    try {
      this._checkSuperAdmin(req);
      ok(res, await this.service.atualizar(req.params.id, req.body));
    } catch (e) { next(e); }
  }
  async alterarStatus(req, res, next) {
    try {
      this._checkSuperAdmin(req);
      ok(res, await this.service.alterarStatus(req.params.id, req.body.ativo));
    } catch (e) { next(e); }
  }
  async usuarios(req, res, next) {
    try {
      this._checkSuperAdmin(req);
      const { skip, take, page, limit } = parsePagination(req.query);
      const { dados, total } = await this.service.usuarios(req.params.id, skip, take);
      paginate(res, dados, total, page, limit);
    } catch (e) { next(e); }
  }
  async criarUsuario(req, res, next) {
    try {
      this._checkSuperAdmin(req);
      created(res, await this.service.criarUsuario(req.params.id, req.body));
    } catch (e) { next(e); }
  }
  async atualizarUsuario(req, res, next) {
    try {
      this._checkSuperAdmin(req);
      ok(res, await this.service.atualizarUsuario(req.params.id, req.params.uid, req.body));
    } catch (e) { next(e); }
  }
  async atribuirRoles(req, res, next) {
    try {
      this._checkSuperAdmin(req);
      ok(res, await this.service.atribuirRoles(req.params.id, req.params.uid, req.body.roleIds));
    } catch (e) { next(e); }
  }
  async listarRoles(req, res, next) {
    try {
      ok(res, await this.service.listarRoles(req.tenantId));
    } catch (e) { next(e); }
  }
  async criarRole(req, res, next) {
    try {
      this._checkSuperAdmin(req);
      created(res, await this.service.criarRole(req.tenantId, req.body));
    } catch (e) { next(e); }
  }
  async criarPermission(req, res, next) {
    try {
      this._checkSuperAdmin(req);
      created(res, await this.service.criarPermission(req.body));
    } catch (e) { next(e); }
  }
}

module.exports = TenantsController;
