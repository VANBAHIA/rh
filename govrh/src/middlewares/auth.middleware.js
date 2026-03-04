// src/middlewares/auth.middleware.js
// Valida o JWT, extrai tenantId e injeta o Prisma client com tenant scope

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { getPrismaForTenant, prisma } = require('../config/prisma');
const AppError = require('../utils/AppError');

// =============================================================
// MIDDLEWARE PRINCIPAL: autentica e injeta contexto de tenant
// =============================================================
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token de autenticação não fornecido.', 401);
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwt.accessSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Token expirado. Faça login novamente.', 401);
      }
      throw new AppError('Token inválido.', 401);
    }

    const { userId, tenantId, roles } = decoded;

    // Verifica se o usuário ainda existe e está ativo
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, ativo: true, tenantId: true, bloqueadoAte: true },
    });

    if (!usuario || !usuario.ativo) {
      throw new AppError('Usuário inativo ou não encontrado.', 401);
    }

    if (usuario.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
      throw new AppError('Conta temporariamente bloqueada. Tente novamente mais tarde.', 403);
    }

    // Garante que o tenantId do token bate com o do usuário no banco (anti-tamper)
    if (usuario.tenantId !== tenantId) {
      throw new AppError('Token inválido: tenant inconsistente.', 401);
    }

    // Injeta no request:
    // - req.user: dados do usuário autenticado
    // - req.tenantId: tenant do contexto
    // - req.db: Prisma client com tenant scope automático
    req.user = { id: userId, tenantId, roles };
    req.tenantId = tenantId;
    req.db = getPrismaForTenant(tenantId);

    next();
  } catch (err) {
    next(err);
  }
};

// =============================================================
// MIDDLEWARE: verifica se usuário tem determinado(s) role(s)
// Uso: router.get('/rota', authenticate, authorize('ADMIN_ORGAO', 'GESTOR_RH'), controller)
// =============================================================
const authorize = (...rolesPermitidas) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const temPermissao = rolesPermitidas.some((role) => userRoles.includes(role));

    if (!temPermissao) {
      return next(
        new AppError(
          `Acesso negado. Perfis necessários: ${rolesPermitidas.join(', ')}.`,
          403
        )
      );
    }
    next();
  };
};

// =============================================================
// MIDDLEWARE: Super Admin (acesso global a todos os tenants)
// =============================================================
const isSuperAdmin = (req, res, next) => {
  if (!req.user?.roles?.includes('SUPER_ADMIN')) {
    return next(new AppError('Acesso restrito a administradores do sistema.', 403));
  }
  next();
};

// =============================================================
// MIDDLEWARE: Verifica se o servidor sendo acessado pertence
// ao tenant do usuário autenticado (proteção de recursos)
// =============================================================
const validateTenantResource = (paramName = 'id', model = 'servidor') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      if (!resourceId) return next();

      const resource = await req.db[model].findUnique({
        where: { id: resourceId },
        select: { id: true },
      });

      if (!resource) {
        throw new AppError('Recurso não encontrado.', 404);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { authenticate, authorize, isSuperAdmin, validateTenantResource };
