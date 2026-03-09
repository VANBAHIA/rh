const { Router } = require('express')
const multer = require('multer')
const { identify, cadastrar, remover } = require('./facial.controller')
const { authenticate, authorize } = require('../../middlewares/authenticate')
const { auditLog } = require('../../middlewares/auditLogger')

const router = Router()
const upload = multer()

// ─────────────────────────────────────────────────────────────────────────────
// ROTA PÚBLICA — identificação facial pelo BaterPontoPage
// Não requer autenticação JWT, apenas x-tenant-id no header
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/identify',
  upload.single('frame'),
  identify
)

// ─────────────────────────────────────────────────────────────────────────────
// ROTAS PROTEGIDAS — cadastro e remoção de biometria
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/cadastrar/:servidorId',
  authenticate,
  authorize('servidores', 'update'),
  auditLog('facial', 'biometria_create'),
  upload.single('foto'),
  cadastrar
)

router.delete(
  '/cadastrar/:servidorId',
  authenticate,
  authorize('servidores', 'delete'),
  auditLog('facial', 'biometria_delete'),
  remover
)

module.exports = router
