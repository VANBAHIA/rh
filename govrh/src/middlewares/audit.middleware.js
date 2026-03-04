// src/middlewares/audit.middleware.js
// Registra automaticamente operações sensíveis no AuditLog

const { prisma } = require('../config/prisma');
const logger = require('../config/logger');

// Métodos que geram auditoria
const AUDIT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Rotas que NÃO devem ser auditadas (leituras, health, etc.)
const EXCLUDE_PATHS = ['/health', '/api/v1/auth/refresh', '/api/v1/public'];

const auditLog = (recurso) => {
  return async (req, res, next) => {
    if (!AUDIT_METHODS.includes(req.method)) return next();
    if (EXCLUDE_PATHS.some((p) => req.path.startsWith(p))) return next();

    // Captura a resposta para logar o resultado
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      // Só audita operações bem-sucedidas (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        try {
          const methodToAcao = {
            POST: 'CREATE',
            PUT: 'UPDATE',
            PATCH: 'UPDATE',
            DELETE: 'DELETE',
          };

          await prisma.auditLog.create({
            data: {
              tenantId: req.tenantId,
              usuarioId: req.user.id,
              recurso,
              acao: methodToAcao[req.method] || req.method,
              registroId: req.params?.id || body?.data?.id || null,
              dadosAntes: req.dadosAntes || null, // Populado pelo service antes de alterar
              dadosDepois: body?.data || null,
              ip: req.ip,
              userAgent: req.headers['user-agent'],
            },
          });
        } catch (auditErr) {
          // Auditoria nunca deve quebrar a operação principal
          logger.error('Falha ao registrar audit log:', auditErr);
        }
      }
      return originalJson(body);
    };

    next();
  };
};

module.exports = { auditLog };
