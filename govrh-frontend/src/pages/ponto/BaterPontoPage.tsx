import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Clock, AlertCircle, CheckCircle2, Loader2,
  Camera, CameraOff, UserCheck, RefreshCw,
  Wifi, WifiOff, CalendarOff, AlarmClock, AlarmClockOff, CheckCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pontoApi } from '@/services/ponto'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { facialApi } from '@/services/facial'
import { useAuthStore } from '@/store/authStore'

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

type ServerStatus = 'online' | 'offline' | 'checking'

type FaceStatus =
  | 'idle'
  | 'starting'
  | 'ready'
  | 'capturing'
  | 'identified'
  | 'not_found'
  | 'no_face'
  | 'error'

// Resultado da validação de batida vinda do backend
type ValidacaoBatida =
  | { permitido: false; motivo: 'SEM_ESCALA' | 'DIA_NAO_ESCALADO' | 'JORNADA_ENCERRADA'; mensagem: string }
  | {
      permitido: true
      tipoBatida: 'entrada' | 'saidaAlmoco' | 'retornoAlmoco' | 'saida'
      horarioEsperado: string | null
      aviso: {
        tipo: 'ATRASO' | 'ANTECIPADO'
        minutos: number
        mensagem: string
      } | null
    }

const FRAME_QUALITY  = 0.85
const MASK           = { cx: 50, cy: 47, rx: 22, ry: 38 }
const SKIN_THRESHOLD = 0.08

const TIPO_BATIDA_LABEL: Record<string, string> = {
  entrada:       'Entrada',
  saidaAlmoco:   'Saída p/ almoço',
  retornoAlmoco: 'Retorno do almoço',
  saida:         'Saída',
}

// Labels para o botão confirmar — verbo de ação
const TIPO_BATIDA_BTN: Record<string, string> = {
  entrada:       'Confirmar Entrada',
  saidaAlmoco:   'Confirmar Saída p/ Almoço',
  retornoAlmoco: 'Confirmar Retorno do Almoço',
  saida:         'Confirmar Saída',
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: status do servidor
// ─────────────────────────────────────────────────────────────────────────────
function useServerStatus(intervalMs = 20000) {
  const [status, setStatus]   = useState<ServerStatus>('online') // assume online até provar o contrário
  const [latency, setLatency] = useState<number | null>(null)
  const pausedRef             = useRef(false) // pausa o check durante processamento pesado

  const check = useCallback(async () => {
    if (pausedRef.current) return // não verifica enquanto biometria está processando
    const t0 = Date.now()
    try {
      const res = await fetch('/api/v1/health/time', {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      })
      setLatency(Date.now() - t0)
      // 401/403/404/200 = servidor online; só erro de rede = offline
      setStatus('online')
    } catch (err: any) {
      // Só marca offline se for erro de rede (TypeError), não HTTP errors
      if (err?.name === 'TypeError' || err?.name === 'AbortError') {
        setLatency(null)
        setStatus('offline')
      }
      // Qualquer outro erro = servidor respondeu = online
    }
  }, [])

  const pause  = useCallback(() => { pausedRef.current = true  }, [])
  const resume = useCallback(() => { pausedRef.current = false }, [])

  useEffect(() => {
    check()
    const t = setInterval(check, intervalMs)
    // Não re-verifica no focus para não colidir com processamento
    return () => { clearInterval(t) }
  }, [check, intervalMs])

  return { status, latency, recheck: check, pause, resume }
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: presença de rosto na máscara
// ─────────────────────────────────────────────────────────────────────────────
function useFacePresence(videoRef: React.RefObject<HTMLVideoElement>, cameraAtiva: boolean) {
  const [rostoPresente, setRostoPresente] = useState(false)
  const [skinRatio, setSkinRatio]         = useState(0)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const auxCanvas = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!cameraAtiva) { setRostoPresente(false); setSkinRatio(0); if (timerRef.current) clearInterval(timerRef.current); return }
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
        const Y  =  0.299 * r + 0.587 * g + 0.114 * b
        const Cb = -0.169 * r - 0.331 * g + 0.500 * b + 128
        const Cr =  0.500 * r - 0.419 * g - 0.081 * b + 128
        if (Y > 60 && Cb >= 75 && Cb <= 135 && Cr >= 128 && Cr <= 178) skinPixels++
      }
      const ratio = totalPixels > 0 ? skinPixels / totalPixels : 0
      setSkinRatio(ratio); setRostoPresente(ratio > SKIN_THRESHOLD)
    }, 300)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [cameraAtiva, videoRef])

  return { rostoPresente, skinRatio }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÁSCARA SVG
