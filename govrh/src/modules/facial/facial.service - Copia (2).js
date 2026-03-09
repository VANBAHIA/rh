// Backend: tenta tfjs-node nativo, cai no WASM se não disponível
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

const path = require('path')

// Sharp é ~10x mais rápido que Jimp para decodificar imagens
let sharp
try {
  sharp = require('sharp')
  console.log('⚡ Processamento de imagem: sharp (nativo)')
} catch {
  console.warn('⚠️  sharp não disponível, usando jimp (mais lento). Rode: npm install sharp')
  sharp = null
}
const { Jimp } = sharp ? {} : require('jimp')

let modelosCarregados = false

async function carregarModelos() {
  if (modelosCarregados) return
  const modelPath = path.join(__dirname, '../../../public/models')
  try {
    await tf.ready()
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath)
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath)
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath)
    modelosCarregados = true
    console.log('✅ Modelos faciais carregados (backend:', tf.getBackend(), ')')
  } catch (err) {
    modelosCarregados = false
    console.error('❌ Falha ao carregar modelos:', err.message)
    throw new Error(`Modelos não carregados: ${err.message}`)
  }
}

// Sharp: decodifica JPEG/PNG direto para RGB raw — muito mais rápido que Jimp
async function bufferParaTensorSharp(imageBuffer) {
  const { data, info } = await sharp(imageBuffer)
    .resize(320, 240, { fit: 'inside', withoutEnlargement: true }) // redimensiona antes de decodificar
    .removeAlpha()      // garante 3 canais RGB
    .raw()              // retorna pixels brutos sem overhead de encode
    .toBuffer({ resolveWithObject: true })

  return tf.tensor3d(new Uint8Array(data.buffer), [info.height, info.width, 3])
}

// Jimp: fallback mais lento
async function bufferParaTensorJimp(imageBuffer) {
  const imagem = await Jimp.fromBuffer(imageBuffer)
  const { width, height } = imagem
  const bitmapData = imagem.bitmap.data

  const pixels = new Uint8Array(width * height * 3)
  let idx = 0
  for (let offset = 0; offset < bitmapData.length; offset += 4) {
    pixels[idx++] = bitmapData[offset]
    pixels[idx++] = bitmapData[offset + 1]
    pixels[idx++] = bitmapData[offset + 2]
  }
  return tf.tensor3d(pixels, [height, width, 3])
}

async function bufferParaTensor(imageBuffer) {
  return sharp ? bufferParaTensorSharp(imageBuffer) : bufferParaTensorJimp(imageBuffer)
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
  return Math.sqrt(emb1.reduce((sum, val, i) => sum + Math.pow(val - emb2[i], 2), 0))
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
