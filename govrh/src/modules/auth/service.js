// src/modules/auth/service.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const { prisma } = require('../../config/prisma');
const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const logger = require('../../config/logger');

// =============================================================
// LOGIN
// =============================================================
const login = async ({ email, senha, mfaCode }) => {
  // Busca usuário pelo email (independente de tenant no login)
  const usuario = await prisma.usuario.findFirst({
    where: { email, ativo: true },
    include: {
      roles: { include: { role: true } },
      tenant: { select: { id: true, ativo: true, razaoSocial: true } },
    },
  });

  if (!usuario) {
    throw new AppError('Credenciais inválidas.', 401);
  }

  if (!usuario.tenant.ativo) {
    throw new AppError('Órgão inativo. Contate o administrador do sistema.', 403);
  }

  // Verifica bloqueio de conta
  if (usuario.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
    const minutos = Math.ceil((usuario.bloqueadoAte - new Date()) / 60000);
    throw new AppError(`Conta bloqueada. Tente novamente em ${minutos} minutos.`, 403);
  }

  // Verifica senha
  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);

  if (!senhaValida) {
    const tentativas = usuario.tentativasLogin + 1;
    const bloqueio = tentativas >= env.security.maxLoginAttempts
      ? new Date(Date.now() + env.security.lockoutDurationMinutes * 60000)
      : null;

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { tentativasLogin: tentativas, ...(bloqueio && { bloqueadoAte: bloqueio }) },
    });

    if (bloqueio) {
      throw new AppError(`Conta bloqueada por ${env.security.lockoutDurationMinutes} minutos após múltiplas tentativas.`, 403);
    }

    throw new AppError('Credenciais inválidas.', 401);
  }

  // Verifica MFA se habilitado
  if (usuario.mfaAtivado) {
    if (!mfaCode) {
      throw new AppError('Código MFA obrigatório.', 401, 'MFA_REQUIRED');
    }
    const mfaValido = authenticator.verify({ token: mfaCode, secret: usuario.mfaSecret });
    if (!mfaValido) {
      throw new AppError('Código MFA inválido ou expirado.', 401);
    }
  }

  // Gera tokens
  const roles = usuario.roles.map((ur) => ur.role.nome);
  const tokens = gerarTokens(usuario.id, usuario.tenantId, roles);

  // Persiste refresh token e reseta tentativas
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      tentativasLogin: 0,
      bloqueadoAte: null,
      refreshToken: tokens.refreshToken,
      ultimoLogin: new Date(),
    },
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: env.jwt.accessExpiresIn,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      roles,
      mfaAtivado: usuario.mfaAtivado,
      tenant: {
        id: usuario.tenant.id,
        razaoSocial: usuario.tenant.razaoSocial,
      },
    },
  };
};

// =============================================================
// REFRESH TOKEN
// =============================================================
const refresh = async (refreshToken) => {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch {
    throw new AppError('Refresh token inválido ou expirado.', 401);
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: decoded.userId },
    include: { roles: { include: { role: true } } },
  });

  if (!usuario || !usuario.ativo || usuario.refreshToken !== refreshToken) {
    throw new AppError('Refresh token inválido.', 401);
  }

  const roles = usuario.roles.map((ur) => ur.role.nome);
  const tokens = gerarTokens(usuario.id, usuario.tenantId, roles);

  // Rotation: invalida o refresh token antigo, emite novo
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { refreshToken: tokens.refreshToken },
  });

  return tokens;
};

// =============================================================
// LOGOUT
// =============================================================
const logout = async (userId) => {
  await prisma.usuario.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
};

