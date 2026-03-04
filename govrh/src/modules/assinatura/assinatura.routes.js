const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const { auditLog } = require('../../middlewares/auditLogger');
const AssinaturaController = require('./assinatura.controller');

const router = Router();
const ctrl = new AssinaturaController();
router.use(authenticate);

router.get('/pendentes',          authorize('assinatura', 'read'),   ctrl.pendentes);
router.get('/',                   authorize('assinatura', 'read'),   ctrl.listar);
router.post('/',                  authorize('assinatura', 'create'), auditLog('assinatura', 'create'), ctrl.criar);
router.get('/:id',                authorize('assinatura', 'read'),   ctrl.buscar);
router.post('/:id/assinar',       authorize('assinatura', 'update'), auditLog('assinatura', 'assinar'), ctrl.assinar);
router.post('/:id/recusar',       authorize('assinatura', 'update'), auditLog('assinatura', 'recusar'), ctrl.recusar);

module.exports = router;
