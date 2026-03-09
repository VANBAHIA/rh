import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Plus, Filter, Download,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowUpDown, ArrowUp, ArrowDown,
  Eye, RefreshCw, Users,
  Camera, CameraOff, ScanFace, Loader2, CheckCircle2, X, UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SituacaoBadge } from '@/components/servidores/SituacaoBadge'
import { servidoresApi } from '@/services/servidores'
import type { ServidorResumo, SituacaoFuncional, VinculoEmpregaticio, ListaServidoresParams } from '@/types/servidor'
import { VINCULO_LABELS } from '@/types/servidor'
import { formatCurrency, formatDate, formatCPF, cn } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'

// ─────────────────────────────────────────────────────────────────────────────
// MÁSCARA FACIAL SVG
// ─────────────────────────────────────────────────────────────────────────────

const MASK = { cx: 50, cy: 60, rx: 28, ry: 38 }
type CaptureStatus = 'idle' | 'live' | 'captured' | 'uploading' | 'success' | 'error'

function FaceMaskSVG({ status }: { status: CaptureStatus }) {
  const strokeColor =
    status === 'success'  ? '#10b981' :
    status === 'error'    ? '#ef4444' :
    status === 'captured' ? '#f59e0b' : '#60a5fa'

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 133"
      preserveAspectRatio="none"
    >
      <defs>
        <mask id="bioMask">
          <rect width="100" height="133" fill="white" />
          <ellipse cx={MASK.cx} cy={MASK.cy} rx={MASK.rx} ry={MASK.ry} fill="black" />
        </mask>
        <filter id="bioGlow">
          <feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Escurecer fora da elipse */}
      <rect width="100" height="133" fill="rgba(0,0,0,0.52)" mask="url(#bioMask)" />

      {/* Contorno oval */}
      <ellipse
        cx={MASK.cx} cy={MASK.cy} rx={MASK.rx} ry={MASK.ry}
        fill="none" stroke={strokeColor} strokeWidth="0.5"
        filter="url(#bioGlow)"
        style={{ transition: 'stroke 0.4s ease' }}
      />

      {/* Marcadores nos extremos */}
      {[
        { x1: MASK.cx - 5, y1: MASK.cy - MASK.ry,   x2: MASK.cx + 5, y2: MASK.cy - MASK.ry   },
        { x1: MASK.cx - 5, y1: MASK.cy + MASK.ry,   x2: MASK.cx + 5, y2: MASK.cy + MASK.ry   },
        { x1: MASK.cx - MASK.rx, y1: MASK.cy - 4,   x2: MASK.cx - MASK.rx, y2: MASK.cy + 4   },
        { x1: MASK.cx + MASK.rx, y1: MASK.cy - 4,   x2: MASK.cx + MASK.rx, y2: MASK.cy + 4   },
      ].map((l, i) => (
        <line
          key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round"
          filter="url(#bioGlow)" style={{ transition: 'stroke 0.4s ease' }}
        />
      ))}

      {/* Instrução */}
      {status === 'live' && (
        <text
          x={MASK.cx} y={MASK.cy + MASK.ry + 7}
          textAnchor="middle" fill="white" fontSize="3.8"
          opacity="0.9" fontFamily="system-ui, sans-serif"
        >
          Centralize o rosto na área oval
        </text>
      )}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL DE BIOMETRIA FACIAL
// ─────────────────────────────────────────────────────────────────────────────

interface BiometriaFacialModalProps {
  servidor: ServidorResumo & { biometriaFacial?: { cadastrada: boolean; atualizadaEm: string } | null }
  onClose: () => void
  onUploaded?: () => void
}

