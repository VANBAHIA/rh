const { Router } = require('express');
const TransparenciaController = require('./transparencia.controller');

const router = Router();
const ctrl = new TransparenciaController();

// Rotas 100% públicas — sem JWT, para o Portal de Transparência
// Conforme Lei 12.527/2011 (LAI)
router.get('/remuneracao',        ctrl.remuneracao);
router.get('/remuneracao/export', ctrl.exportar);
router.get('/quadro-pessoal',     ctrl.quadroPessoal);

module.exports = router;
