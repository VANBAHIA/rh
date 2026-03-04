const prisma = require('../config/prisma');
const logger = require('../config/logger');

/**
 * Middleware de auditoria.
 * Registra operações de escrita (POST, PUT, PATCH, DELETE) na tabela audit_logs.
 * Uso: router.post('/', auditLog('servidores', 'create'), controller.create)
 */
function auditLog(recurso, acao) {
  return async (req, res, next) => {
    // Guarda o json original do body para snapshot
    const dadosAntes = req.method !== 'POST' ? req.body : null;

    // Intercepta o res.json para capturar o resultado
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      if (res.statusCode < 400 && req.tenantId) {
        try {
          await prisma.auditLog.create({
            data: {
              tenantId: req.tenantId,
              usuarioId: req.userId || null,
              recurso,
              acao,
              registroId: body?.data?.id || req.params?.id || null,
              dadosAntes: dadosAntes ? JSON.parse(JSON.stringify(dadosAntes)) : null,
              dadosDepois: body?.data || null,
              ip: req.ip,
              userAgent: req.headers['user-agent'] || null,
            },
          });
        } catch (e) {
          logger.error('Falha ao registrar audit log:', e.message);
        }
      }
      return originalJson(body);
    };

    next();
  };
}

module.exports = { auditLog };
