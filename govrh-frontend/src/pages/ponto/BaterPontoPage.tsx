import { useState, useEffect, useRef, useCallback } from 'react'
import { Clock, AlertCircle, CheckCircle2, Loader2, Camera, CameraOff, ScanFace, UserCheck, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { pontoApi } from '@/services/ponto'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { facialApi } from '@/services/facial'

type FaceStatus =
  | 'idle' | 'starting' | 'scanning' | 'positioning'
  | 'identifying' | 'identified' | 'not_found' | 'no_face' | 'error'

const SCAN_INTERVAL_MS = 2500
const FRAME_QUALITY    = 0.85
const MASK = { cx: 50, cy: 48, rx: 28, ry: 36 }

function useFaceInMask(videoRef: React.RefObject<HTMLVideoElement>, cameraAtiva: boolean) {
  const [rostoNaMascara, setRostoNaMascara] = useState(false)
  const checkRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const auxCanvas = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!cameraAtiva) { setRostoNaMascara(false); return }
    if (!auxCanvas.current) auxCanvas.current = document.createElement('canvas')

    checkRef.current = setInterval(() => {
      const video = videoRef.current
      if (!video || video.readyState < 2) return
      const W = video.videoWidth, H = video.videoHeight
      if (!W || !H) return

      const canvas = auxCanvas.current!
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0, W, H)

      const cx = (MASK.cx / 100) * W, cy = (MASK.cy / 100) * H
      const rx = (MASK.rx / 100) * W, ry = (MASK.ry / 100) * H
      const x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(W, Math.ceil(cx + rx))
      const y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(H, Math.ceil(cy + ry))
      const data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data

      let skinPixels = 0, totalPixels = 0
      for (let i = 0; i < data.length; i += 4) {
        const px = x0 + ((i / 4) % (x1 - x0))
        const py = y0 + Math.floor((i / 4) / (x1 - x0))
        const dx = (px - cx) / rx, dy = (py - cy) / ry
        if (dx * dx + dy * dy > 1) continue
        totalPixels++
        const r = data[i], g = data[i+1], b = data[i+2]
        const Cb = -0.169*r - 0.331*g + 0.500*b + 128
        const Cr =  0.500*r - 0.419*g - 0.081*b + 128
        const Y  =  0.299*r + 0.587*g + 0.114*b
        if (Y > 80 && Cb >= 77 && Cb <= 127 && Cr >= 133 && Cr <= 173) skinPixels++
      }
      setRostoNaMascara(totalPixels > 0 && skinPixels / totalPixels > 0.18)
    }, 300)

    return () => { if (checkRef.current) clearInterval(checkRef.current) }
  }, [cameraAtiva, videoRef])

  return rostoNaMascara
}

