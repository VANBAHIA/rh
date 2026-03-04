const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const { auditLog } = require('../../middlewares/auditLogger');
const FeriasController = require('./ferias.controller');

const router = Router();
const ctrl = new FeriasController();
router.use(authenticate);

// Períodos aquisitivos
router.get('/periodos/:servidorId',        authorize('ferias', 'read'),   ctrl.periodos);
router.post('/periodos',                   authorize('ferias', 'create'), auditLog('periodos_aquisitivos', 'create'), ctrl.criarPeriodo);

// Gozo de férias
router.post('/agendar',                    authorize('ferias', 'create'), auditLog('ferias', 'agendar'), ctrl.agendar);
router.get('/:id',                         authorize('ferias', 'read'),   ctrl.buscar);
router.put('/:id/aprovar',                 authorize('ferias', 'update'), auditLog('ferias', 'aprovar'), ctrl.aprovar);
router.put('/:id/cancelar',               authorize('ferias', 'update'), auditLog('ferias', 'cancelar'), ctrl.cancelar);

// Alertas e relatórios
router.get('/vencendo',                    authorize('ferias', 'read'),   ctrl.vencendo);
router.get('/programacao/:mes',            authorize('ferias', 'read'),   ctrl.programacao);

module.exports = router;
