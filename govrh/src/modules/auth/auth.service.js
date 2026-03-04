const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { totp } = require('otplib');
const config = require('../../config');
const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 15;

class AuthService {
  /**
   * Login com e-mail + senha (+ MFA opcional)
   * O tenantCnpj resolve o tenant em contexto multitenancy
   */
  async login({ email, tenantCnpj, senha, mfaCode }) {
    // 1. Resolve o tenant pelo CNPJ
    const tenant = await prisma.tenant.findUnique({ where: { cnpj: tenantCnpj } });
    if (!tenant) throw Errors.INVALID_CREDENTIALS();
    if (!tenant.ativo) throw Errors.TENANT_INACTIVE();

    // 2. Busca usuário
    const usuario = await prisma.usuario.findFirst({
      where: { email, tenantId: tenant.id },
    });
    if (!usuario) throw Errors.INVALID_CREDENTIALS();

    // 3. Verifica bloqueio
    if (usuario.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
      throw Errors.ACCOUNT_LOCKED(usuario.bloqueadoAte.toLocaleString('pt-BR'));
    }

    // 4. Verifica senha
    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      const tentativas = usuario.tentativasLogin + 1;
      const bloqueadoAte = tentativas >= MAX_TENTATIVAS
        ? new Date(Date.now() + BLOQUEIO_MINUTOS * 60 * 1000)
        : null;
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { tentativasLogin: tentativas, bloqueadoAte },
      });
      throw Errors.INVALID_CREDENTIALS();
    }

    // 5. Verifica MFA
    if (usuario.mfaAtivado) {
      if (!mfaCode) throw Errors.MFA_REQUIRED();
      const mfaValido = totp.check(mfaCode, usuario.mfaSecret);
      if (!mfaValido) throw Errors.MFA_INVALID();
    }

    // 6. Emite tokens
    const tokens = this._gerarTokens(usuario.id, tenant.id);

    // 7. Salva refresh token e reseta tentativas
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        refreshToken: tokens.refreshToken,
        tentativasLogin: 0,
        bloqueadoAte: null,
        ultimoLogin: new Date(),
      },
    });

    return tokens;
  }

  async refreshTokens(refreshToken) {
    if (!refreshToken) throw Errors.TOKEN_INVALID();
    let payload;
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch {
      throw Errors.TOKEN_EXPIRED();
    }

    const usuario = await prisma.usuario.findFirst({
      where: { id: payload.userId, refreshToken },
    });
    if (!usuario) throw Errors.TOKEN_INVALID();

    const tokens = this._gerarTokens(usuario.id, payload.tenantId);
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { refreshToken: tokens.refreshToken },
    });
    return tokens;
  }

  async logout(userId) {
    await prisma.usuario.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async getMe(userId) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true, nome: true, email: true, mfaAtivado: true, ultimoLogin: true,
        roles: { include: { role: { select: { nome: true } } } },
        servidor: { select: { id: true, matricula: true, nome: true } },
      },
    });
    return usuario;
  }

  async forgotPassword(email, tenantCnpj) {
    // Implementação: gera token de reset, salva no banco e envia e-mail
    // Retorna sempre ok para não revelar se e-mail existe
  }

  async resetPassword(token, novaSenha) {
    // Implementação: valida token, atualiza senha com bcrypt
  }

  async enableMfa(userId) {
    const secret = totp.generateSecret();
    const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
    const uri = totp.keyuri(usuario.email, config.mfa.issuer, secret);
    // Salva secret temporário (não ativa ainda — aguarda verificação)
    await prisma.usuario.update({ where: { id: userId }, data: { mfaSecret: secret } });
    return { otpAuthUri: uri }; // Frontend gera QR Code com esta URI
  }

  async verifyMfa(userId, code) {
    const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!totp.check(code, usuario.mfaSecret)) throw Errors.MFA_INVALID();
    await prisma.usuario.update({ where: { id: userId }, data: { mfaAtivado: true } });
  }

  async disableMfa(userId, code) {
    const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!totp.check(code, usuario.mfaSecret)) throw Errors.MFA_INVALID();
    await prisma.usuario.update({
      where: { id: userId },
      data: { mfaAtivado: false, mfaSecret: null },
    });
  }

  async changePassword(userId, senhaAtual, novaSenha) {
    const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
    const valida = await bcrypt.compare(senhaAtual, usuario.senhaHash);
    if (!valida) throw Errors.INVALID_CREDENTIALS();
    const hash = await bcrypt.hash(novaSenha, config.bcrypt.rounds);
    await prisma.usuario.update({ where: { id: userId }, data: { senhaHash: hash } });
  }

  _gerarTokens(userId, tenantId) {
    const accessToken = jwt.sign(
      { userId, tenantId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    const refreshToken = jwt.sign(
      { userId, tenantId },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
    return { accessToken, refreshToken, expiresIn: config.jwt.expiresIn };
  }
}

module.exports = AuthService;