function BiometriaFacialModal({ servidor, onClose, onUploaded }: BiometriaFacialModalProps) {
  const [status, setStatus]     = useState<CaptureStatus>('idle')
  const [captured, setCaptured] = useState<string | null>(null)
  const [camError, setCamError] = useState<string | null>(null)

  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const temBiometria = !!servidor.biometriaFacial?.cadastrada

  const handleClose = () => { pararStream(); onClose() }

  useEffect(() => {
    iniciarCamera()
    return () => pararStream()
  }, []) // eslint-disable-line

  const pararStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const iniciarCamera = async () => {
    setCamError(null)
    setStatus('idle')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('live')
    } catch {
      setCamError('Não foi possível acessar a câmera. Verifique as permissões do navegador.')
      setStatus('error')
    }
  }

  const handleCapture = () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth  || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    setCaptured(canvas.toDataURL('image/jpeg', 0.9))
    setStatus('captured')
    pararStream()
  }

  const handleRefazer = () => {
    setCaptured(null)
    setStatus('idle')
    iniciarCamera()
  }

  const handleEnviar = async () => {
    if (!canvasRef.current) return
    setStatus('uploading')
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) {
        toast({ variant: 'destructive', title: 'Erro ao capturar imagem', description: 'Tente novamente.' })
        setStatus('captured')
        return
      }
      const formData = new FormData()
      formData.append('biometria', blob, 'biometria.jpg')
      try {
        await servidoresApi.uploadBiometriaFacial(servidor.id, formData)
        setStatus('success')
        onUploaded?.()
        setTimeout(() => onClose(), 1500)
      } catch (err) {
        toast({ variant: 'destructive', title: 'Erro ao salvar biometria', description: extractApiError(err) })
        setStatus('captured')
      }
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-gov-500 to-gov-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-base">
              {temBiometria ? 'Atualizar Biometria Facial' : 'Cadastrar Biometria Facial'}
            </h2>
            <p className="text-gov-100 text-xs mt-0.5 truncate max-w-[220px]">{servidor.nome}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas oculto */}
        <canvas ref={canvasRef} className="hidden" />

        <div className="p-5 space-y-4">

          {/* Área câmera / preview */}
          <div className="relative rounded-xl overflow-hidden bg-gray-900 border-2 border-gov-100" style={{ height: '320px' }}>

            {/* Vídeo */}
            <video
              ref={videoRef}
              className={cn(
                'w-full h-full object-cover transition-opacity duration-300',
                status === 'live' ? 'opacity-100' : 'opacity-0 absolute inset-0'
              )}
              muted playsInline
            />

            {/* Preview capturado */}
            {captured && (
              <img src={captured} alt="Captura facial" className="w-full h-full object-cover" />
            )}

            {/* Máscara oval */}
            {status === 'live' && <FaceMaskSVG status={status} />}

            {/* Overlay: iniciando */}
            {status === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-xs">Iniciando câmera...</p>
              </div>
            )}

            {/* Overlay: erro de câmera */}
            {status === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 gap-3 px-6 text-center">
                <CameraOff className="w-10 h-10" />
                <p className="text-xs leading-relaxed">{camError}</p>
              </div>
            )}

            {/* Overlay: salvando */}
            {status === 'uploading' && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
                <p className="text-white text-sm font-medium">Salvando biometria...</p>
              </div>
            )}

            {/* Overlay: sucesso */}
            {status === 'success' && (
              <div className="absolute inset-0 bg-emerald-900/60 flex flex-col items-center justify-center gap-3">
                <div className="bg-emerald-500 rounded-full p-3 shadow-lg">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <p className="text-white font-semibold text-sm">Biometria salva com sucesso!</p>
              </div>
            )}

            {/* Badge AO VIVO */}
            {status === 'live' && (
              <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white text-[10px] font-semibold tracking-wide">AO VIVO</span>
              </div>
            )}

            {/* Badge CAPTURADO */}
            {status === 'captured' && (
              <div className="absolute top-2 left-2 bg-amber-500/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1.5">
                <Camera className="w-3 h-3 text-white" />
                <span className="text-white text-[10px] font-semibold tracking-wide">CAPTURADO</span>
              </div>
            )}
          </div>

          {/* Aviso de substituição */}
          {temBiometria && servidor.biometriaFacial?.atualizadaEm && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex items-start gap-2.5 text-xs text-amber-700">
              <ScanFace className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Biometria cadastrada em{' '}
                <strong>{new Date(servidor.biometriaFacial.atualizadaEm).toLocaleDateString('pt-BR')}</strong>.
                {' '}Ao confirmar, a biometria atual será substituída.
              </span>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2">

            {status === 'live' && (
              <>
                <Button
                  onClick={handleCapture}
                  className="flex-1 bg-gov-600 hover:bg-gov-700 text-white"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {temBiometria ? 'Capturar nova foto' : 'Capturar foto'}
                </Button>
                <Button onClick={handleClose} variant="outline" className="border-gray-300 text-gray-600">
                  Cancelar
                </Button>
              </>
            )}

            {status === 'captured' && (
              <>
                <Button
                  onClick={handleEnviar}
                  className="flex-1 bg-gov-600 hover:bg-gov-700 text-white"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Confirmar e salvar
                </Button>
                <Button onClick={handleRefazer} variant="outline" className="border-gray-300 text-gray-600">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refazer
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <Button
                  onClick={iniciarCamera}
                  className="flex-1 bg-gov-600 hover:bg-gov-700 text-white"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Tentar novamente
                </Button>
                <Button onClick={handleClose} variant="outline" className="border-gray-300 text-gray-600">
                  Cancelar
                </Button>
              </>
            )}

            {['idle', 'uploading', 'success'].includes(status) && (
              <Button disabled className="flex-1" variant="outline">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {status === 'uploading' ? 'Salvando...' : 'Aguarde...'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS AUXILIARES
// ─────────────────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function SortIcon({ field, current, order }: { field: string; current: string; order: 'asc' | 'desc' }) {
  if (current !== field) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />
  return order === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-gov-600" />
    : <ArrowDown className="w-3.5 h-3.5 ml-1 text-gov-600" />
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" style={{ width: `${60 + Math.random() * 40}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <tr>
      <td colSpan={8}>
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">Nenhum servidor encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros ou a busca.</p>
          </div>
          <Button variant="outline" size="sm" onClick={onClear}>Limpar filtros</Button>
        </div>
      </td>
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const LIMIT_OPTIONS = [10, 25, 50, 100]

export default function ServidoresPage() {
  const navigate = useNavigate()

  const [search,   setSearch]   = useState('')
  const [situacao, setSituacao] = useState<SituacaoFuncional | ''>('')
  const [vinculo,  setVinculo]  = useState<VinculoEmpregaticio | ''>('')
  const [page,     setPage]     = useState(1)
  const [limit,    setLimit]    = useState(25)
  const [orderBy,  setOrderBy]  = useState('nome')
  const [order,    setOrder]    = useState<'asc' | 'desc'>('asc')

  const [servidores, setServidores] = useState<ServidorResumo[]>([])
  const [meta,       setMeta]       = useState({ total: 0, page: 1, limit: 25, totalPages: 1 })
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  const [showBiometriaModal, setShowBiometriaModal] = useState<{ servidor: any } | null>(null)

  const debouncedSearch = useDebounce(search, 400)

  const fetchServidores = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: ListaServidoresParams = {
        page, limit, orderBy, order,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(situacao && { situacao }),
        ...(vinculo  && { vinculo }),
      }
      const { data: res } = await servidoresApi.listar(params)
      setServidores(res.data)
      setMeta(res.meta)
    } catch (err) {
      const msg = extractApiError(err)
      setError(msg)
      toast({ variant: 'destructive', title: 'Erro ao carregar servidores', description: msg })
    } finally {
      setLoading(false)
    }
  }, [page, limit, orderBy, order, debouncedSearch, situacao, vinculo])

  useEffect(() => { fetchServidores() }, [fetchServidores])
  useEffect(() => { setPage(1) }, [debouncedSearch, situacao, vinculo, limit])

  const handleSort = (field: string) => {
    if (orderBy === field) setOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setOrderBy(field); setOrder('asc') }
    setPage(1)
  }

  const clearFilters = () => { setSearch(''); setSituacao(''); setVinculo(''); setPage(1) }
  const hasFilters = search || situacao || vinculo

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Modal de Biometria Facial */}
      {showBiometriaModal && (
        <BiometriaFacialModal
          servidor={showBiometriaModal.servidor}
          onClose={() => setShowBiometriaModal(null)}
          onUploaded={() => fetchServidores()}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Servidores</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {meta.total > 0
              ? `${meta.total.toLocaleString('pt-BR')} servidor${meta.total !== 1 ? 'es' : ''} cadastrado${meta.total !== 1 ? 's' : ''}`
              : 'Carregando...'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchServidores} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button variant="gov" size="sm" onClick={() => navigate('/servidores/novo')}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Servidor
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Nome, matrícula, CPF..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <Select value={situacao || 'todas'} onValueChange={v => setSituacao(v === 'todas' ? '' : v as SituacaoFuncional)}>
            <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="Situação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as situações</SelectItem>
              <SelectItem value="ATIVO">Ativo</SelectItem>
              <SelectItem value="LICENCA">Licença</SelectItem>
              <SelectItem value="AFASTADO">Afastado</SelectItem>
              <SelectItem value="CEDIDO">Cedido</SelectItem>
              <SelectItem value="APOSENTADO">Aposentado</SelectItem>
              <SelectItem value="EXONERADO">Exonerado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={vinculo || 'todos'} onValueChange={v => setVinculo(v === 'todos' ? '' : v as VinculoEmpregaticio)}>
            <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="Vínculo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os vínculos</SelectItem>
              {Object.entries(VINCULO_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground h-9">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              Limpar
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Linhas:</span>
            <Select value={String(limit)} onValueChange={v => setLimit(Number(v))}>
              <SelectTrigger className="h-9 w-16 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LIMIT_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {[
                  { field: 'matricula',   label: 'Matrícula',   width: 'w-28' },
                  { field: 'nome',        label: 'Nome',        width: ''     },
                  { field: 'cargo',       label: 'Cargo',       width: 'w-52' },
                  { field: 'lotacao',     label: 'Lotação',     width: 'w-48' },
                  { field: 'situacao',    label: 'Situação',    width: 'w-32' },
                  { field: 'salarioBase', label: 'Salário Base',width: 'w-36' },
                  { field: 'dataAdmissao',label: 'Admissão',    width: 'w-28' },
                ].map(({ field, label, width }) => (
                  <th
                    key={field}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none',
                      width
                    )}
                    onClick={() => handleSort(field)}
                  >
                    <span className="flex items-center">
                      {label}
                      <SortIcon field={field} current={orderBy} order={order} />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 w-40 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
                  Biometria
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton />
              ) : error ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                      <p className="text-destructive font-medium">Erro ao carregar dados</p>
                      <p className="text-sm text-muted-foreground">{error}</p>
                      <Button variant="outline" size="sm" onClick={fetchServidores}>Tentar novamente</Button>
                    </div>
                  </td>
                </tr>
              ) : servidores.length === 0 ? (
                <EmptyState onClear={clearFilters} />
              ) : (
                servidores.map((s, i) => (
                  <tr
                    key={s.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/servidores/${s.id}`)}
                    style={{ animationDelay: `${i * 0.02}s` }}
                  >
                    {/* Matrícula */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gov-600 font-medium">{s.matricula}</span>
                    </td>

                    {/* Nome */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gov-100 border border-gov-200 flex items-center justify-center shrink-0 text-gov-700 text-xs font-semibold">
                          {s.nome.split(' ').slice(0, 2).map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{s.nome}</p>
                          <p className="text-xs text-muted-foreground font-mono">{s.cpf ? formatCPF(s.cpf) : '—'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Cargo */}
                    <td className="px-4 py-3">
                      <p className="text-foreground/90 text-sm leading-tight">{s.vinculos[0]?.cargo?.nome ?? '—'}</p>
                      {(s.vinculos[0]?.nivelSalarial?.nivel || s.vinculos[0]?.nivelSalarial?.classe) && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {[
                            s.vinculos[0]?.nivelSalarial?.nivel  && `Nível ${s.vinculos[0].nivelSalarial.nivel}`,
                            s.vinculos[0]?.nivelSalarial?.classe && `Classe ${s.vinculos[0].nivelSalarial.classe}`,
                          ].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </td>

                    {/* Lotação */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground/90 leading-tight">{s.vinculos[0]?.lotacao?.nome ?? '—'}</p>
                      {s.vinculos[0]?.lotacao?.sigla && (
                        <p className="text-xs text-muted-foreground mt-0.5">{s.vinculos[0].lotacao.sigla}</p>
                      )}
                    </td>

                    {/* Situação */}
                    <td className="px-4 py-3">
                      {s.vinculos[0]?.situacaoFuncional
                        ? <SituacaoBadge situacao={s.vinculos[0].situacaoFuncional} />
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>

                    {/* Salário */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-foreground/90">
                        {s.vinculos[0]?.nivelSalarial?.vencimentoBase != null
                          ? formatCurrency(s.vinculos[0].nivelSalarial.vencimentoBase) : '—'}
                      </span>
                    </td>

                    {/* Admissão */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {s.vinculos[0]?.dataAdmissao ? formatDate(s.vinculos[0].dataAdmissao) : '—'}
                      </span>
                    </td>

                    {/* Biometria */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {/* Ver perfil — visível no hover */}
                        <Button
                          variant="ghost" size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 shrink-0"
                          title="Ver perfil"
                          onClick={e => { e.stopPropagation(); navigate(`/servidores/${s.id}`) }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {/* Badge biometria */}
                        <button
                          className={cn(
                            'flex flex-col items-center gap-0 px-2 py-1 rounded-lg text-xs font-medium border transition-all shrink-0',
                            (s as any).biometriaFacial
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                          )}
                          title={(s as any).biometriaFacial
                            ? 'Biometria cadastrada — clique para atualizar'
                            : 'Biometria não cadastrada — clique para cadastrar'}
                          onClick={e => { e.stopPropagation(); setShowBiometriaModal({ servidor: s }) }}
                        >
                          <span className="flex items-center gap-1">
                            <ScanFace className="w-3 h-3" />
                            {(s as any).biometriaFacial ? 'Cadastrada' : 'Pendente'}
                          </span>
                          {(s as any).biometriaFacial?.atualizadaEm && (
                            <span className="text-[10px] opacity-60 font-mono">
                              {new Date((s as any).biometriaFacial.atualizadaEm).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {!loading && servidores.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
            <p className="text-xs text-muted-foreground">
              Mostrando {((page - 1) * limit) + 1}–{Math.min(page * limit, meta.total)} de{' '}
              <span className="font-medium text-foreground">{meta.total.toLocaleString('pt-BR')}</span> servidores
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={page === 1}>
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                  let p: number
                  if (meta.totalPages <= 5)             p = i + 1
                  else if (page <= 3)                   p = i + 1
                  else if (page >= meta.totalPages - 2) p = meta.totalPages - 4 + i
                  else                                  p = page - 2 + i
                  return (
                    <Button key={p} variant={page === p ? 'gov' : 'outline'} size="icon"
                      className="h-8 w-8 text-xs" onClick={() => setPage(p)}>
                      {p}
                    </Button>
                  )
                })}
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => p + 1)} disabled={page >= meta.totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(meta.totalPages)} disabled={page >= meta.totalPages}>
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
