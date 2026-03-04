// src/modules/servidores/routes.js
const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { auditLog } = require('../../middlewares/audit.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const controller = require('./controller');
const { criarServidorSchema, atualizarServidorSchema, filtroSchema } = require('./schemas');

const router = Router();

// Todos os endpoints exigem autenticação
router.use(authenticate);

// Listagem e busca
router.get('/', authorize('GESTOR_RH', 'ADMIN_ORGAO', 'AUDITOR'), validate(filtroSchema), controller.listar);
router.get('/exportar', authorize('GESTOR_RH', 'ADMIN_ORGAO'), controller.exportar);
router.get('/:id', authorize('GESTOR_RH', 'ADMIN_ORGAO', 'AUDITOR', 'SERVIDOR'), controller.buscarPorId);
router.get('/:id/historico', authorize('GESTOR_RH', 'ADMIN_ORGAO', 'AUDITOR'), controller.historico);
router.get('/:id/extrato', authorize('GESTOR_RH', 'ADMIN_ORGAO', 'SERVIDOR'), controller.extrato);

// Criação e edição — apenas Gestor RH e Admin
router.post('/', authorize('GESTOR_RH', 'ADMIN_ORGAO'), auditLog('servidor'), validate(criarServidorSchema), controller.criar);
router.put('/:id', authorize('GESTOR_RH', 'ADMIN_ORGAO'), auditLog('servidor'), validate(atualizarServidorSchema), controller.atualizar);
router.patch('/:id/situacao', authorize('GESTOR_RH', 'ADMIN_ORGAO'), auditLog('servidor'), controller.alterarSituacao);
router.delete('/:id', authorize('ADMIN_ORGAO'), auditLog('servidor'), controller.remover);

// Dados bancários
router.get('/:id/dados-bancarios', authorize('GESTOR_RH', 'ADMIN_ORGAO', 'SERVIDOR'), controller.buscarDadosBancarios);
router.put('/:id/dados-bancarios', authorize('GESTOR_RH', 'ADMIN_ORGAO'), auditLog('dados_bancarios'), controller.atualizarDadosBancarios);

// Documentos do servidor
router.get('/:id/documentos', authorize('GESTOR_RH', 'ADMIN_ORGAO', 'SERVIDOR'), controller.listarDocumentos);
router.post('/:id/documentos', authorize('GESTOR_RH', 'ADMIN_ORGAO'), auditLog('documento_servidor'), controller.uploadDocumento);
router.delete('/:id/documentos/:docId', authorize('GESTOR_RH', 'ADMIN_ORGAO'), auditLog('documento_servidor'), controller.removerDocumento);

// Progressão funcional
router.get('/:id/progressoes', authorize('GESTOR_RH', 'ADMIN_ORGAO', 'SERVIDOR'), controller.listarProgressoes);
router.post('/:id/progressoes', authorize('GESTOR_RH', 'ADMIN_ORGAO'), auditLog('progressao'), controller.registrarProgressao);

module.exports = router;
