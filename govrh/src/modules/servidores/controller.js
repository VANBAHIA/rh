// src/modules/servidores/controller.js
const ServidoresService = require('./service');
const { success, created, paginated, noContent } = require('../../utils/response');

const getService = (req) => new ServidoresService(req.db);

const listar = async (req, res) => {
  const { page, pageSize, servidores, total } = await getService(req).listar(req.query, req.query);
  paginated(res, servidores, { page, pageSize, total });
};

const buscarPorId = async (req, res) => {
  const data = await getService(req).buscarPorId(req.params.id);
  success(res, data);
};

const criar = async (req, res) => {
  const data = await getService(req).criar(req.body, req.user.tenantId, req.user.id);
  created(res, data);
};

const atualizar = async (req, res) => {
  const data = await getService(req).atualizar(req.params.id, req.body, req.user.id);
  success(res, data);
};

const alterarSituacao = async (req, res) => {
  const data = await getService(req).alterarSituacao(req.params.id, req.body, req.user.id);
  success(res, data);
};

const remover = async (req, res) => {
  await getService(req).repo?.delete(req.params.id);
  noContent(res);
};

const historico = async (req, res) => {
  const data = await getService(req).historico(req.params.id);
  success(res, data);
};

const extrato = async (req, res) => {
  const data = await getService(req).extrato(req.params.id);
  success(res, data);
};

const listarDocumentos = async (req, res) => {
  const svc = getService(req);
  const data = await svc.repo.findDocumentos(req.params.id);
  success(res, data);
};

const listarProgressoes = async (req, res) => {
  const svc = getService(req);
  const data = await svc.repo.findProgressoes(req.params.id);
  success(res, data);
};

const registrarProgressao = async (req, res) => {
  const data = await getService(req).registrarProgressao(req.params.id, req.body, req.user.id);
  created(res, data);
};

const buscarDadosBancarios = async (req, res) => {
  const data = await getService(req).buscarDadosBancarios(req.params.id);
  success(res, data);
};

const adicionarDadosBancarios = async (req, res) => {
  const data = await getService(req).adicionarDadosBancarios(
    req.params.id, req.body, req.user.id
  );
  created(res, data);
};

const ativarConta = async (req, res) => {
  const data = await getService(req).ativarConta(
    req.params.id, req.params.contaId, req.user.id
  );
  success(res, data);
};

// ── Escala de trabalho ────────────────────────────────────────────────────────

const obterEscala = async (req, res) => {
  const data = await getService(req).obterEscala(req.params.id);
  success(res, data);
};

const vincularEscala = async (req, res) => {
  const data = await getService(req).vincularEscala(req.params.id, req.body, req.user.id);
  created(res, data);
};

const historicoEscala = async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1)
  const limit = Math.min(50, parseInt(req.query.limit) || 5)
  const data  = await getService(req).historicoEscala(req.params.id, { page, limit });
  success(res, data);
};

// ── Stubs ─────────────────────────────────────────────────────────────────────

const exportar          = async (req, res) => success(res, { message: 'Exportação em desenvolvimento.' });
const atualizarDadosBancarios = async (req, res) => success(res, {});
const uploadDocumento   = async (req, res) => created(res, {});
const removerDocumento  = async (req, res) => noContent(res);

module.exports = {
  listar, buscarPorId, criar, atualizar, alterarSituacao, remover,
  historico, extrato, exportar,
  listarDocumentos, uploadDocumento, removerDocumento,
  buscarDadosBancarios, atualizarDadosBancarios, ativarConta,
  listarProgressoes, registrarProgressao,
  obterEscala, vincularEscala, historicoEscala,
};