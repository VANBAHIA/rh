// src/middlewares/error.middleware.js
// Handler global de erros — captura todos os erros da aplicação

const logger = require('../config/logger');
const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
  // Log completo do erro
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    tenantId: req.tenantId,
    userId: req.user?.id,
    ip: req.ip,
  });

  // Erros operacionais conhecidos (AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
  }

  // Erro de validação do Prisma (registro duplicado)
  if (err.code === 'P2002') {
    const fields = err.meta?.target?.join(', ') || 'campo';
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: `Já existe um registro com o mesmo valor para: ${fields}.`,
      },
    });
  }

  // Registro não encontrado no Prisma
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Registro não encontrado.',
      },
    });
  }

  // Violação de FK no Prisma
  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'FOREIGN_KEY_VIOLATION',
        message: 'Operação inválida: registro referenciado não existe.',
      },
    });
  }

  // Erro de validação Zod
  if (err.name === 'ZodError') {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados de entrada inválidos.',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // Erro genérico — não expõe detalhes em produção
  const isProd = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd
        ? 'Ocorreu um erro interno. Tente novamente ou contate o suporte.'
        : err.message,
      ...(isProd ? {} : { stack: err.stack }),
    },
  });
};

// 404 — rota não encontrada
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    },
  });
};

module.exports = { errorHandler, notFound };
