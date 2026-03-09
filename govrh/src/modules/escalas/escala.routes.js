// src/modules/escalas/escala.routes.js
const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const { auditLog }  = require('../../middlewares/auditLogger');
const { validate }  = require('../../middlewares/validate.middleware');
const {
  criarEscalaSchema,
  atualizarEscalaSchema,
  atribuirEscalaSchema,
  filtroEscalaSchema,
} = require('./escala.schemas');
const EscalaController = require('./escala.controller');

const router = Router();
const ctrl   = new EscalaController();

router.use(authenticate);

/**
 * REGRA: rotas fixas antes das dinâmicas (/:param)
 */

// ── Catálogo de escalas (/escalas) ───────────────────────────────
router.get('/',
  authorize('escalas', 'read'),
  validate(filtroEscalaSchema),
  ctrl.listar
);

router.post('/',
  authorize('escalas', 'create'),
  validate(criarEscalaSchema),
  auditLog('escalas', 'create'),
  ctrl.criar
);

// ── Relatório: servidores sem escala ─────────────────────────────
router.get('/alertas/sem-escala',
  authorize('escalas', 'read'),
  ctrl.alertaSemEscala
);

// ── Rotas dinâmicas /:id ──────────────────────────────────────────
router.get('/:id',
  authorize('escalas', 'read'),
  ctrl.buscarPorId
);

router.put('/:id',
  authorize('escalas', 'update'),
  validate(atualizarEscalaSchema),
  auditLog('escalas', 'update'),
  ctrl.atualizar
);

router.delete('/:id',
  authorize('escalas', 'delete'),
  auditLog('escalas', 'desativar'),
  ctrl.desativar
);

// ── Servidores da escala /:id/servidores ──────────────────────────
router.get('/:id/servidores',
  authorize('escalas', 'read'),
  ctrl.servidoresDaEscala
);

module.exports = router;


// =================================================================
// ROTAS MONTADAS NO MÓDULO DE SERVIDORES
// Adicione estas linhas em: src/modules/servidores/servidores.routes.js
// =================================================================
//
//  const escalaCtrl = require('../escalas/escala.controller');
//  const { atribuirEscalaSchema } = require('../escalas/escala.schemas');
//  const escalas = new escalaCtrl();
//
//  // Escala do servidor
//  router.get ('/:id/escala',
//    authorize('servidores', 'read'),
//    escalas.buscarEscalaAtiva
//  );
//
//  router.get ('/:id/escala/historico',
//    authorize('servidores', 'read'),
//    escalas.historicoEscalas
//  );
//
//  router.post('/:id/escala',
//    authorize('servidores', 'update'),
//    validate(atribuirEscalaSchema),
//    auditLog('servidores', 'escala_atribuir'),
//    escalas.atribuirEscala
//  );
