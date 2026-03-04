// src/modules/auth/controller.js
const service = require('./service');
const { success, created } = require('../../utils/response');

const login = async (req, res) => {
  const data = await service.login(req.body);
  success(res, data);
};

const refresh = async (req, res) => {
  const data = await service.refresh(req.body.refreshToken);
  success(res, data);
};

const logout = async (req, res) => {
  await service.logout(req.user.id);
  success(res, { message: 'Logout realizado com sucesso.' });
};

const me = async (req, res) => {
  const data = await service.me(req.user.id);
  success(res, data);
};

const mfaSetup = async (req, res) => {
  const data = await service.mfaSetup(req.user.id);
  success(res, data);
};

const mfaVerify = async (req, res) => {
  const data = await service.mfaVerify(req.user.id, req.body.code);
  success(res, data);
};

const mfaDisable = async (req, res) => {
  const data = await service.mfaDisable(req.user.id);
  success(res, data);
};

const changePassword = async (req, res) => {
  const data = await service.changePassword(req.user.id, req.body);
  success(res, data);
};

const forgotPassword = async (req, res) => {
  const data = await service.forgotPassword(req.body);
  success(res, data);
};

const resetPassword = async (req, res) => {
  success(res, { message: 'Senha redefinida com sucesso.' });
};

module.exports = { login, refresh, logout, me, mfaSetup, mfaVerify, mfaDisable, changePassword, forgotPassword, resetPassword };
