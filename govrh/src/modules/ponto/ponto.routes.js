const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const { auditLog } = require('../../middlewares/auditLogger');
const PontoController = require('./ponto.controller');

const router = Router();
const ctrl = new PontoController();
router.use(authenticate);

// Escalas de trabalho
router.get('/escalas',                       authorize('ponto', 'read'),   ctrl.listarEscalas);
router.post('/escalas',                      authorize('ponto', 'create'), auditLog('escalas', 'create'), ctrl.criarEscala);
router.put('/escalas/:id',                   authorize('ponto', 'update'), ctrl.atualizarEscala);
router.post('/escalas/:id/vincular',         authorize('ponto', 'update'), ctrl.vincularServidorEscala);

// Registro de ponto
router.get('/espelho/:servidorId/:mes',      authorize('ponto', 'read'),   ctrl.espelho);
router.post('/lancamento',                   authorize('ponto', 'create'), auditLog('ponto', 'lancamento'), ctrl.lancar);
router.post('/importar',                     authorize('ponto', 'create'), ctrl.importar);
router.put('/:id/abono',                     authorize('ponto', 'update'), auditLog('ponto', 'abono'), ctrl.abonar);
router.put('/:id/ocorrencia',               authorize('ponto', 'update'), ctrl.registrarOcorrencia);

// Banco de horas
router.get('/banco-horas/:servidorId',       authorize('ponto', 'read'),   ctrl.bancohoras);
router.post('/banco-horas/:servidorId/compensar', authorize('ponto', 'update'), ctrl.compensar);

// Relatórios
router.get('/resumo-mensal/:mes',            authorize('ponto', 'read'),   ctrl.resumoMensal);
router.get('/pendencias',                    authorize('ponto', 'read'),   ctrl.pendencias);

module.exports = router;
