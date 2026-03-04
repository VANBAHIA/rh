const rateLimit = require('express-rate-limit');
const config = require('../config');

// Rate limiter geral — todas as rotas autenticadas
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Muitas requisições. Tente novamente em alguns minutos.' },
  },
});

// Rate limiter restrito — rotas de autenticação (login, forgot-password)
const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_AUTH', message: 'Muitas tentativas de login. Aguarde 15 minutos.' },
  },
});

module.exports = { generalLimiter, authLimiter };
