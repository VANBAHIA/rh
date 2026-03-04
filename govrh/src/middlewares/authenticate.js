const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/prisma');
const { Errors } = require('../shared/errors/AppError');

/**
 * Middleware de autenticação JWT.
 * Extrai e valida o token, carrega tenant + usuário no req.
 * Injeta req.tenantId, req.userId, req.userRoles para uso nos controllers.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw Errors.UNAUTHORIZED();
    }

    const token = authHeader.split(' ')[1];
    let payload;

    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch (e) {
      throw e.name === 'TokenExpiredError' ? Errors.TOKEN_EXPIRED() : Errors.TOKEN_INVALID();
    }

    const { userId, tenantId } = payload;

    // Valida usuário e tenant na base
    const usuario = await prisma.usuario.findFirst({
      where: { id: userId, tenantId, ativo: true },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });

    if (!usuario) throw Errors.UNAUTHORIZED();

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw Errors.TENANT_NOT_FOUND();
    if (!tenant.ativo) throw Errors.TENANT_INACTIVE();

    // Monta lista plana de permissões: ["servidores:read", "folha:create", ...]
    const permissions = new Set();
    usuario.roles.forEach(ur =>
      ur.role.permissions.forEach(rp =>
        permissions.add(`${rp.permission.recurso}:${rp.permission.acao}`)
      )
    );

    req.userId = userId;
    req.tenantId = tenantId;
    req.userRoles = usuario.roles.map(ur => ur.role.nome);
    req.userPermissions = permissions;
    req.isSuperAdmin = req.userRoles.includes('SUPER_ADMIN');

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Factory de middleware de autorização por permissão.
 * Uso: authorize('servidores', 'create')
 */
function authorize(recurso, acao) {
  return (req, res, next) => {
    if (req.isSuperAdmin) return next(); // Super admin bypassa tudo

    const permissao = `${recurso}:${acao}`;
    if (!req.userPermissions.has(permissao)) {
      return next(Errors.FORBIDDEN());
    }
    next();
  };
}

module.exports = { authenticate, authorize };
