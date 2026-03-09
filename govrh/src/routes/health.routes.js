// src/routes/health.routes.js
// Rotas públicas de saúde da API — sem autenticação
const { Router } = require('express');

const router = Router();

/**
 * GET /api/v1/health
 * Verifica se a API está no ar.
 */
router.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

/**
 * GET /api/v1/health/time
 * Retorna o horário atual do SERVIDOR.
 *
 * Usado pelo terminal de ponto (BaterPontoPage) para sincronizar
 * o relógio exibido na tela com o relógio do servidor, eliminando
 * discrepâncias causadas por ajuste manual do relógio do dispositivo.
 *
 * Resposta: { serverTime: "2026-03-09T14:37:21.101Z" }
 */
router.get('/time', (_req, res) => {
  res.json({ serverTime: new Date().toISOString() });
});

module.exports = router;
