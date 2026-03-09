const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const { auditLog } = require('../../middlewares/auditLogger');
const TenantsController = require('./tenants.controller');

const router = Router();
const ctrl = new TenantsController();
router.use(authenticate);

/**
 * REGRA DE OURO: fixas → compostas → dinâmicas (/:param) por último
 * Apenas SUPER_ADMIN acessa estas rotas (validado no controller)
 */

// ── Rotas fixas ───────────────────────────────────────────────
router.get('/',             ctrl.listar);
router.post('/',            auditLog('tenants', 'create'), ctrl.criar);

// ── Roles e Permissões (fixas — ANTES de /:id) ───────────────
router.get('/roles',        ctrl.listarRoles);
router.post('/roles',       auditLog('roles', 'create'), ctrl.criarRole);
router.post('/permissions', auditLog('permissions', 'create'), ctrl.criarPermission);

// ── Rotas dinâmicas (/:id) por último ────────────────────────
router.get('/:id',                           ctrl.buscar);
router.put('/:id',                           auditLog('tenants', 'update'), ctrl.atualizar);
router.patch('/:id/status',                  auditLog('tenants', 'status'), ctrl.alterarStatus);
router.get('/:id/usuarios',                  ctrl.usuarios);
router.post('/:id/usuarios',                 auditLog('usuarios', 'create'), ctrl.criarUsuario);
router.put('/:id/usuarios/:uid',             auditLog('usuarios', 'update'), ctrl.atualizarUsuario);
router.patch('/:id/usuarios/:uid/roles',     auditLog('usuarios', 'roles'), ctrl.atribuirRoles);

module.exports = router;
