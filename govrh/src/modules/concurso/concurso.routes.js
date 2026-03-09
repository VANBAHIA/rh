const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const { auditLog } = require('../../middlewares/auditLogger');
const ConcursoController = require('./concurso.controller');

const router = Router();
const ctrl = new ConcursoController();
router.use(authenticate);

/**
 * REGRA DE OURO: fixas → compostas → dinâmicas (/:param) por último
 */

// ── Rotas fixas ───────────────────────────────────────────────
router.get('/',    authorize('concursos', 'read'),   ctrl.listar);
router.post('/',   authorize('concursos', 'create'), auditLog('concursos', 'create'), ctrl.criar);

// ── Estágio Probatório (fixas compostas — ANTES de /:id) ──────
router.get('/estagio/em-andamento',                authorize('concursos', 'read'),   ctrl.estagiosEmAndamento);
router.post('/estagio/:servidorId/avaliacao',      authorize('concursos', 'create'), auditLog('estagio', 'avaliacao'), ctrl.registrarAvaliacao);
router.put('/estagio/:servidorId/concluir',        authorize('concursos', 'update'), auditLog('estagio', 'concluir'), ctrl.concluirEstagio);

// ── Rotas dinâmicas (/:id) por último ────────────────────────
router.get('/:id',                     authorize('concursos', 'read'),   ctrl.buscar);
router.put('/:id',                     authorize('concursos', 'update'), auditLog('concursos', 'update'), ctrl.atualizar);
router.get('/:id/candidatos',          authorize('concursos', 'read'),   ctrl.candidatos);
router.post('/:id/candidatos',         authorize('concursos', 'create'), auditLog('candidatos', 'create'), ctrl.importarCandidatos);
router.get('/:id/candidatos/:candId',  authorize('concursos', 'read'),   ctrl.buscarCandidato);
router.post('/:id/convocacao',         authorize('concursos', 'update'), auditLog('concursos', 'convocacao'), ctrl.convocar);
router.post('/:id/posse',              authorize('concursos', 'create'), auditLog('servidores', 'posse'), ctrl.registrarPosse);

module.exports = router;