function FaceMask({ status, scanProgress }: { status: FaceStatus; scanProgress: number }) {
  const isIdentified = status === 'identified'
  const isNotFound   = status === 'not_found'
  const isSearching  = status === 'scanning' || status === 'positioning'
  const strokeColor  = isIdentified ? '#10b981' : isNotFound ? '#ef4444' : status === 'scanning' ? '#f59e0b' : '#60a5fa'

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <mask id="faceMask">
          <rect width="100" height="100" fill="white" />
          <ellipse cx={MASK.cx} cy={MASK.cy} rx={MASK.rx} ry={MASK.ry} fill="black" />
        </mask>
        <filter id="glow">
          <feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id="ovalClip">
          <ellipse cx={MASK.cx} cy={MASK.cy} rx={MASK.rx} ry={MASK.ry} />
        </clipPath>
      </defs>

      <rect width="100" height="100" fill="rgba(0,0,0,0.55)" mask="url(#faceMask)" />

      <ellipse cx={MASK.cx} cy={MASK.cy} rx={MASK.rx} ry={MASK.ry}
        fill="none" stroke={strokeColor} strokeWidth="0.5"
        filter="url(#glow)" style={{ transition: 'stroke 0.4s ease' }} />

      {isSearching && (
        <line
          x1={MASK.cx - MASK.rx + 2}
          y1={MASK.cy - MASK.ry + (scanProgress / 100) * (MASK.ry * 2)}
          x2={MASK.cx + MASK.rx - 2}
          y2={MASK.cy - MASK.ry + (scanProgress / 100) * (MASK.ry * 2)}
          stroke={strokeColor} strokeWidth="0.4" opacity="0.7"
          clipPath="url(#ovalClip)" style={{ transition: 'stroke 0.4s ease' }} />
      )}

      {[
        { x1: MASK.cx-4, y1: MASK.cy-MASK.ry,   x2: MASK.cx+4, y2: MASK.cy-MASK.ry   },
        { x1: MASK.cx-4, y1: MASK.cy+MASK.ry,   x2: MASK.cx+4, y2: MASK.cy+MASK.ry   },
        { x1: MASK.cx-MASK.rx, y1: MASK.cy-3,   x2: MASK.cx-MASK.rx, y2: MASK.cy+3   },
        { x1: MASK.cx+MASK.rx, y1: MASK.cy-3,   x2: MASK.cx+MASK.rx, y2: MASK.cy+3   },
      ].map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round"
          filter="url(#glow)" style={{ transition: 'stroke 0.4s ease' }} />
      ))}

      {isSearching && (
        <text x={MASK.cx} y={MASK.cy + MASK.ry + 6} textAnchor="middle"
          fill="white" fontSize="3.5" opacity="0.85" fontFamily="system-ui, sans-serif">
          {status === 'positioning' ? 'Centralize seu rosto na área oval' : 'Rosto detectado — identificando...'}
        </text>
      )}
      {isNotFound && (
        <text x={MASK.cx} y={MASK.cy + MASK.ry + 6} textAnchor="middle"
          fill="#ef4444" fontSize="3.5" fontFamily="system-ui, sans-serif">
          Rosto não reconhecido
        </text>
      )}
    </svg>
  )
}

