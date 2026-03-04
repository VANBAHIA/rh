const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const { auditLog } = require('../../middlewares/auditLogger');
const DisciplinarController = require('./disciplinar.controller');

const router = Router();
const ctrl = new DisciplinarController();
router.use(authenticate);

router.get('/',                      authorize('disciplinar', 'read'),   ctrl.listar);
router.post('/',                     authorize('disciplinar', 'create'), auditLog('disciplinar', 'create'), ctrl.criar);
router.get('/:id',                   authorize('disciplinar', 'read'),   ctrl.buscar);
router.put('/:id',                   authorize('disciplinar', 'update'), auditLog('disciplinar', 'update'), ctrl.atualizar);
router.post('/:id/documentos',       authorize('disciplinar', 'create'), auditLog('disciplinar', 'doc'), ctrl.addDocumento);
router.delete('/:id/documentos/:docId', authorize('disciplinar', 'delete'), ctrl.removerDocumento);
router.put('/:id/penalidade',        authorize('disciplinar', 'update'), auditLog('disciplinar', 'penalidade'), ctrl.aplicarPenalidade);
router.put('/:id/arquivar',          authorize('disciplinar', 'update'), auditLog('disciplinar', 'arquivar'), ctrl.arquivar);
router.put('/:id/encerrar',          authorize('disciplinar', 'update'), auditLog('disciplinar', 'encerrar'), ctrl.encerrar);

module.exports = router;
