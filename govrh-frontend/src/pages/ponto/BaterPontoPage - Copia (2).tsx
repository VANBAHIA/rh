import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Clock, AlertCircle, CheckCircle2, Loader2,
  Camera, CameraOff, UserCheck, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pontoApi } from '@/services/ponto'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { facialApi } from '@/services/facial'
import { useAuthStore } from '@/store/authStore'

type FaceStatus =
  | 'idle' | 'starting' | 'ready' | 'capturing'
  | 'identified' | 'not_found' | 'no_face' | 'error'

const FRAME_QUALITY = 0.85
const MASK = { cx: 50, cy: 46, rx: 30, ry: 38 }
const SKIN_THRESHOLD = 0.08

function useFacePresence(videoRef: React.RefObject<HTMLVideoElement>, cameraAtiva: boolean) {
  const [rostoPresente, setRostoPresente] = useState(false)
  const [skinRatio, setSkinRatio] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const auxCanvas = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    
    if (!cameraAtiva) {
      setRostoPresente(false); setSkinRatio(0)
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    if (!auxCanvas.current) auxCanvas.current = document.createElement('canvas')
    timerRef.current = setInterval(() => {
      const video = videoRef.current
      if (!video || video.readyState < 2) return
      const W = video.videoWidth, H = video.videoHeight
      if (!W || !H) return
      const canvas = auxCanvas.current!
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(video, 0, 0, W, H)
      const cx = (MASK.cx / 100) * W, cy = (MASK.cy / 100) * H
      const rx = (MASK.rx / 100) * W, ry = (MASK.ry / 100) * H
      const x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(W, Math.ceil(cx + rx))
      const y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(H, Math.ceil(cy + ry))
      const data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data
      let skinPixels = 0, totalPixels = 0
      for (let i = 0; i < data.length; i += 4) {
        const px = x0 + ((i / 4) % (x1 - x0)), py = y0 + Math.floor((i / 4) / (x1 - x0))
        const dx = (px - cx) / rx, dy = (py - cy) / ry
        if (dx * dx + dy * dy > 1) continue
        totalPixels++
        const r = data[i], g = data[i + 1], b = data[i + 2]
        const Y = 0.299 * r + 0.587 * g + 0.114 * b
        const Cb = -0.169 * r - 0.331 * g + 0.500 * b + 128
        const Cr = 0.500 * r - 0.419 * g - 0.081 * b + 128
        if (Y > 60 && Cb >= 75 && Cb <= 135 && Cr >= 128 && Cr <= 178) skinPixels++
      }
      const ratio = totalPixels > 0 ? skinPixels / totalPixels : 0
      setSkinRatio(ratio)
      setRostoPresente(ratio > SKIN_THRESHOLD)
    }, 300)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [cameraAtiva, videoRef])

  return { rostoPresente, skinRatio }
}

