const { Router } = require('express');
const { authenticate } = require('../../middlewares/authenticate');
const NotificacoesController = require('./notificacoes.controller');

const router = Router();
const ctrl = new NotificacoesController();
router.use(authenticate);

router.get('/',                         ctrl.listar);
router.get('/nao-lidas',                ctrl.naoLidas);
router.put('/:id/lida',                 ctrl.marcarLida);
router.put('/marcar-todas-lidas',       ctrl.marcarTodasLidas);
router.delete('/:id',                   ctrl.remover);

module.exports = router;
