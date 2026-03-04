const { Router } = require('express')
const multer = require('multer')
const { authenticate, authorize } = require('../../middlewares/authenticate')
const ctrl = require('./facial.controller')

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

// ── Pública (usada pelo BaterPontoPage) ──────────────────────
router.post('/identify', upload.single('frame'), ctrl.identify)

// ── Protegidas (usadas pela tela de cadastro do RH) ──────────
router.post('/cadastrar/:servidorId', authenticate, authorize('servidores', 'update'), upload.single('foto'), ctrl.cadastrar)
router.delete('/cadastrar/:servidorId', authenticate, authorize('servidores', 'update'), ctrl.remover)

module.exports = router