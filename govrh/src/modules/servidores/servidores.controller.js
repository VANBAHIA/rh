const ServidorService = require('./servidores.service');
const { ok, created, noContent, paginate } = require('../../shared/utils/response');
const { parsePagination } = require('../../shared/utils/pagination');

class ServidorController {

  // ── Biometria facial ─────────────────────────────────────────

  constructor() {
    this.service = new ServidorService();
    Object.getOwnPropertyNames(ServidorController.prototype)
      .filter(m => m !== 'constructor')
      .forEach(m => (this[m] = this[m].bind(this)));
  }

  async registrarBiometriaFacial(req, res, next) {
    try {
      if (!req.file) throw new Error('Imagem não enviada');

      // Extrai embedding real usando o mesmo serviço do /facial/identify
      const { extrairEmbedding } = require('../facial/facial.service');
      const embedding = await extrairEmbedding(req.file.buffer);
      if (!embedding) throw new Error('Nenhum rosto detectado na imagem. Posicione o rosto centralizado e tente novamente.');

      const biometria = await this.service.registrarBiometriaFacial(
        req.tenantId,
        req.params.id,
        { embedding, modelo: 'face-api', cadastradoPor: req.user?.id || 'sistema' }
      );
      created(res, biometria);
    } catch (err) { next(err); }
  }
  // ── Servidores ───────────────────────────────────────────────
  async listar(req, res, next) {
    try {
      const { skip, take, page, limit } = parsePagination(req.query);
      const filtros = {
        situacao: req.query.situacao,
        regime: req.query.regime,
        lotacaoId: req.query.lotacaoId,
        cargoId: req.query.cargoId,
        search: req.query.q,
      };
      const { servidores, total } = await this.service.listar(req.tenantId, filtros, skip, take);
      paginate(res, servidores, total, page, limit);
    } catch (err) { next(err); }
  }

  async criar(req, res, next) {
    try {
      const servidor = await this.service.criar(req.tenantId, req.body);
      created(res, servidor);
    } catch (err) { next(err); }
  }

  async buscarPorId(req, res, next) {
    try {
      const servidor = await this.service.buscarPorId(req.tenantId, req.params.id);
      ok(res, servidor);
    } catch (err) { next(err); }
  }

  async atualizar(req, res, next) {
    try {
      const servidor = await this.service.atualizar(req.tenantId, req.params.id, req.body);
      ok(res, servidor);
    } catch (err) { next(err); }
  }

  async desativar(req, res, next) {
    try {
      await this.service.desativar(req.tenantId, req.params.id, req.body);
      noContent(res);
    } catch (err) { next(err); }
  }

  async exportar(req, res, next) {
    try {
      const buffer = await this.service.exportarXlsx(req.tenantId, req.query);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=servidores.xlsx');
      res.send(buffer);
    } catch (err) { next(err); }
  }

  async excluir(req, res, next) {
    try {
      await this.service.excluir(req.tenantId, req.params.id);
      noContent(res);
    } catch (err) { next(err); }
  }

  // ── Vínculos ─────────────────────────────────────────────────
  async historico(req, res, next) {
    try {
      const data = await this.service.historico(req.tenantId, req.params.id);
      ok(res, data);
    } catch (err) { next(err); }
  }

  async criarVinculo(req, res, next) {
    try {
      const data = await this.service.criarVinculo(req.tenantId, req.params.id, req.body);
      created(res, data);
    } catch (err) { next(err); }
  }

  async atualizarVinculo(req, res, next) {
    try {
      const data = await this.service.atualizarVinculo(req.tenantId, req.params.id, req.body);
      ok(res, data);
    } catch (err) { next(err); }
  }

  async corrigirVinculo(req, res, next) {
    try {
      const data = await this.service.corrigirVinculo(req.tenantId, req.params.id, req.params.vinculoId, req.body);
      ok(res, data);
    } catch (err) { next(err); }
  }

  // ── Contatos ─────────────────────────────────────────────────
  async listarContatos(req, res, next) {
    try {
      const data = await this.service.listarContatos(req.tenantId, req.params.id);
      ok(res, data);
    } catch (err) { next(err); }
  }

  async criarContato(req, res, next) {
    try {
      const data = await this.service.criarContato(req.tenantId, req.params.id, req.body);
      created(res, data);
    } catch (err) { next(err); }
  }

  async atualizarContato(req, res, next) {
    try {
      const data = await this.service.atualizarContato(
        req.tenantId, req.params.id, req.params.contatoId, req.body
      );
      ok(res, data);
    } catch (err) { next(err); }
  }

  async removerContato(req, res, next) {
    try {
      await this.service.removerContato(req.tenantId, req.params.id, req.params.contatoId);
      noContent(res);
    } catch (err) { next(err); }
  }

  // ── Endereços ────────────────────────────────────────────────
  async listarEnderecos(req, res, next) {
    try {
      const data = await this.service.listarEnderecos(req.tenantId, req.params.id);
      ok(res, data);
    } catch (err) { next(err); }
  }

  async criarEndereco(req, res, next) {
    try {
      const data = await this.service.criarEndereco(req.tenantId, req.params.id, req.body);
      created(res, data);
    } catch (err) { next(err); }
  }

  async atualizarEndereco(req, res, next) {
    try {
      const data = await this.service.atualizarEndereco(
        req.tenantId, req.params.id, req.params.enderecoId, req.body
      );
      ok(res, data);
    } catch (err) { next(err); }
  }

  async removerEndereco(req, res, next) {
    try {
      await this.service.removerEndereco(req.tenantId, req.params.id, req.params.enderecoId);
      noContent(res);
    } catch (err) { next(err); }
  }

  // ── Sub-recursos ─────────────────────────────────────────────
  async documentos(req, res, next) {
    try {
      const docs = await this.service.documentos(req.tenantId, req.params.id);
      ok(res, docs);
    } catch (err) { next(err); }
  }

  async uploadDocumento(req, res, next) {
    try {
      const doc = await this.service.uploadDocumento(req.tenantId, req.params.id, req.body);
      created(res, doc);
    } catch (err) { next(err); }
  }

  async progressoes(req, res, next) {
    try {
      const data = await this.service.progressoes(req.tenantId, req.params.id);
      ok(res, data);
    } catch (err) { next(err); }
  }

  async extrato(req, res, next) {
    try {
      const data = await this.service.extrato(req.tenantId, req.params.id);
      ok(res, data);
    } catch (err) { next(err); }
  }
}

module.exports = ServidorController;