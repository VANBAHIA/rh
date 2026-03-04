const CargosService = require('./cargos.service');
const { ok, created, noContent, paginate } = require('../../shared/utils/response');
const { parsePagination } = require('../../shared/utils/pagination');

class CargosController {
  constructor() {
    this.service = new CargosService();
    Object.getOwnPropertyNames(CargosController.prototype)
      .filter(m => m !== 'constructor')
      .forEach(m => (this[m] = this[m].bind(this)));
  }

  // ── Grupos Ocupacionais ──────────────────────────────────
  async listarGrupos(req, res, next) {
    try {
      const dados = await this.service.listarGrupos(req.tenantId, req.query);
      ok(res, dados);
    } catch (err) { next(err); }
  }

  async criarGrupo(req, res, next) {
    try {
      const dado = await this.service.criarGrupo(req.tenantId, req.body);
      created(res, dado);
    } catch (err) { next(err); }
  }

  async atualizarGrupo(req, res, next) {
    try {
      const dado = await this.service.atualizarGrupo(req.tenantId, req.params.id, req.body);
      ok(res, dado);
    } catch (err) { next(err); }
  }

  async desativarGrupo(req, res, next) {
    try {
      await this.service.desativarGrupo(req.tenantId, req.params.id);
      noContent(res);
    } catch (err) { next(err); }
  }

  // ── Cargos ───────────────────────────────────────────────
  async listarCargos(req, res, next) {
    try {
      const { skip, take, page, limit } = parsePagination(req.query);
      const { cargos, total } = await this.service.listarCargos(req.tenantId, req.query, skip, take);
      paginate(res, cargos, total, page, limit);
    } catch (err) { next(err); }
  }

  async criarCargo(req, res, next) {
    try {
      const cargo = await this.service.criarCargo(req.tenantId, req.body);
      created(res, cargo);
    } catch (err) { next(err); }
  }

  async buscarCargo(req, res, next) {
    try {
      const cargo = await this.service.buscarCargo(req.tenantId, req.params.id);
      ok(res, cargo);
    } catch (err) { next(err); }
  }

  async atualizarCargo(req, res, next) {
    try {
      const cargo = await this.service.atualizarCargo(req.tenantId, req.params.id, req.body);
      ok(res, cargo);
    } catch (err) { next(err); }
  }

  async desativarCargo(req, res, next) {
    try {
      await this.service.desativarCargo(req.tenantId, req.params.id);
      noContent(res);
    } catch (err) { next(err); }
  }

  // ── Tabelas Salariais ────────────────────────────────────
  async listarTabelas(req, res, next) {
    try {
      const dados = await this.service.listarTabelas(req.tenantId, req.query);
      ok(res, dados);
    } catch (err) { next(err); }
  }

  async criarTabela(req, res, next) {
    try {
      const dado = await this.service.criarTabela(req.tenantId, req.body);
      created(res, dado);
    } catch (err) { next(err); }
  }

  async buscarTabela(req, res, next) {
    try {
      const dado = await this.service.buscarTabela(req.tenantId, req.params.id);
      ok(res, dado);
    } catch (err) { next(err); }
  }

  async atualizarTabela(req, res, next) {
    try {
      const dado = await this.service.atualizarTabela(req.tenantId, req.params.id, req.body);
      ok(res, dado);
    } catch (err) { next(err); }
  }

  // ── Níveis Salariais ─────────────────────────────────────
  async listarNiveis(req, res, next) {
    try {
      const dados = await this.service.listarNiveis(req.tenantId, req.params.tabelaId);
      ok(res, dados);
    } catch (err) { next(err); }
  }

  async criarNivel(req, res, next) {
    try {
      const dado = await this.service.criarNivel(req.tenantId, req.params.tabelaId, req.body);
      created(res, dado);
    } catch (err) { next(err); }
  }

  async atualizarNivel(req, res, next) {
    try {
      const dado = await this.service.atualizarNivel(req.tenantId, req.params.tabelaId, req.params.id, req.body);
      ok(res, dado);
    } catch (err) { next(err); }
  }

  async removerNivel(req, res, next) {
    try {
      await this.service.removerNivel(req.tenantId, req.params.tabelaId, req.params.id);
      noContent(res);
    } catch (err) { next(err); }
  }

  // ── Lotações ─────────────────────────────────────────────
  async listarLotacoes(req, res, next) {
    try {
      const dados = await this.service.listarLotacoes(req.tenantId, req.query);
      ok(res, dados);
    } catch (err) { next(err); }
  }

  async criarLotacao(req, res, next) {
    try {
      const dado = await this.service.criarLotacao(req.tenantId, req.body);
      created(res, dado);
    } catch (err) { next(err); }
  }

  async atualizarLotacao(req, res, next) {
    try {
      const dado = await this.service.atualizarLotacao(req.tenantId, req.params.id, req.body);
      ok(res, dado);
    } catch (err) { next(err); }
  }

  async desativarLotacao(req, res, next) {
    try {
      await this.service.desativarLotacao(req.tenantId, req.params.id);
      noContent(res);
    } catch (err) { next(err); }
  }

  // ── Consultas especiais ──────────────────────────────────
  async matrizSalarial(req, res, next) {
    try {
      const matriz = await this.service.matrizSalarial(req.tenantId, req.params.tabelaId);
      ok(res, matriz);
    } catch (err) { next(err); }
  }

  async servidoresDoCargo(req, res, next) {
    try {
      const { skip, take, page, limit } = parsePagination(req.query);
      const { servidores, total } = await this.service.servidoresDoCargo(req.tenantId, req.params.id, skip, take);
      paginate(res, servidores, total, page, limit);
    } catch (err) { next(err); }
  }
}

module.exports = CargosController;
