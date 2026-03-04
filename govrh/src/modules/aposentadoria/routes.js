// src/modules/aposentadoria/routes.js
// TODO: Implementar rotas do módulo APOSENTADORIA
const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

const router = Router();

// Rotas públicas (apenas transparencia)
router.use(authenticate);

// TODO: Adicionar rotas específicas do módulo

module.exports = router;
