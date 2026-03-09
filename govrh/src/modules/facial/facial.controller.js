const prisma = require('../../config/prisma')
const { extrairEmbedding, identificarNaBiometrias } = require('./facial.service')
const AppError = require('../../utils/AppError')

/**
 * POST /facial/identify
 * Rota PÚBLICA — recebe frame e retorna matricula
 */
async function identify(req, res, next) {
  try {
    if (!req.file) throw new AppError('Frame não enviado.', 400)

    // FIX 3: Valida presença do header x-tenant-id antes de prosseguir
    const tenantId = req.headers['x-tenant-id']
    if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
      throw new AppError('Header x-tenant-id é obrigatório.', 400)
    }

    const embedding = await extrairEmbedding(req.file.buffer)
    if (!embedding) {
      return res.status(422).json({
        success: false,
        error: { code: 'NO_FACE', message: 'Nenhum rosto detectado no frame.' }
      })
    }

    // Carrega todos os embeddings ativos do tenant
    const biometrias = await prisma.biometriaFacial.findMany({
      where: { tenantId, ativo: true },
      include: { servidor: { select: { matricula: true, nome: true } } }
    })

    const resultado = identificarNaBiometrias(embedding, biometrias)
    if (!resultado) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_RECOGNIZED', message: 'Servidor não reconhecido.' }
      })
    }

    // FIX 4: Cálculo de confiança com clamp [0, 1] para evitar valores negativos
    const confianca = Number(Math.max(0, 1 - resultado.distancia).toFixed(4))

    return res.json({
      success: true,
      data: {
        matricula: resultado.biometria.servidor.matricula,
        nome:      resultado.biometria.servidor.nome,
        confianca
      }
    })
  } catch (err) { next(err) }
}

/**
 * POST /facial/cadastrar
 * Rota PROTEGIDA — cadastra/atualiza biometria de um servidor
 */
async function cadastrar(req, res, next) {
  try {
    if (!req.file) throw new AppError('Foto não enviada.', 400)

    const { servidorId } = req.params
    const tenantId = req.tenantId

    // Valida que servidor pertence ao tenant
    const servidor = await prisma.servidor.findFirst({
      where: { id: servidorId, tenantId }
    })
    if (!servidor) throw new AppError('Servidor não encontrado.', 404)

    const embedding = await extrairEmbedding(req.file.buffer)
    if (!embedding) throw new AppError('Nenhum rosto detectado na foto.', 422)

    // FIX 6: Auditoria de cadastro para LGPD — registra IP, user-agent e timestamps
    const auditoria = {
      cadastradoPor:  req.user.id,
      cadastradoEm:   new Date().toISOString(),
      ipOrigem:       req.ip || req.headers['x-forwarded-for'] || 'desconhecido',
      userAgent:      req.headers['user-agent'] || 'desconhecido'
    }

    const biometria = await prisma.biometriaFacial.upsert({
      where:  { servidorId },
      update: {
        embedding,
        atualizadaEm: new Date(),
        cadastradoPor: req.user.id,
        auditoria     // persiste log de auditoria no JSON
      },
      create: {
        servidorId,
        tenantId,
        embedding,
        cadastradoPor: req.user.id,
        auditoria
      }
    })

    return res.status(201).json({ success: true, data: { id: biometria.id } })
  } catch (err) { next(err) }
}

/**
 * DELETE /facial/cadastrar/:servidorId
 * LGPD — direito ao esquecimento
 */
async function remover(req, res, next) {
  try {
    // FIX 2: embedding: null em vez de [] para ser compatível com campo JSON do Prisma
    await prisma.biometriaFacial.update({
      where: { servidorId: req.params.servidorId },
      data:  { ativo: false, embedding: null }
    })
    return res.status(204).send()
  } catch (err) { next(err) }
}

module.exports = { identify, cadastrar, remover }