// ─────────────────────────────────────────────────────────────────────────────
function FaceMask({ status, rostoPresente, skinRatio }: { status: FaceStatus; rostoPresente: boolean; skinRatio: number }) {
  const isIdentified = status === 'identified'
  const isError      = status === 'not_found' || status === 'no_face'
  const isCapturing  = status === 'capturing'
  const strokeColor  = isIdentified ? '#10b981' : isError ? '#ef4444' : isCapturing ? '#f59e0b' : rostoPresente ? '#34d399' : '#60a5fa'
  const showPulse    = rostoPresente && !isCapturing && !isIdentified && !isError

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
      <ellipse cx={MASK.cx} cy={MASK.cy} rx={MASK.rx} ry={MASK.ry} fill="none" stroke={strokeColor} strokeWidth="0.6" filter="url(#glow)" style={{ transition: 'stroke 0.35s ease' }} />
      {showPulse && <ellipse cx={MASK.cx} cy={MASK.cy} rx={MASK.rx + 1.5} ry={MASK.ry + 1.5} fill="none" stroke={strokeColor} strokeWidth="0.25" opacity="0.45" style={{ transition: 'stroke 0.35s ease' }} />}
      {[
        { x1: MASK.cx - 5, y1: MASK.cy - MASK.ry, x2: MASK.cx + 5, y2: MASK.cy - MASK.ry },
        { x1: MASK.cx - 5, y1: MASK.cy + MASK.ry, x2: MASK.cx + 5, y2: MASK.cy + MASK.ry },
        { x1: MASK.cx - MASK.rx, y1: MASK.cy - 3, x2: MASK.cx - MASK.rx, y2: MASK.cy + 3 },
        { x1: MASK.cx + MASK.rx, y1: MASK.cy - 3, x2: MASK.cx + MASK.rx, y2: MASK.cy + 3 },
      ].map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={strokeColor} strokeWidth="1.4" strokeLinecap="round" filter="url(#glow)" style={{ transition: 'stroke 0.35s ease' }} />
      ))}
      {status === 'ready' && <rect x={MASK.cx - MASK.rx} y={MASK.cy + MASK.ry + 2} width={(MASK.rx * 2) * Math.min(skinRatio / 0.25, 1)} height="1" fill={rostoPresente ? '#34d399' : '#60a5fa'} opacity="0.6" rx="0.5" style={{ transition: 'width 0.2s ease, fill 0.3s ease' }} />}
      {status === 'ready' && !rostoPresente && <text x={MASK.cx} y={MASK.cy + MASK.ry + 7} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="3.2" fontFamily="system-ui, sans-serif">Centralize seu rosto na área oval</text>}
      {status === 'ready' && rostoPresente  && <text x={MASK.cx} y={MASK.cy + MASK.ry + 7} textAnchor="middle" fill="#34d399"  fontSize="3.2" fontFamily="system-ui, sans-serif">✓ Posicionado — aguarde a identificação</text>}
      {isCapturing  && <text x={MASK.cx} y={MASK.cy + MASK.ry + 7} textAnchor="middle" fill="#f59e0b" fontSize="3.2" fontFamily="system-ui, sans-serif">Analisando biometria...</text>}
      {status === 'not_found' && <text x={MASK.cx} y={MASK.cy + MASK.ry + 7} textAnchor="middle" fill="#ef4444" fontSize="3.2" fontFamily="system-ui, sans-serif">Servidor não reconhecido</text>}
      {status === 'no_face'   && <text x={MASK.cx} y={MASK.cy + MASK.ry + 7} textAnchor="middle" fill="#f59e0b" fontSize="3.2" fontFamily="system-ui, sans-serif">Nenhum rosto detectado — reposicione</text>}
      {isIdentified && <text x={MASK.cx} y={MASK.cy + MASK.ry + 7} textAnchor="middle" fill="#10b981" fontSize="3.2" fontFamily="system-ui, sans-serif">✓ Identificado com sucesso</text>}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BOTÃO SHUTTER
