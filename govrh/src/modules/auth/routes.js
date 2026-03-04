// src/modules/auth/routes.js
const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const controller = require('./controller');
const { loginSchema, refreshSchema, forgotSchema, resetSchema, mfaSchema } = require('./schemas');

const router = Router();

// Públicas
router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/forgot-password', validate(forgotSchema), controller.forgotPassword);
router.post('/reset-password', validate(resetSchema), controller.resetPassword);

// Autenticadas
router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.me);
router.post('/mfa/setup', authenticate, controller.mfaSetup);
router.post('/mfa/verify', authenticate, validate(mfaSchema), controller.mfaVerify);
router.post('/mfa/disable', authenticate, controller.mfaDisable);
router.put('/change-password', authenticate, controller.changePassword);

module.exports = router;
