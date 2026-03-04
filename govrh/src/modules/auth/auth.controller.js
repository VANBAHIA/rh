const AuthService = require('./auth.service');
const { ok, created } = require('../../shared/utils/response');

class AuthController {
  constructor() {
    this.service = new AuthService();
    // Faz bind de todos os métodos para preservar o "this" no Express
    Object.getOwnPropertyNames(AuthController.prototype)
      .filter(m => m !== 'constructor')
      .forEach(m => (this[m] = this[m].bind(this)));
  }

  async login(req, res, next) {
    try {
      const { email, tenantCnpj, senha, mfaCode } = req.body;
      const result = await this.service.login({ email, tenantCnpj, senha, mfaCode });
      ok(res, result);
    } catch (err) { next(err); }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await this.service.refreshTokens(refreshToken);
      ok(res, result);
    } catch (err) { next(err); }
  }

  async logout(req, res, next) {
    try {
      await this.service.logout(req.userId);
      ok(res, { message: 'Logout realizado com sucesso.' });
    } catch (err) { next(err); }
  }

  async me(req, res, next) {
    try {
      const result = await this.service.getMe(req.userId);
      ok(res, result);
    } catch (err) { next(err); }
  }

  async forgotPassword(req, res, next) {
    try {
      await this.service.forgotPassword(req.body.email, req.body.tenantCnpj);
      ok(res, { message: 'Se o e-mail existir, você receberá as instruções.' });
    } catch (err) { next(err); }
  }

  async resetPassword(req, res, next) {
    try {
      await this.service.resetPassword(req.body.token, req.body.novaSenha);
      ok(res, { message: 'Senha alterada com sucesso.' });
    } catch (err) { next(err); }
  }

  async enableMfa(req, res, next) {
    try {
      const result = await this.service.enableMfa(req.userId);
      ok(res, result); // Retorna QR Code URI
    } catch (err) { next(err); }
  }

  async verifyMfa(req, res, next) {
    try {
      await this.service.verifyMfa(req.userId, req.body.code);
      ok(res, { message: 'MFA ativado com sucesso.' });
    } catch (err) { next(err); }
  }

  async disableMfa(req, res, next) {
    try {
      await this.service.disableMfa(req.userId, req.body.code);
      ok(res, { message: 'MFA desativado.' });
    } catch (err) { next(err); }
  }

  async changePassword(req, res, next) {
    try {
      await this.service.changePassword(req.userId, req.body.senhaAtual, req.body.novaSenha);
      ok(res, { message: 'Senha alterada com sucesso.' });
    } catch (err) { next(err); }
  }
}

module.exports = AuthController;
