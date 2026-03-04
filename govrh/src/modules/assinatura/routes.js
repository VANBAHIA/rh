// src/modules/assinatura/routes.js
// TODO: Implementar rotas do módulo ASSINATURA
const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

const router = Router();

// Rotas públicas (apenas transparencia)
router.use(authenticate);

// TODO: Adicionar rotas específicas do módulo

module.exports = router;