function FaceMask({ status, rostoPresente, skinRatio }: {
  status: FaceStatus; rostoPresente: boolean; skinRatio: number
}) {
  const isIdentified = status === 'identified'
  const isError = status === 'not_found' || status === 'no_face'
  const isCapturing = status === 'capturing'
  const showPulse = rostoPresente && !isCapturing && !isIdentified && !isError
  const strokeColor =
    isIdentified ? '#10b981' : isError ? '#ef4444' :
      isCapturing ? '#f59e0b' : rostoPresente ? '#34d399' : '#60a5fa'

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <mask id="holeMask">
          <rect width="100" height="100" fill="white" />
          <ellipse cx={MASK.cx} cy={MASK.cy} rx={MASK.rx} ry={MASK.ry} fill="black" />
        </mask>
        <filter id="glow">
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="100" height="100" fill="rgba(0,0,0,0.60)" mask="url(#holeMask)" />
      <ellipse cx={MASK.cx} cy={MASK.cy} rx={MASK.rx} ry={MASK.ry}
        fill="none" stroke={strokeColor} strokeWidth="0.6" filter="url(#glow)"
        style={{ transition: 'stroke 0.35s ease' }} />
      {showPulse && (
        <ellipse cx={MASK.cx} cy={MASK.cy} rx={MASK.rx + 1.5} ry={MASK.ry + 1.5}
          fill="none" stroke={strokeColor} strokeWidth="0.25" opacity="0.45" />
      )}
      {[
        { x1: MASK.cx - 5, y1: MASK.cy - MASK.ry, x2: MASK.cx + 5, y2: MASK.cy - MASK.ry },
        { x1: MASK.cx - 5, y1: MASK.cy + MASK.ry, x2: MASK.cx + 5, y2: MASK.cy + MASK.ry },
        { x1: MASK.cx - MASK.rx, y1: MASK.cy - 3, x2: MASK.cx - MASK.rx, y2: MASK.cy + 3 },
        { x1: MASK.cx + MASK.rx, y1: MASK.cy - 3, x2: MASK.cx + MASK.rx, y2: MASK.cy + 3 },
      ].map((l, i) => (
        <line key={i} {...l} stroke={strokeColor} strokeWidth="1.4" strokeLinecap="round"
          filter="url(#glow)" style={{ transition: 'stroke 0.35s ease' }} />
      ))}
      {status === 'ready' && (
        <rect x={MASK.cx - MASK.rx} y={MASK.cy + MASK.ry + 2}
          width={(MASK.rx * 2) * Math.min(skinRatio / 0.25, 1)} height="1"
          fill={rostoPresente ? '#34d399' : '#60a5fa'} opacity="0.6" rx="0.5"
          style={{ transition: 'width 0.2s ease, fill 0.3s ease' }} />
      )}
      {status === 'ready' && !rostoPresente && (
        <text x={MASK.cx} y={MASK.cy + MASK.ry + 7} textAnchor="middle"
          fill="rgba(255,255,255,0.75)" fontSize="3.2" fontFamily="system-ui, sans-serif">
          Centralize seu rosto na área oval
        </text>
      )}
      {status === 'ready' && rostoPresente && (
        <text x={MASK.cx} y={MASK.cy + MASK.ry + 7} textAnchor="middle"
          fill="#34d399" fontSize="3.2" fontFamily="system-ui, sans-serif">
          ✓ Posicionado — toque o botão abaixo
        </text>
      )}
      {isCapturing && (
        <text x={MASK.cx} y={MASK.cy + MASK.ry + 7} textAnchor="middle"
          fill="#f59e0b" fontSize="3.2" fontFamily="system-ui, sans-serif">Analisando biometria...</text>
      )}
      {status === 'not_found' && (
        <text x={MASK.cx} y={MASK.cy + MASK.ry + 7} textAnchor="middle"
          fill="#ef4444" fontSize="3.2" fontFamily="system-ui, sans-serif">Servidor não reconhecido</text>
      )}
      {status === 'no_face' && (
        <text x={MASK.cx} y={MASK.cy + MASK.ry + 7} textAnchor="middle"
          fill="#f59e0b" fontSize="3.2" fontFamily="system-ui, sans-serif">Nenhum rosto detectado — reposicione</text>
      )}
      {isIdentified && (
        <text x={MASK.cx} y={MASK.cy + MASK.ry + 7} textAnchor="middle"
          fill="#10b981" fontSize="3.2" fontFamily="system-ui, sans-serif">✓ Identificado com sucesso</text>
      )}
    </svg>
  )
}

