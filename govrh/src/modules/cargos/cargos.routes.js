const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const { auditLog } = require('../../middlewares/auditLogger');
const CargosController = require('./cargos.controller');

const router = Router();
const ctrl = new CargosController();

router.use(authenticate);

// ── Grupos Ocupacionais ──────────────────────────────────────
router.get('/grupos',           authorize('cargos', 'read'),   ctrl.listarGrupos);
router.post('/grupos',          authorize('cargos', 'create'), auditLog('grupos_ocupacionais', 'create'), ctrl.criarGrupo);
router.put('/grupos/:id',       authorize('cargos', 'update'), auditLog('grupos_ocupacionais', 'update'), ctrl.atualizarGrupo);
router.delete('/grupos/:id',    authorize('cargos', 'delete'), ctrl.desativarGrupo);

// ── Cargos ───────────────────────────────────────────────────
router.get('/',                 authorize('cargos', 'read'),   ctrl.listarCargos);
router.post('/',                authorize('cargos', 'create'), auditLog('cargos', 'create'), ctrl.criarCargo);
router.get('/:id',              authorize('cargos', 'read'),   ctrl.buscarCargo);
router.put('/:id',              authorize('cargos', 'update'), auditLog('cargos', 'update'), ctrl.atualizarCargo);
router.delete('/:id',           authorize('cargos', 'delete'), ctrl.desativarCargo);

// ── Tabelas Salariais (PCCV) ─────────────────────────────────
router.get('/tabelas',          authorize('cargos', 'read'),   ctrl.listarTabelas);
router.post('/tabelas',         authorize('cargos', 'create'), auditLog('tabelas_salariais', 'create'), ctrl.criarTabela);
router.get('/tabelas/:id',      authorize('cargos', 'read'),   ctrl.buscarTabela);
router.put('/tabelas/:id',      authorize('cargos', 'update'), auditLog('tabelas_salariais', 'update'), ctrl.atualizarTabela);

// ── Níveis Salariais (células da matriz PCCV) ────────────────
router.get('/tabelas/:tabelaId/niveis',       authorize('cargos', 'read'),   ctrl.listarNiveis);
router.post('/tabelas/:tabelaId/niveis',      authorize('cargos', 'create'), auditLog('niveis_salariais', 'create'), ctrl.criarNivel);
router.put('/tabelas/:tabelaId/niveis/:id',   authorize('cargos', 'update'), auditLog('niveis_salariais', 'update'), ctrl.atualizarNivel);
router.delete('/tabelas/:tabelaId/niveis/:id',authorize('cargos', 'delete'), ctrl.removerNivel);

// ── Lotações ─────────────────────────────────────────────────
router.get('/lotacoes',         authorize('cargos', 'read'),   ctrl.listarLotacoes);
router.post('/lotacoes',        authorize('cargos', 'create'), auditLog('lotacoes', 'create'), ctrl.criarLotacao);
router.put('/lotacoes/:id',     authorize('cargos', 'update'), auditLog('lotacoes', 'update'), ctrl.atualizarLotacao);
router.delete('/lotacoes/:id',  authorize('cargos', 'delete'), ctrl.desativarLotacao);

// ── Consultas especiais ──────────────────────────────────────
router.get('/tabelas/:tabelaId/matriz',  authorize('cargos', 'read'), ctrl.matrizSalarial);
router.get('/:id/servidores',            authorize('cargos', 'read'), ctrl.servidoresDoCargo);

module.exports = router;
