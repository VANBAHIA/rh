const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const { auditLog } = require('../../middlewares/auditLogger');
const TenantsController = require('./tenants.controller');

const router = Router();
const ctrl = new TenantsController();
router.use(authenticate);

// Apenas SUPER_ADMIN acessa estas rotas
router.get('/',           ctrl.listar);
router.post('/',          auditLog('tenants', 'create'), ctrl.criar);
router.get('/:id',        ctrl.buscar);
router.put('/:id',        auditLog('tenants', 'update'), ctrl.atualizar);
router.patch('/:id/status', auditLog('tenants', 'status'), ctrl.alterarStatus);

// Usuários do tenant
router.get('/:id/usuarios',   ctrl.usuarios);
router.post('/:id/usuarios',  auditLog('usuarios', 'create'), ctrl.criarUsuario);
router.put('/:id/usuarios/:uid', auditLog('usuarios', 'update'), ctrl.atualizarUsuario);
router.patch('/:id/usuarios/:uid/roles', auditLog('usuarios', 'roles'), ctrl.atribuirRoles);

// Roles e Permissões
router.get('/roles',          ctrl.listarRoles);
router.post('/roles',         auditLog('roles', 'create'), ctrl.criarRole);
router.post('/permissions',   auditLog('permissions', 'create'), ctrl.criarPermission);

module.exports = router;