function ShutterButton({ onClick, status, rostoPresente }: {
  onClick: () => void; status: FaceStatus; rostoPresente: boolean
}) {
  const isCapturing = status === 'capturing'
  const isIdentified = status === 'identified'
  const disabled = isCapturing || isIdentified || status === 'idle' || status === 'starting'
  const ringColor = isIdentified ? 'border-emerald-400' : isCapturing ? 'border-amber-400' : rostoPresente ? 'border-blue-400' : 'border-gray-500'
  const innerColor = isIdentified ? 'bg-emerald-500' : isCapturing ? 'bg-amber-500' : rostoPresente ? 'bg-white' : 'bg-gray-500'

  return (
    <button onClick={onClick} disabled={disabled} aria-label="Capturar e identificar rosto"
      className={cn('relative w-20 h-20 rounded-full border-4 transition-all duration-200 flex items-center justify-center active:scale-95 focus:outline-none touch-manipulation select-none', ringColor, disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105')}
      style={{ WebkitTapHighlightColor: 'transparent' }}>
      <span className={cn('w-14 h-14 rounded-full transition-all duration-200 flex items-center justify-center', innerColor)}>
        {isCapturing && <Loader2 className="w-6 h-6 text-white animate-spin" />}
        {isIdentified && <UserCheck className="w-6 h-6 text-white" />}
      </span>
    </button>
  )
}

export default function BaterPontoPage() {
  const [dataHora, setDataHora] = useState(new Date())
  const [matricula, setMatricula] = useState('')
  const [servidorNome, setServidorNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [faceStatus, setFaceStatus] = useState<FaceStatus>('idle')
  const [lastBatida, setLastBatida] = useState<{ servidor: string; nome: string; hora: string; tipo: string } | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // ✅ FIX PRINCIPAL: lê tenantId direto do authStore (chave: govrh-auth > state > usuario > tenant > id)
  const tenantId = useAuthStore(state => state.usuario?.tenant?.id ?? '')

  const cameraAtiva = faceStatus !== 'idle' && faceStatus !== 'starting' && faceStatus !== 'error'
  const { rostoPresente, skinRatio } = useFacePresence(videoRef, cameraAtiva)

  useEffect(() => {
    const t = setInterval(() => setDataHora(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => () => pararCamera(), []) // eslint-disable-line

  const formatarHora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const formatarData = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())

  const iniciarCamera = async () => {
    setFaceStatus('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setFaceStatus('ready')
    } catch {
      setFaceStatus('error')
      toast({ variant: 'destructive', title: 'Câmera indisponível', description: 'Verifique as permissões de câmera no navegador.' })
    }
  }

  const pararCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setFaceStatus('idle'); setMatricula(''); setServidorNome('')
  }

  const capturarFrame = useCallback((): Promise<Blob | null> => {
    return new Promise(resolve => {
      const video = videoRef.current, canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) return resolve(null)
      canvas.width = video.videoWidth; canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(null)
      ctx.drawImage(video, 0, 0)
      canvas.toBlob(resolve, 'image/jpeg', FRAME_QUALITY)
    })
  }, [])

  const handleCapturar = useCallback(async () => {
    if (faceStatus !== 'ready') return

    // Decodifica tenantId do JWT (sem verificar assinatura — só leitura do payload)
    const tenantId = (() => {
      try {
        const token = localStorage.getItem('accessToken') ||
          JSON.parse(localStorage.getItem('govrh-auth') || '{}')?.state?.accessToken || ''
        if (!token) return ''
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload.tenantId || ''
      } catch { return '' }
    })()

    if (!tenantId) {
      toast({ variant: 'destructive', title: 'Sessão inválida', description: 'Faça login novamente.' })
      return
    }
    setFaceStatus('capturing')
    const blob = await capturarFrame()
    if (!blob) { setFaceStatus('ready'); toast({ variant: 'destructive', title: 'Erro ao capturar imagem' }); return }
    try {
      const response = await facialApi.identify(blob, tenantId)
      const { matricula: mat, nome } = response.data?.data || {}
      if (mat) {
        setMatricula(mat); if (nome) setServidorNome(nome)
        setFaceStatus('identified')
        toast({ title: '✓ Servidor identificado!', description: nome || mat })
      } else {
        setFaceStatus('not_found')
        setTimeout(() => setFaceStatus('ready'), 2500)
      }
    } catch (err: any) {
      setFaceStatus(err?.response?.status === 422 ? 'no_face' : 'not_found')
      setTimeout(() => setFaceStatus('ready'), 2500)
    }
  }, [faceStatus, capturarFrame, tenantId])

  const resetar = () => { setMatricula(''); setServidorNome(''); setFaceStatus('ready') }

  const handleBaterPonto = async () => {
    if (!matricula.trim()) return
    setLoading(true)
    try {
      const hora = formatarHora(dataHora), data = dataHora.toISOString().split('T')[0]
      const response = await pontoApi.bater({ servidorId: matricula, data, hora })
      const { tipo } = (response.data as any).data || {}
      setLastBatida({ servidor: matricula, nome: servidorNome, hora, tipo: tipo || 'batida' })
      toast({ title: '✓ Ponto registrado!', description: `${servidorNome || matricula} às ${hora}` })
      setMatricula(''); setServidorNome(''); setFaceStatus('ready')
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao registrar ponto', description: extractApiError(err) })
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gov-700 to-gov-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-gov-500 to-gov-700 px-6 py-5 text-center text-white">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-5 h-5 opacity-80" />
              <span className="text-3xl font-bold font-mono tracking-widest">{formatarHora(dataHora)}</span>
            </div>
            <p className="text-gov-100 text-xs">{formatarData(dataHora)}</p>
          </div>

          <div className="relative bg-gray-950" style={{ aspectRatio: '4/3' }}>
            <video ref={videoRef} muted playsInline
              className={cn('w-full h-full object-cover transition-opacity duration-500', cameraAtiva ? 'opacity-100' : 'opacity-0')} />
            {!cameraAtiva && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500">
                <CameraOff className="w-12 h-12 opacity-40" />
                <p className="text-xs opacity-60">{faceStatus === 'starting' ? 'Iniciando câmera...' : 'Câmera desligada'}</p>
              </div>
            )}
            {cameraAtiva && <FaceMask status={faceStatus} rostoPresente={rostoPresente} skinRatio={skinRatio} />}
            {faceStatus === 'identified' && (
              <div className="absolute top-3 inset-x-3 flex justify-center pointer-events-none">
                <div className="bg-emerald-500/95 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg">
                  <UserCheck className="w-5 h-5 text-white shrink-0" />
                  <div className="text-left">
                    <p className="text-white font-bold text-sm leading-tight">{servidorNome}</p>
                    <p className="text-emerald-100 text-xs font-mono">{matricula}</p>
                  </div>
                </div>
              </div>
            )}
            {faceStatus === 'starting' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
              </div>
            )}
            {cameraAtiva && (
              <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-6">
                {faceStatus === 'identified' ? (
                  <button onClick={resetar}
                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 active:scale-90 transition-all touch-manipulation">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                ) : <div className="w-10" />}
                <ShutterButton onClick={handleCapturar} status={faceStatus} rostoPresente={rostoPresente} />
                <div className="w-10" />
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="p-5 space-y-4">
            {!cameraAtiva ? (
              <Button onClick={iniciarCamera} disabled={faceStatus === 'starting'}
                className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-gov-500 to-gov-700 hover:from-gov-600 hover:to-gov-800 text-white rounded-xl">
                {faceStatus === 'starting' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Iniciando...</> : <><Camera className="w-4 h-4 mr-2" />Ativar Câmera</>}
              </Button>
            ) : (
              <Button onClick={pararCamera} variant="outline"
                className="w-full h-10 text-xs border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl">
                <CameraOff className="w-3.5 h-3.5 mr-1.5" /> Desligar câmera
              </Button>
            )}
            {cameraAtiva && faceStatus === 'ready' && (
              <p className={cn('text-center text-xs transition-colors duration-300', rostoPresente ? 'text-emerald-600 font-medium' : 'text-gray-400')}>
                {rostoPresente ? '✓ Rosto detectado — toque o botão branco para identificar' : '👤 Posicione seu rosto dentro da área oval e toque o botão'}
              </p>
            )}
            {matricula && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-emerald-600 font-medium">Servidor identificado</p>
                  <p className="text-sm font-bold text-emerald-900 truncate">{servidorNome}</p>
                  <p className="text-xs font-mono text-emerald-700">{matricula}</p>
                </div>
              </div>
            )}
            <Button onClick={handleBaterPonto} disabled={loading || !matricula.trim() || faceStatus !== 'identified'}
              className={cn('w-full h-14 text-base font-bold rounded-xl transition-all duration-300 bg-gradient-to-r from-gov-500 to-gov-700 hover:from-gov-600 hover:to-gov-800 text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed', loading && 'animate-pulse')}>
              {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Registrando...</> : <><Clock className="w-5 h-5 mr-2" />Confirmar Ponto</>}
            </Button>
            {lastBatida && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="text-xs text-emerald-700 space-y-0.5">
                  <p className="font-semibold text-emerald-900">Último ponto registrado</p>
                  <p>{lastBatida.nome} <span className="font-mono">({lastBatida.servidor})</span></p>
                  <p>Às <span className="font-mono font-semibold">{lastBatida.hora}</span></p>
                </div>
              </div>
            )}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">A câmera captura seu rosto apenas para identificação. Nenhuma imagem é armazenada. Dados biométricos tratados conforme a <strong>LGPD</strong>.</p>
            </div>
          </div>

          <div className="border-t border-gray-100 px-5 py-3 text-center">
            <p className="text-xs text-gray-400">GovHRPub · Controle de Ponto</p>
          </div>
        </div>
      </div>
    </div>
  )
}