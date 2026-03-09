const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const { auditLog } = require('../../middlewares/auditLogger');
const FolhaController = require('./folha.controller');

const router = Router();
const ctrl = new FolhaController();

router.use(authenticate);

// Verbas (rubricas)
router.get('/verbas',                         authorize('folha', 'read'),   ctrl.listarVerbas);
router.post('/verbas',                        authorize('folha', 'create'), auditLog('verbas', 'create'), ctrl.criarVerba);
router.put('/verbas/:id',                     authorize('folha', 'update'), auditLog('verbas', 'update'), ctrl.atualizarVerba);
router.delete('/verbas/:id',                  authorize('folha', 'delete'), auditLog('verbas', 'delete'), ctrl.desativarVerba);

// Configuração
router.get('/config',                         authorize('folha', 'read'),   ctrl.getConfig);
router.put('/config',                         authorize('folha', 'update'), auditLog('folha_config', 'update'), ctrl.salvarConfig);

// Consignados
router.get('/consignados/:servidorId',        authorize('folha', 'read'),   ctrl.listarConsignados);
router.post('/consignados',                   authorize('folha', 'create'), auditLog('consignados', 'create'), ctrl.criarConsignado);
router.put('/consignados/:id',                authorize('folha', 'update'), ctrl.atualizarConsignado);
router.delete('/consignados/:id',             authorize('folha', 'delete'), ctrl.cancelarConsignado);

// Folha — listagem e processamento
router.get('/',                               authorize('folha', 'read'),   ctrl.listarFolhas);
router.post('/processar',                     authorize('folha', 'create'), auditLog('folha', 'processar'), ctrl.processar);

// Excluir folha inteira
router.delete('/:competencia/:tipo',          authorize('folha', 'delete'), auditLog('folha', 'delete'), ctrl.excluir);

// Itens por ID da folha — ANTES de /:competencia/:tipo (ordem crítica no Express)
router.get('/id/:folhaId/itens',              authorize('folha', 'read'),   ctrl.listarItensPorId);

// Holerite individual
router.get('/holerite/:servidorId/:competencia', authorize('folha', 'read'), ctrl.holerite);

// Reprocessar servidor específico dentro da folha
router.post('/:competencia/:tipo/servidor/:servidorId/reprocessar',
         authorize('folha', 'update'), auditLog('folha', 'processar'), ctrl.reprocessarServidor);

// Folha por competencia+tipo
router.get('/:competencia/:tipo',             authorize('folha', 'read'),   ctrl.buscarFolha);
router.get('/:competencia/:tipo/itens',       authorize('folha', 'read'),   ctrl.listarItens);
router.get('/:competencia/:tipo/analitico',   authorize('folha', 'read'),   ctrl.relatorioAnalitico);
router.get('/:competencia/:tipo/sintetico',   authorize('folha', 'read'),   ctrl.relatorioSintetico);
router.post('/:competencia/:tipo/fechar',     authorize('folha', 'update'), auditLog('folha', 'fechar'), ctrl.fechar);
router.post('/:competencia/:tipo/reabrir',    authorize('folha', 'update'), auditLog('folha', 'reabrir'), ctrl.reabrir);

// excluir folha (não permitido se fechada)
router.delete('/:competencia/:tipo',               authorize('folha', 'delete'), auditLog('folha', 'delete'), ctrl.excluir);

module.exports = router;
