const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const { auditLog } = require('../../middlewares/auditLogger');
const { validate } = require('../../middlewares/validate.middleware');
const {
  criarServidorSchema,
  atualizarServidorSchema,
  desativarServidorSchema,
  criarVinculoSchema,
  atualizarVinculoSchema,
} = require('./servidores.schemas');
const ServidorController = require('./servidores.controller');
const EscalaController       = require('../escalas/escala.controller');
const { atribuirEscalaSchema } = require('../escalas/escala.schemas');

const router = Router();
const ctrl      = new ServidorController();
const escalaCtrl = new EscalaController();

router.use(authenticate);

/**
 * REGRA DE OURO: fixas → compostas fixas → dinâmicas (/:param) por último
 */

// ── Rotas fixas ───────────────────────────────────────────────
router.get('/',          authorize('servidores', 'read'),   ctrl.listar);
router.post('/',         authorize('servidores', 'create'), validate(criarServidorSchema), auditLog('servidores', 'create'), ctrl.criar);
router.get('/exportar',  authorize('servidores', 'read'),   ctrl.exportar);

// ── Rotas dinâmicas /:id ──────────────────────────────────────
router.get('/:id',       authorize('servidores', 'read'),   ctrl.buscarPorId);
router.put('/:id',       authorize('servidores', 'update'), validate(atualizarServidorSchema), auditLog('servidores', 'update'), ctrl.atualizar);
router.delete('/:id',    authorize('servidores', 'delete'), validate(desativarServidorSchema), auditLog('servidores', 'delete'), ctrl.desativar);
router.delete('/:id/excluir', authorize('servidores', 'delete'), auditLog('servidores', 'excluir'), ctrl.excluir);

// ── Vínculos funcionais ───────────────────────────────────────
router.get('/:id/historico',        authorize('servidores', 'read'),   ctrl.historico);
router.post('/:id/vinculos',        authorize('servidores', 'update'), validate(criarVinculoSchema), auditLog('servidores', 'vinculo_create'), ctrl.criarVinculo);
router.patch('/:id/vinculos/atual', authorize('servidores', 'update'), validate(atualizarVinculoSchema), auditLog('servidores', 'vinculo_update'), ctrl.atualizarVinculo);
router.patch('/:id/vinculos/:vinculoId/corrigir', authorize('servidores', 'update'), auditLog('servidores', 'vinculo_corrigir'), ctrl.corrigirVinculo);

// ── Contatos ─────────────────────────────────────────────────
router.get('/:id/contatos',                     authorize('servidores', 'read'),   ctrl.listarContatos);
router.post('/:id/contatos',                    authorize('servidores', 'update'), auditLog('servidores', 'contato_create'), ctrl.criarContato);
router.put('/:id/contatos/:contatoId',          authorize('servidores', 'update'), auditLog('servidores', 'contato_update'), ctrl.atualizarContato);
router.delete('/:id/contatos/:contatoId',       authorize('servidores', 'update'), ctrl.removerContato);

// ── Endereços ────────────────────────────────────────────────
router.get('/:id/enderecos',                    authorize('servidores', 'read'),   ctrl.listarEnderecos);
router.post('/:id/enderecos',                   authorize('servidores', 'update'), auditLog('servidores', 'endereco_create'), ctrl.criarEndereco);
router.put('/:id/enderecos/:enderecoId',        authorize('servidores', 'update'), auditLog('servidores', 'endereco_update'), ctrl.atualizarEndereco);
router.delete('/:id/enderecos/:enderecoId',     authorize('servidores', 'update'), ctrl.removerEndereco);

// ── Documentos ───────────────────────────────────────────────
router.get('/:id/documentos',  authorize('servidores', 'read'),   ctrl.documentos);
router.post('/:id/documentos', authorize('servidores', 'update'), auditLog('servidores', 'doc_upload'), ctrl.uploadDocumento);

// ── Outros sub-recursos ───────────────────────────────────────
router.get('/:id/progressoes', authorize('progressao',  'read'), ctrl.progressoes);
router.get('/:id/extrato',     authorize('servidores',  'read'), ctrl.extrato);

// ── Biometria facial ──────────────────────────────────────────
const multer = require('multer');
const upload = multer();
router.post('/:id/biometria-facial',
  authorize('servidores', 'update'),
  auditLog('servidores', 'biometria_create'),
  upload.single('biometria'),
  ctrl.registrarBiometriaFacial
);

// ── Escala do servidor ───────────────────────────────────────
router.get('/:id/escala',
  authorize('servidores', 'read'),
  escalaCtrl.buscarEscalaAtiva
);
router.get('/:id/escala/historico',
  authorize('servidores', 'read'),
  escalaCtrl.historicoEscalas
);
router.post('/:id/escala',
  authorize('servidores', 'update'),
  validate(atribuirEscalaSchema),
  auditLog('servidores', 'escala_atribuir'),
  escalaCtrl.atribuirEscala
);

module.exports = router;
