const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const { auditLog } = require('../../middlewares/auditLogger');
const AposentadoriaController = require('./aposentadoria.controller');

const router = Router();
const ctrl = new AposentadoriaController();
router.use(authenticate);

router.get('/simulador/:servidorId',    authorize('aposentadoria', 'read'),   ctrl.simular);
router.get('/',                         authorize('aposentadoria', 'read'),   ctrl.listar);
router.post('/pedido',                  authorize('aposentadoria', 'create'), auditLog('aposentadoria', 'pedido'), ctrl.pedido);
router.get('/:id',                      authorize('aposentadoria', 'read'),   ctrl.buscar);
router.put('/:id/conceder',             authorize('aposentadoria', 'update'), auditLog('aposentadoria', 'conceder'), ctrl.conceder);
router.put('/:id/indeferir',            authorize('aposentadoria', 'update'), auditLog('aposentadoria', 'indeferir'), ctrl.indeferir);

// Pensão por morte
router.get('/pensionistas',             authorize('aposentadoria', 'read'),   ctrl.pensionistas);
router.post('/pensao',                  authorize('aposentadoria', 'create'), auditLog('pensao', 'create'), ctrl.criarPensao);
router.put('/pensao/:id/cessar',        authorize('aposentadoria', 'update'), auditLog('pensao', 'cessar'), ctrl.cessarPensao);

module.exports = router;
