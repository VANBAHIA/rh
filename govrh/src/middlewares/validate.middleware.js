// src/middlewares/validate.middleware.js
// Valida body, query e params usando schemas Zod

const AppError = require('../utils/AppError');

const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Valida e aplica coerção/defaults do Zod
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Substitui os dados do request pelos dados validados/sanitizados
      req.body = parsed.body || req.body;
      req.query = parsed.query || req.query;
      req.params = parsed.params || req.params;

      next();
    } catch (err) {
      // Repassa ao errorHandler global (trata ZodError)
      next(err);
    }
  };
};

module.exports = { validate };
