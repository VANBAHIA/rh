// src/utils/AppError.js
// Classe de erro operacional — erros esperados e tratáveis

class AppError extends Error {
  constructor(message, statusCode = 400, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || AppError.statusToCode(statusCode);
    this.details = details;
    this.isOperational = true; // Marca como erro esperado (não bug)
    Error.captureStackTrace(this, this.constructor);
  }

  static statusToCode(status) {
    const map = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
    };
    return map[status] || 'ERROR';
  }
}

module.exports = AppError;
