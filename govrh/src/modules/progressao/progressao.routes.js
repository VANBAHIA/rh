const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const { auditLog } = require('../../middlewares/auditLogger');
const ProgressaoController = require('./progressao.controller');

const router = Router();
const ctrl = new ProgressaoController();
router.use(authenticate);

// Consultas
router.get('/aptos',                  authorize('progressao', 'read'),   ctrl.aptos);
router.get('/simulacao/:servidorId',  authorize('progressao', 'read'),   ctrl.simular);
router.get('/:servidorId',            authorize('progressao', 'read'),   ctrl.listarPorServidor);

// Progressão horizontal (classe A→B→C→D→E)
router.post('/horizontal',            authorize('progressao', 'create'), auditLog('progressao', 'horizontal'), ctrl.processarHorizontal);

// Progressão vertical por titulação (nível I→II→III→IV→V) — Magistério Art.31 §5º
router.post('/vertical/titulacao',    authorize('progressao', 'create'), auditLog('progressao', 'vertical_titulacao'), ctrl.processarVerticalTitulacao);

// Enquadramento (inicial ou reenquadramento por lei)
router.post('/enquadramento',         authorize('progressao', 'create'), auditLog('progressao', 'enquadramento'), ctrl.processarEnquadramento);

// Aprovação/rejeição
router.put('/:id/aprovar',            authorize('progressao', 'update'), auditLog('progressao', 'aprovar'), ctrl.aprovar);
router.put('/:id/rejeitar',           authorize('progressao', 'update'), auditLog('progressao', 'rejeitar'), ctrl.rejeitar);

// Processamento em lote (todos os aptos de uma vez)
router.post('/processar-lote',        authorize('progressao', 'create'), auditLog('progressao', 'lote'), ctrl.processarLote);

module.exports = router;
