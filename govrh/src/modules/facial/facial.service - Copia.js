// Tenta carregar tfjs-node (nativo C++ — ~1s por identificação)
// Se falhar por incompatibilidade de ABI, cai no WASM (~10s)
let tf
let faceapi
try {
  tf      = require('@tensorflow/tfjs-node')
  faceapi = require('@vladmandic/face-api/dist/face-api.node.js')
  console.log('⚡ TensorFlow backend: tfjs-node (nativo C++)')
} catch (e) {
  console.warn('⚠️  tfjs-node indisponível, usando WASM:', e.message)
  tf      = require('@tensorflow/tfjs')
  require('@tensorflow/tfjs-backend-cpu')
  faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js')
}

const path     = require('path')
const { Jimp } = require('jimp')

let modelosCarregados = false

async function carregarModelos() {
  if (modelosCarregados) return

  const modelPath = path.join(__dirname, '../../../public/models')

  try {
    await tf.setBackend(tf.getBackend() || 'cpu')
    await tf.ready()

    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath)
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath)
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath)

    modelosCarregados = true
    console.log('✅ Modelos faciais carregados (backend:', tf.getBackend(), ')')
  } catch (err) {
    modelosCarregados = false
    console.error('❌ Falha ao carregar modelos faciais:', err.message)
    throw new Error(
      `Não foi possível carregar os modelos de reconhecimento facial. ` +
      `Verifique se os arquivos existem em "${modelPath}". Detalhe: ${err.message}`
    )
  }
}

async function bufferParaTensor(imageBuffer) {
  const imagem = await Jimp.fromBuffer(imageBuffer)
  const width  = imagem.width
  const height = imagem.height

  const bitmapData     = imagem.bitmap.data
  const expectedLength = width * height * 4

  if (bitmapData.length !== expectedLength) {
    throw new Error(
      `Dados de pixel inesperados: esperado ${expectedLength} bytes (${width}x${height}x4), ` +
      `recebido ${bitmapData.length}.`
    )
  }

  const pixels = new Uint8Array(width * height * 3)
  let idx = 0
  for (let offset = 0; offset < bitmapData.length; offset += 4) {
    pixels[idx++] = bitmapData[offset]
    pixels[idx++] = bitmapData[offset + 1]
    pixels[idx++] = bitmapData[offset + 2]
  }

  return tf.tensor3d(pixels, [height, width, 3])
}

async function extrairEmbedding(imageBuffer) {
  await carregarModelos()

  const tensor = await bufferParaTensor(imageBuffer)

  try {
    const deteccao = await faceapi
      .detectSingleFace(tensor)
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (!deteccao) return null

    return Array.from(deteccao.descriptor)
  } finally {
    tensor.dispose()
  }
}

function calcularDistancia(emb1, emb2) {
  return Math.sqrt(
    emb1.reduce((sum, val, i) => sum + Math.pow(val - emb2[i], 2), 0)
  )
}

function identificarNaBiometrias(embeddingFrame, biometrias, threshold = 0.45) {
  if (!biometrias || biometrias.length === 0) {
    console.log('⚠️  Nenhuma biometria encontrada para este tenant')
    return null
  }

  console.log(`📦 Comparando com ${biometrias.length} biometria(s) | threshold: ${threshold}`)

  let melhor = null
  let menorDistancia = Infinity

  for (const bio of biometrias) {
    let embBanco = bio.embedding
    if (typeof embBanco === 'string') {
      try { embBanco = JSON.parse(embBanco) } catch { continue }
    }
    if (!Array.isArray(embBanco) || embBanco.length !== 128) {
      console.warn(`⚠️  Embedding inválido para servidorId ${bio.servidorId} — pulando`)
      continue
    }

    const distancia = calcularDistancia(embeddingFrame, embBanco)
    console.log(`   → servidorId ${bio.servidorId}: distância ${distancia.toFixed(4)}`)

    if (distancia < menorDistancia) {
      menorDistancia = distancia
      melhor = bio
    }
  }

  console.log(`📊 Menor distância: ${menorDistancia.toFixed(4)} | Threshold: ${threshold}`)

  if (melhor && menorDistancia <= threshold) {
    console.log(`✅ Identificado: ${melhor.servidor?.matricula || melhor.servidorId}`)
    return { biometria: melhor, distancia: menorDistancia }
  }

  console.log('❌ Nenhuma correspondência dentro do threshold')
  return null
}

module.exports = { extrairEmbedding, calcularDistancia, identificarNaBiometrias }
