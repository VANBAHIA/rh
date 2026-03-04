// src/modules/servidores/controller.js
const ServidoresService = require('./service');
const { success, created, paginated, noContent } = require('../../utils/response');

// O service é instanciado por request para receber o db com tenant scope
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
  const data = await getService(req).criar(req.body, req.user.id);
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

// Stubs para implementação futura
const exportar = async (req, res) => success(res, { message: 'Exportação em desenvolvimento.' });
const buscarDadosBancarios = async (req, res) => success(res, {});
const atualizarDadosBancarios = async (req, res) => success(res, {});
const uploadDocumento = async (req, res) => created(res, {});
const removerDocumento = async (req, res) => noContent(res);

module.exports = {
  listar, buscarPorId, criar, atualizar, alterarSituacao, remover,
  historico, extrato, exportar,
  listarDocumentos, uploadDocumento, removerDocumento,
  buscarDadosBancarios, atualizarDadosBancarios,
  listarProgressoes, registrarProgressao,
};
