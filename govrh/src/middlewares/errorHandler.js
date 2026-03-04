const { AppError } = require('../shared/errors/AppError');
const logger = require('../config/logger');

/**
 * Middleware global de tratamento de erros.
 * Deve ser registrado APÓS todas as rotas no app.js
 */
function errorHandler(err, req, res, next) {
  // Erros operacionais esperados (AppError)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  // Erros do Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: { code: 'ALREADY_EXISTS', message: 'Registro duplicado.' },
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Registro não encontrado.' },
    });
  }

  // Erros inesperados — loga e retorna 500 genérico
  logger.error('Erro não tratado:', { message: err.message, stack: err.stack, url: req.url });

  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' },
  });
}

module.exports = errorHandler;