// =============================================================
// ME (dados do usuário autenticado)
// =============================================================
const me = async (userId) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nome: true,
      email: true,
      mfaAtivado: true,
      ultimoLogin: true,
      roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      tenant: { select: { id: true, razaoSocial: true, nomeFantasia: true, tipoOrgao: true, logoUrl: true } },
      servidor: { select: { id: true, matricula: true, nome: true, fotoUrl: true } },
    },
  });

  if (!usuario) throw new AppError('Usuário não encontrado.', 404);

  const roles = usuario.roles.map((ur) => ur.role.nome);
  const permissions = [
    ...new Set(
      usuario.roles.flatMap((ur) =>
        ur.role.permissions.map((rp) => `${rp.permission.recurso}:${rp.permission.acao}`)
      )
    ),
  ];

  return { ...usuario, roles, permissions };
};

// =============================================================
// MFA SETUP
// =============================================================
const mfaSetup = async (userId) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
  if (usuario.mfaAtivado) {
    throw new AppError('MFA já está ativo para este usuário.', 409);
  }

  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(usuario.email, 'GovHRPub', secret);
  const qrCodeUrl = await QRCode.toDataURL(otpauth);

  // Salva o secret temporariamente (antes da confirmação)
  await prisma.usuario.update({
    where: { id: userId },
    data: { mfaSecret: secret },
  });

  return { secret, qrCodeUrl };
};

// =============================================================
// MFA VERIFY (confirma e ativa MFA)
// =============================================================
const mfaVerify = async (userId, code) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!usuario.mfaSecret) throw new AppError('Configure o MFA primeiro.', 400);
  if (usuario.mfaAtivado) throw new AppError('MFA já está ativo.', 409);

  const valido = authenticator.verify({ token: code, secret: usuario.mfaSecret });
  if (!valido) throw new AppError('Código MFA inválido.', 400);

  await prisma.usuario.update({
    where: { id: userId },
    data: { mfaAtivado: true },
  });

  return { message: 'MFA ativado com sucesso.' };
};

// =============================================================
// MFA DISABLE
// =============================================================
const mfaDisable = async (userId) => {
  await prisma.usuario.update({
    where: { id: userId },
    data: { mfaAtivado: false, mfaSecret: null },
  });
  return { message: 'MFA desativado com sucesso.' };
};

// =============================================================
// CHANGE PASSWORD
// =============================================================
const changePassword = async (userId, { senhaAtual, novaSenha }) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
  const valida = await bcrypt.compare(senhaAtual, usuario.senhaHash);
  if (!valida) throw new AppError('Senha atual incorreta.', 400);

  const hash = await bcrypt.hash(novaSenha, env.security.bcryptRounds);
  await prisma.usuario.update({
    where: { id: userId },
    data: { senhaHash: hash, refreshToken: null }, // Invalida sessões ativas
  });

  return { message: 'Senha alterada com sucesso. Faça login novamente.' };
};

// =============================================================
// FORGOT PASSWORD
// =============================================================
const forgotPassword = async ({ email, tenantCnpj }) => {
  // Não revela se o e-mail existe ou não (segurança)
  const tenant = await prisma.tenant.findUnique({ where: { cnpj: tenantCnpj } });
  if (!tenant) return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções.' };

  const usuario = await prisma.usuario.findFirst({
    where: { email, tenantId: tenant.id, ativo: true },
  });

  if (usuario) {
    const resetToken = uuidv4();
    const expiracao = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Armazena token hasheado (não em plaintext)
    const tokenHash = await bcrypt.hash(resetToken, 8);
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { refreshToken: `reset:${tokenHash}:${expiracao.getTime()}` },
    });

    // TODO: Enviar e-mail com o token (implementar EmailService)
    logger.info(`Reset token para ${email}: ${resetToken}`);
  }

  return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções.' };
};

// =============================================================
// HELPER: Gera access + refresh tokens
// =============================================================
const gerarTokens = (userId, tenantId, roles) => {
  const accessToken = jwt.sign(
    { userId, tenantId, roles },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );

  const refreshToken = jwt.sign(
    { userId },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

module.exports = { login, refresh, logout, me, mfaSetup, mfaVerify, mfaDisable, changePassword, forgotPassword };
