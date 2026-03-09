const { Router } = require('express');
const { authenticate } = require('../../middlewares/authenticate');
const NotificacoesController = require('./notificacoes.controller');

const router = Router();
const ctrl = new NotificacoesController();
router.use(authenticate);

/**
 * REGRA DE OURO: fixas → compostas → dinâmicas (/:param) por último
 */

// ── Rotas fixas ───────────────────────────────────────────────
router.get('/',                        ctrl.listar);
router.get('/nao-lidas',               ctrl.naoLidas);
router.put('/marcar-todas-lidas',      ctrl.marcarTodasLidas);

// ── Rotas dinâmicas (/:id) por último ────────────────────────
router.put('/:id/lida',                ctrl.marcarLida);
router.delete('/:id',                  ctrl.remover);

module.exports = router;