// ─────────────────────────────────────────────────────────────────────────────
function ShutterButton({ onClick, status, rostoPresente }: { onClick: () => void; status: FaceStatus; rostoPresente: boolean }) {
  const isCapturing  = status === 'capturing'
  const isIdentified = status === 'identified'
  const disabled     = isCapturing || isIdentified || status === 'idle' || status === 'starting'
  const ringColor    = isIdentified ? 'border-emerald-400' : isCapturing ? 'border-amber-400' : rostoPresente ? 'border-blue-400' : 'border-gray-500'
  const innerColor   = isIdentified ? 'bg-emerald-500' : isCapturing ? 'bg-amber-500' : rostoPresente ? 'bg-white' : 'bg-gray-500'

  return (
    <button onClick={onClick} disabled={disabled} aria-label="Capturar e identificar rosto"
      className={cn('relative w-20 h-20 rounded-full border-4 transition-all duration-200 flex items-center justify-center active:scale-95 focus:outline-none touch-manipulation select-none', ringColor, disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105')}
      style={{ WebkitTapHighlightColor: 'transparent' }}>
      <span className={cn('w-14 h-14 rounded-full transition-all duration-200 flex items-center justify-center', innerColor)}>
        {isCapturing  && <Loader2   className="w-6 h-6 text-white animate-spin" />}
        {isIdentified && <UserCheck className="w-6 h-6 text-white" />}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAINEL DE VALIDAÇÃO — exibido após identificação e antes de confirmar
// ─────────────────────────────────────────────────────────────────────────────
function PainelValidacao({
  validacao,
  onConfirmar,
  onCancelar,
  loading,
  nomeServidor,
  matricula,
}: {
  validacao: ValidacaoBatida
  onConfirmar: () => void
  onCancelar: () => void
  loading: boolean
  nomeServidor: string
  matricula: string
}) {
  // Servidor sem escala, não escalado ou jornada encerrada — bloqueado
  if (!validacao.permitido) {
    const cfg = {
      SEM_ESCALA: {
        bg: 'bg-amber-50 border-amber-200',
        icon: <CalendarOff className="w-5 h-5 mt-0.5 shrink-0 text-amber-600" />,
        titulo: 'Sem escala de trabalho',
        textoCor: 'text-amber-900',
        msgCor: 'text-amber-800',
      },
      DIA_NAO_ESCALADO: {
        bg: 'bg-orange-50 border-orange-200',
        icon: <CalendarOff className="w-5 h-5 mt-0.5 shrink-0 text-orange-600" />,
        titulo: 'Não escalado hoje',
        textoCor: 'text-orange-900',
        msgCor: 'text-orange-800',
      },
      JORNADA_ENCERRADA: {
        bg: 'bg-emerald-50 border-emerald-200',
        icon: <CheckCheck className="w-5 h-5 mt-0.5 shrink-0 text-emerald-600" />,
        titulo: 'Jornada encerrada',
        textoCor: 'text-emerald-900',
        msgCor: 'text-emerald-700',
      },
    }[validacao.motivo]

    // Extrai primeiro nome para personalizar a mensagem
    const primeiroNome = nomeServidor ? nomeServidor.split(' ')[0] : ''

    // Personaliza a mensagem com o primeiro nome quando for jornada encerrada
    const mensagemFinal = (validacao.motivo === 'JORNADA_ENCERRADA' && primeiroNome)
      ? validacao.mensagem.replace('Sua jornada', `${primeiroNome}, sua jornada`)
      : validacao.mensagem

    return (
      <div className={cn('rounded-xl border p-4 space-y-3', cfg.bg)}>
        <div className="flex items-start gap-3">
          {cfg.icon}
          <div className="space-y-1">
            <p className={cn('text-sm font-semibold', cfg.textoCor)}>{cfg.titulo}</p>
            <p className={cn('text-xs leading-relaxed', cfg.msgCor)}>{mensagemFinal}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onCancelar} className="w-full text-xs">
          Entendido
        </Button>
      </div>
    )
  }

  // Permitido — com ou sem aviso
  const { tipoBatida, horarioEsperado, aviso } = validacao
  const tipoLabel = TIPO_BATIDA_LABEL[tipoBatida] ?? tipoBatida

  return (
    <div className="space-y-3">
      {/* Identificação do servidor */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
        <UserCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-900 truncate">{nomeServidor}</p>
          <p className="text-xs font-mono text-emerald-600">{matricula}</p>
        </div>
        {horarioEsperado && (
          <div className="text-right shrink-0">
            <p className="text-[10px] text-emerald-600 uppercase tracking-wide">{tipoLabel}</p>
            <p className="text-sm font-mono font-bold text-emerald-800">{horarioEsperado}</p>
          </div>
        )}
      </div>

      {/* Aviso de horário fora do limiar */}
      {aviso && (
        <div className={cn(
          'rounded-xl border p-3 flex items-start gap-2.5',
          aviso.tipo === 'ATRASO'
            ? 'bg-red-50 border-red-200'
            : 'bg-blue-50 border-blue-200',
        )}>
          {aviso.tipo === 'ATRASO'
            ? <AlarmClockOff className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            : <AlarmClock    className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          }
          <p className={cn('text-xs leading-relaxed', aviso.tipo === 'ATRASO' ? 'text-red-800' : 'text-blue-800')}>
            {aviso.mensagem}
          </p>
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancelar} disabled={loading} className="flex-1 text-xs">
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={onConfirmar}
          disabled={loading}
          className={cn(
            'flex-1 text-xs font-semibold',
            aviso?.tipo === 'ATRASO'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gradient-to-r from-gov-500 to-gov-700 hover:from-gov-600 hover:to-gov-800 text-white',
          )}
        >
          {loading
            ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Registrando...</>
            : <><Clock   className="w-3.5 h-3.5 mr-1.5" />{TIPO_BATIDA_BTN[tipoBatida] ?? `Confirmar ${tipoLabel}`}</>
          }
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function BaterPontoPage() {
  const [dataHora, setDataHora]         = useState(new Date())
  // offset em ms: diferença entre relógio do servidor e do cliente
  const serverOffsetRef = useRef<number>(0)
  const [matricula, setMatricula]       = useState('')
  const [servidorNome, setServidorNome] = useState('')
  const [loading, setLoading]           = useState(false)
  const [validando, setValidando]       = useState(false)
  const [faceStatus, setFaceStatus]     = useState<FaceStatus>('idle')
  const [validacao, setValidacao]       = useState<ValidacaoBatida | null>(null)
  const [lastBatida, setLastBatida]     = useState<{
    servidor: string; nome: string; hora: string; tipo: string
  } | null>(null)

  const videoRef        = useRef<HTMLVideoElement>(null)
  const canvasRef       = useRef<HTMLCanvasElement>(null)
  const streamRef       = useRef<MediaStream | null>(null)
  const autoCapTimer    = useRef<ReturnType<typeof setTimeout> | null>(null) // timer de captura automática

  const tenantIdStore = useAuthStore(state => state.usuario?.tenant?.id ?? '')
  const cameraAtiva   = faceStatus !== 'idle' && faceStatus !== 'starting' && faceStatus !== 'error'
  const { rostoPresente, skinRatio } = useFacePresence(videoRef, cameraAtiva)
  const { status: serverStatus, latency, recheck, pause: pauseHealthCheck, resume: resumeHealthCheck } = useServerStatus()

  // Relógio sincronizado com o servidor via /api/v1/health/time
  // Usa ref para o offset — evita re-criar o setInterval a cada mudança
  useEffect(() => {
    const sincronizar = async () => {
      try {
        const t0  = Date.now()
        const res = await fetch('/api/v1/health/time')
        const t1  = Date.now()
        if (res.ok) {
          const { serverTime } = await res.json()
          const latenciaMs          = (t1 - t0) / 2
          serverOffsetRef.current   = new Date(serverTime).getTime() - t1 + latenciaMs
        }
      } catch {
        // falha silenciosa — relógio local como fallback
      }
    }

    sincronizar()
    const syncInterval = setInterval(sincronizar, 5 * 60 * 1000)
    const tickInterval = setInterval(() => {
      setDataHora(new Date(Date.now() + serverOffsetRef.current))
    }, 1000)

    return () => {
      clearInterval(syncInterval)
      clearInterval(tickInterval)
    }
  }, [])

  useEffect(() => () => pararCamera(), []) // eslint-disable-line

  const formatarHora = (d: Date) =>
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const formatarData = (d: Date) =>
    d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase())

  const iniciarCamera = async () => {
    setFaceStatus('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setFaceStatus('ready')
    } catch {
      setFaceStatus('error')
      toast({ variant: 'destructive', title: 'Câmera indisponível', description: 'Verifique as permissões de câmera no navegador.' })
    }
  }

  const pararCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setFaceStatus('idle')
    setMatricula('')
    setServidorNome('')
    setValidacao(null)
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

  // Passo 1: identificar biometricamente
  const handleCapturar = useCallback(async () => {
    if (faceStatus !== 'ready') return
    // Só bloqueia se explicitamente offline — 'checking' não impede (servidor pode estar respondendo)
    if (serverStatus === 'offline') {
      toast({ variant: 'destructive', title: 'Servidor sem resposta', description: 'Verifique a conexão e tente novamente.' })
      return
    }

    pauseHealthCheck() // pausa verificação de status durante processamento biométrico
    setFaceStatus('capturing')
    const blob = await capturarFrame()
    if (!blob) { resumeHealthCheck(); setFaceStatus('ready'); toast({ variant: 'destructive', title: 'Erro ao capturar imagem' }); return }

    try {
      const tenantId = tenantIdStore || (() => {
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
        setFaceStatus('ready')
        return
      }

      const response = await facialApi.identify(blob, tenantId)
      const { matricula: mat, nome } = response.data?.data || {}

      if (mat) {
        setMatricula(mat)
        if (nome) setServidorNome(nome)
        setFaceStatus('identified')

        // Passo 2: validar escala e horário imediatamente após identificar
        await handleValidar(mat)
      } else {
        setFaceStatus('not_found')
        setTimeout(() => setFaceStatus('ready'), 2500)
      }
    } catch (err: any) {
      if (err?.response?.status === 422) setFaceStatus('no_face')
      else setFaceStatus('not_found')
      setTimeout(() => setFaceStatus('ready'), 2500)
    } finally {
      resumeHealthCheck() // sempre retoma após processamento
    }
  }, [faceStatus, capturarFrame, serverStatus, tenantIdStore, pauseHealthCheck, resumeHealthCheck])

  // Captura automática: quando rosto presente por 800ms consecutivos, dispara identificação
  // useEffect DEVE ficar após handleCapturar para evitar ReferenceError
  useEffect(() => {
    if (rostoPresente && faceStatus === 'ready') {
      autoCapTimer.current = setTimeout(() => {
        handleCapturar()
      }, 800)
    } else {
      if (autoCapTimer.current) {
        clearTimeout(autoCapTimer.current)
        autoCapTimer.current = null
      }
    }
    return () => {
      if (autoCapTimer.current) {
        clearTimeout(autoCapTimer.current)
        autoCapTimer.current = null
      }
    }
  }, [rostoPresente, faceStatus, handleCapturar])

  // Passo 2: consultar backend para validar escala + horário
  const handleValidar = async (mat: string) => {
    setValidando(true)
    try {
      // SEGURANÇA: data e hora são derivadas do servidor — não enviamos do cliente
      const res   = await pontoApi.validarBatida({ servidorId: mat })
      setValidacao((res.data as any).data as ValidacaoBatida)
    } catch {
      // Falha na validação não bloqueia — exibe aviso genérico
      setValidacao({
        permitido: true,
        tipoBatida: 'entrada',
        horarioEsperado: null,
        aviso: {
          tipo: 'ATRASO',
          minutos: 0,
          mensagem:
            'Não foi possível verificar sua escala no momento. ' +
            'Se seu ponto estiver sendo registrado incorretamente, ' +
            'solicite à sua chefia imediata o ajuste manual.',
        },
      })
    } finally {
      setValidando(false)
    }
  }

  const resetar = () => {
    setMatricula('')
    setServidorNome('')
    setValidacao(null)
    setFaceStatus('ready')
  }

  // Passo 3: confirmar e registrar o ponto
  const handleBaterPonto = async () => {
    if (!matricula.trim()) return
    if (serverStatus === 'offline') {
      toast({ variant: 'destructive', title: 'Servidor indisponível', description: 'Não é possível registrar o ponto sem conexão.' })
      return
    }
    setLoading(true)
    try {
      // SEGURANÇA: não enviamos data/hora — o servidor usa new Date() internamente
      const response = await pontoApi.bater({ servidorId: matricula })
      const { tipo, registro } = (response.data as any).data || {}
      const tipoLabel = TIPO_BATIDA_LABEL[tipo] ?? tipo ?? 'batida'
      // Hora exibida: relógio sincronizado com o servidor (dataHora já tem o offset aplicado)
      const horaRegistrada = formatarHora(dataHora)
      setLastBatida({ servidor: matricula, nome: servidorNome, hora: horaRegistrada, tipo: tipoLabel })
      toast({ title: '✓ Ponto registrado!', description: `${servidorNome || matricula} — ${tipoLabel} às ${horaRegistrada}` })
      setMatricula('')
      setServidorNome('')
      setValidacao(null)
      setFaceStatus('ready')
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao registrar ponto', description: extractApiError(err) })
    } finally {
      setLoading(false)
    }
  }

  // Bloqueia confirmação se servidor não está escalado
  const podeConfirmar = validacao?.permitido === true

  return (
    <div className="min-h-screen bg-gradient-to-br from-gov-700 to-gov-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">

          {/* Header */}
          <div className="bg-gradient-to-r from-gov-500 to-gov-700 px-6 py-5 text-center text-white">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-5 h-5 opacity-80" />
              <span className="text-3xl font-bold font-mono tracking-widest">{formatarHora(dataHora)}</span>
            </div>
            <p className="text-gov-100 text-xs">{formatarData(dataHora)}</p>
            <div className="mt-3 flex items-center justify-center">
              <button onClick={recheck} title="Verificar conexão"
                className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-300 active:scale-95 touch-manipulation',
                  serverStatus === 'online'  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200' :
                  serverStatus === 'offline' ? 'bg-red-500/20 border-red-400/40 text-red-200 animate-pulse' :
                                               'bg-white/10 border-white/20 text-white/60')}>
                {serverStatus === 'online'   && <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><Wifi    className="w-3 h-3" /><span>Online{latency ? ` · ${latency}ms` : ''}</span></>}
                {serverStatus === 'offline'  && <><span className="w-1.5 h-1.5 rounded-full bg-red-400" />                  <WifiOff className="w-3 h-3" /><span>Servidor indisponível</span></>}
                {serverStatus === 'checking' && <><Loader2 className="w-3 h-3 animate-spin" /><span>Verificando...</span></>}
              </button>
            </div>
          </div>

          {/* Área da câmera */}
          <div className="relative bg-gray-950" style={{ aspectRatio: '4/3' }}>
            <video ref={videoRef}
              className={cn('w-full h-full object-cover transition-opacity duration-500', cameraAtiva ? 'opacity-100' : 'opacity-0')}
              muted playsInline />

            {!cameraAtiva && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500">
                <CameraOff className="w-12 h-12 opacity-40" />
                <p className="text-xs opacity-60">{faceStatus === 'starting' ? 'Iniciando câmera...' : 'Câmera desligada'}</p>
              </div>
            )}

            {cameraAtiva && <FaceMask status={faceStatus} rostoPresente={rostoPresente} skinRatio={skinRatio} />}

            {/* Badge nome identificado */}
        

            {faceStatus === 'starting' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gov-400 animate-spin" />
              </div>
            )}

            {cameraAtiva && (
              <div className="absolute bottom-4 inset-x-0 flex items-center justify-center">
                {/* Só mostra o botão de refazer após identificação — captura é automática */}
                {faceStatus === 'identified' && (
                  <button onClick={resetar}
                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 active:scale-90 transition-all touch-manipulation"
                    aria-label="Identificar outro servidor">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                {faceStatus === 'capturing' && (
                  <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-4 py-2">
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                    <span className="text-xs text-amber-300 font-medium">Identificando...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Painel inferior */}
          <div className="p-5 space-y-4">

            {!cameraAtiva && (
              <Button onClick={iniciarCamera} disabled={faceStatus === 'starting'}
                className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-gov-500 to-gov-700 hover:from-gov-600 hover:to-gov-800 text-white rounded-xl">
                {faceStatus === 'starting'
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sincronizando...</>
                  : <><Camera  className="w-4 h-4 mr-2" />Iniciar Câmera</>
                }
              </Button>
            )}

            {cameraAtiva && faceStatus === 'ready' && (
              <p className={cn('text-center text-xs transition-colors duration-300', rostoPresente ? 'text-emerald-600 font-medium' : 'text-gray-400')}>
                {rostoPresente ? '✓ Rosto detectado — identificando automaticamente...' : '👤 Posicione seu rosto dentro da área oval'}
              </p>
            )}

            {/* Spinner de validação de escala */}
            {validando && (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando escala...</span>
              </div>
            )}

            {/* Painel de validação — aparece após identificação */}
            {!validando && validacao && (
              <PainelValidacao
                validacao={validacao}
                onConfirmar={handleBaterPonto}
                onCancelar={resetar}
                loading={loading}
                nomeServidor={servidorNome}
                matricula={matricula}
              />
            )}

            {/* Offline — só exibe após confirmação real de falha de rede */}
            {serverStatus === 'offline' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-red-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-red-700">Servidor sem resposta</p>
                  <p className="text-xs text-red-600">Verifique a conexão de rede ou aguarde o servidor responder.</p>
                </div>
                <button onClick={recheck} className="text-xs text-red-500 underline underline-offset-2 shrink-0 touch-manipulation">Verificar</button>
              </div>
            )}

            {/* Último ponto registrado */}
            {lastBatida && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="text-xs text-emerald-700 space-y-0.5">
                  <p className="font-semibold text-emerald-900">Último ponto registrado</p>
                  <p>{lastBatida.nome} <span className="font-mono">({lastBatida.servidor})</span></p>
                  <p>{lastBatida.tipo} às <span className="font-mono font-semibold">{lastBatida.hora}</span></p>
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                A câmera captura seu rosto apenas para identificação. Nenhuma imagem é armazenada.
                Dados biométricos tratados conforme a <strong>LGPD</strong>.
              </p>
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
