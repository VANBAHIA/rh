const { Router } = require('express');
const { authenticate } = require('../../middlewares/authenticate');
const { authLimiter } = require('../../middlewares/rateLimiter');
const AuthController = require('./auth.controller');

const router = Router();
const ctrl = new AuthController();

// Rotas públicas (com rate limit restrito)
router.post('/login',          authLimiter, ctrl.login);
router.post('/refresh',        ctrl.refresh);
router.post('/forgot-password',authLimiter, ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);

// Rotas autenticadas
router.post('/logout',         authenticate, ctrl.logout);
router.get('/me',              authenticate, ctrl.me);
router.post('/mfa/enable',     authenticate, ctrl.enableMfa);
router.post('/mfa/verify',     authenticate, ctrl.verifyMfa);
router.post('/mfa/disable',    authenticate, ctrl.disableMfa);
router.put('/change-password', authenticate, ctrl.changePassword);

module.exports = router;
