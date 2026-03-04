const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const { auditLog } = require('../../middlewares/auditLogger');
const LicencasController = require('./licencas.controller');

const router = Router();
const ctrl = new LicencasController();
router.use(authenticate);

router.get('/',                    authorize('licencas', 'read'),   ctrl.listar);
router.get('/:servidorId',         authorize('licencas', 'read'),   ctrl.listarPorServidor);
router.post('/',                   authorize('licencas', 'create'), auditLog('licencas', 'create'), ctrl.criar);
router.get('/detalhe/:id',         authorize('licencas', 'read'),   ctrl.buscar);
router.put('/:id',                 authorize('licencas', 'update'), auditLog('licencas', 'update'), ctrl.atualizar);
router.put('/:id/aprovar',         authorize('licencas', 'update'), auditLog('licencas', 'aprovar'), ctrl.aprovar);
router.put('/:id/encerrar',        authorize('licencas', 'update'), auditLog('licencas', 'encerrar'), ctrl.encerrar);
router.put('/:id/prorrogar',       authorize('licencas', 'update'), auditLog('licencas', 'prorrogar'), ctrl.prorrogar);
router.get('/vencendo',            authorize('licencas', 'read'),   ctrl.vencendo);

module.exports = router;