export default function BaterPontoPage() {
  const [dataHora, setDataHora]         = useState(new Date())
  const [matricula, setMatricula]       = useState('')
  const [servidorNome, setServidorNome] = useState('')
  const [loading, setLoading]           = useState(false)
  const [lastBatida, setLastBatida]     = useState<{ servidor: string; hora: string; tipo: string } | null>(null)
  const [faceStatus, setFaceStatus]     = useState<FaceStatus>('idle')
  const [cameraAtiva, setCameraAtiva]   = useState(false)
  const [scanProgress, setScanProgress] = useState(0)

  const videoRef     = useRef<HTMLVideoElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const streamRef    = useRef<MediaStream | null>(null)
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  const rostoNaMascara = useFaceInMask(videoRef, cameraAtiva)

  useEffect(() => {
    if (!cameraAtiva) return
    if (faceStatus === 'identified' || faceStatus === 'identifying') return
    if (rostoNaMascara && faceStatus !== 'scanning') setFaceStatus('scanning')
    else if (!rostoNaMascara && faceStatus === 'scanning') setFaceStatus('positioning')
  }, [rostoNaMascara, cameraAtiva, faceStatus])

  useEffect(() => {
    const timer = setInterval(() => setDataHora(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => { return () => { pararCamera() } }, []) // eslint-disable-line

  const formatarData = (date: Date) =>
    date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase())

  const formatarHora = (date: Date) =>
    date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const iniciarCamera = async () => {
    setFaceStatus('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setCameraAtiva(true)
      setFaceStatus('positioning')
      iniciarScan()
    } catch {
      setFaceStatus('error')
      toast({ variant: 'destructive', title: 'Câmera indisponível', description: 'Verifique as permissões de câmera no navegador.' })
    }
  }

  const pararCamera = () => {
    if (scanTimerRef.current) clearInterval(scanTimerRef.current)
    if (progressRef.current)  clearInterval(progressRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraAtiva(false)
    setFaceStatus('idle')
    setScanProgress(0)
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

  const identificarRosto = useCallback(async () => {
    if (faceStatus === 'identifying' || faceStatus === 'identified') return
    if (!rostoNaMascara) return
    const blob = await capturarFrame()
    if (!blob) return
    setFaceStatus('identifying')
    try {
      const tenantId = localStorage.getItem('tenantId') ||
        JSON.parse(localStorage.getItem('usuario') || '{}')?.tenant?.id || ''
      const response = await facialApi.identify(blob, tenantId)
      const { matricula: mat, nome } = response.data?.data || {}
      if (mat) {
        setMatricula(mat)
        if (nome) setServidorNome(nome)
        setFaceStatus('identified')
        if (scanTimerRef.current) clearInterval(scanTimerRef.current)
        if (progressRef.current)  clearInterval(progressRef.current)
        setScanProgress(100)
        toast({ title: '✓ Servidor identificado!', description: nome || mat })
      } else {
        setFaceStatus('not_found')
        setTimeout(() => { if (cameraAtiva) setFaceStatus('scanning') }, 2000)
      }
    } catch {
      setFaceStatus('not_found')
      setTimeout(() => { if (cameraAtiva) setFaceStatus('scanning') }, 2000)
    }
  }, [faceStatus, capturarFrame, cameraAtiva, rostoNaMascara])

  const iniciarScan = useCallback(() => {
    const animarProgress = () => {
      setScanProgress(0); let p = 0
      if (progressRef.current) clearInterval(progressRef.current)
      progressRef.current = setInterval(() => {
        p += 2; setScanProgress(p)
        if (p >= 100) clearInterval(progressRef.current!)
      }, SCAN_INTERVAL_MS / 50)
    }
    animarProgress()
    scanTimerRef.current = setInterval(() => { identificarRosto(); animarProgress() }, SCAN_INTERVAL_MS)
  }, [identificarRosto])

  const resetarIdentificacao = () => {
    setMatricula(''); setServidorNome(''); setFaceStatus('positioning'); setScanProgress(0); iniciarScan()
  }

  const handleBaterPonto = async () => {
    if (!matricula.trim()) return
    setLoading(true)
    try {
      const data = dataHora.toISOString().split('T')[0]
      const hora = formatarHora(dataHora)
      const response = await pontoApi.bater({ servidorId: matricula, data, hora })
      const { tipo } = (response.data as any).data || {}
      setLastBatida({ servidor: matricula, hora, tipo: tipo || 'batida' })
      toast({ title: '✓ Ponto registrado!', description: `${servidorNome || matricula} às ${hora}` })
      setMatricula(''); setServidorNome(''); setFaceStatus('positioning'); iniciarScan()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao registrar ponto', description: extractApiError(err) })
    } finally { setLoading(false) }
  }

  const faceStatusConfig: Record<FaceStatus, { label: string; color: string; icon: React.ReactNode }> = {
    idle:        { label: 'Câmera desligada',      color: 'text-gray-500',    icon: <CameraOff className="w-4 h-4" /> },
    starting:    { label: 'Iniciando câmera...',   color: 'text-blue-500',    icon: <Loader2 className="w-4 h-4 animate-spin" /> },
    positioning: { label: 'Posicione o rosto',     color: 'text-blue-400',    icon: <ScanFace className="w-4 h-4 animate-pulse" /> },
    scanning:    { label: 'Rosto detectado',       color: 'text-amber-500',   icon: <ScanFace className="w-4 h-4 animate-pulse" /> },
    identifying: { label: 'Identificando...',      color: 'text-amber-600',   icon: <Loader2 className="w-4 h-4 animate-spin" /> },
    identified:  { label: 'Servidor identificado', color: 'text-emerald-600', icon: <UserCheck className="w-4 h-4" /> },
    not_found:   { label: 'Não reconhecido',       color: 'text-red-500',     icon: <AlertCircle className="w-4 h-4" /> },
    no_face:     { label: 'Posicione o rosto',     color: 'text-amber-500',   icon: <ScanFace className="w-4 h-4" /> },
    error:       { label: 'Erro na câmera',        color: 'text-red-600',     icon: <CameraOff className="w-4 h-4" /> },
  }

  const statusCfg = faceStatusConfig[faceStatus]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gov-600 to-gov-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          <div className="bg-gradient-to-r from-gov-500 to-gov-700 p-8 text-center text-white">
            <div className="flex justify-center mb-3"><Clock className="w-16 h-16 animate-pulse" /></div>
            <h1 className="text-2xl font-bold">Bater Ponto</h1>
            <p className="text-gov-100 text-sm mt-1">Sistema de Controle de Ponto</p>
          </div>

          <div className="p-8 space-y-5">
            <div className="bg-gov-50 rounded-xl p-5 text-center border border-gov-100">
              <p className="text-sm font-medium text-gov-700 mb-1">Data e Hora Atual</p>
              <p className="text-3xl font-bold text-gov-900 font-mono mb-1">{formatarHora(dataHora)}</p>
              <p className="text-sm text-gov-600">{formatarData(dataHora)}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Camera className="w-4 h-4" /> Identificação Facial
                </label>
                <span className={cn('text-xs font-medium flex items-center gap-1', statusCfg.color)}>
                  {statusCfg.icon}{statusCfg.label}
                </span>
              </div>

              <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video border-2 border-gov-200">
                <video
                  ref={videoRef}
                  className={cn('w-full h-full object-cover transition-opacity duration-500', cameraAtiva ? 'opacity-100' : 'opacity-0')}
                  muted playsInline
                />
                {!cameraAtiva && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2">
                    <CameraOff className="w-10 h-10" />
                    <p className="text-xs">Câmera desligada</p>
                  </div>
                )}
                {cameraAtiva && <FaceMask status={faceStatus} scanProgress={scanProgress} />}
                {faceStatus === 'identified' && (
                  <div className="absolute top-2 right-2 pointer-events-none">
                    <div className="bg-emerald-500/90 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-white" />
                      <p className="text-white font-semibold text-sm">{servidorNome || matricula}</p>
                    </div>
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {cameraAtiva && faceStatus === 'positioning' && (
                <p className="text-center text-xs text-blue-500 animate-pulse">
                  👤 Centralize seu rosto na área oval da câmera
                </p>
              )}

              <div className="flex gap-2">
                {!cameraAtiva ? (
                  <Button onClick={iniciarCamera} variant="outline" className="flex-1 border-gov-300 text-gov-700 hover:bg-gov-50">
                    <Camera className="w-4 h-4 mr-2" /> Ativar Câmera
                  </Button>
                ) : (
                  <>
                    <Button onClick={pararCamera} variant="outline" className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-50">
                      <CameraOff className="w-4 h-4 mr-2" /> Desligar
                    </Button>
                    {faceStatus === 'identified' && (
                      <Button onClick={resetarIdentificacao} variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50" title="Identificar outro servidor">
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Matrícula do Servidor</label>
              <Input type="text" placeholder="Aguardando identificação facial..." value={matricula} readOnly
                className={cn('text-center text-lg font-mono cursor-not-allowed',
                  matricula ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-gray-50 text-gray-400')} />
              <p className="text-xs text-gray-500 pl-1">
                {matricula ? 'Matrícula identificada automaticamente via reconhecimento facial'
                  : 'A matrícula será preenchida automaticamente após a identificação facial'}
              </p>
            </div>

            <Button onClick={handleBaterPonto}
              disabled={loading || !matricula.trim() || faceStatus !== 'identified'}
              className={cn('w-full h-14 text-lg font-bold rounded-lg transition-all duration-300',
                'bg-gradient-to-r from-gov-500 to-gov-700 hover:from-gov-600 hover:to-gov-800',
                'text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed',
                loading && 'animate-pulse')}>
              {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Registrando...</>
                : <><Clock className="w-5 h-5 mr-2" />Bater Ponto</>}
            </Button>

            {!cameraAtiva && !matricula && (
              <p className="text-center text-xs text-gray-400">Ative a câmera para identificação facial e liberação do ponto</p>
            )}

            {lastBatida && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 animate-in fade-in slide-in-from-top">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-emerald-900 text-sm">Último ponto registrado</p>
                    <p className="text-xs text-emerald-700 mt-1">Matrícula: <span className="font-mono font-semibold">{lastBatida.servidor}</span></p>
                    <p className="text-xs text-emerald-700">Hora: <span className="font-mono font-semibold">{lastBatida.hora}</span></p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-700">
                <p className="font-semibold mb-1">Atenção</p>
                <p>A câmera captura seu rosto apenas para identificação de ponto. Nenhuma imagem é armazenada. Dados biométricos são tratados conforme a LGPD.</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border-t border-gray-200 px-8 py-4 text-center text-xs text-gray-500">
            <p>Ponto registrado com segurança via reconhecimento facial</p>
          </div>
        </div>
        <div className="mt-6 text-center text-white/80 text-xs">
          <p>GovHRPub • Sistema de Controle de Ponto</p>
          <p className="mt-1">© 2026 Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  )
}
