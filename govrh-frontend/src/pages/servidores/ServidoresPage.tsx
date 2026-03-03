// Removido: JSX e hooks fora do componente principal
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Plus,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  RefreshCw,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SituacaoBadge } from '@/components/servidores/SituacaoBadge'
import { servidoresApi } from '@/services/servidores'
import type { ServidorResumo, SituacaoFuncional, VinculoEmpregaticio, ListaServidoresParams } from '@/types/servidor'
import { VINCULO_LABELS } from '@/types/servidor'
import { formatCurrency, formatDate, formatCPF } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'

// Modal de Biometria Facial
interface BiometriaFacialModalProps {
  servidor: ServidorResumo & { biometriaFacial?: { cadastrada: boolean; atualizadaEm: string } | null }
  onClose: () => void
  onUploaded?: () => void
}

function BiometriaFacialModal({ servidor, onClose, onUploaded }: BiometriaFacialModalProps) {
  const [loading, setLoading] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [debugMsg, setDebugMsg] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!videoRef.current) {
      setDebugMsg("Webcam não inicializada: videoRef nulo.");
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        videoRef.current!.srcObject = stream;
        videoRef.current!.play();
        setDebugMsg("Webcam inicializada com sucesso.");
      })
      .catch(err => {
        setDebugMsg("Erro ao acessar webcam: " + err.message);
      });
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current) {
      setDebugMsg("Erro: videoRef nulo ao capturar.");
      return;
    }
    if (!canvasRef.current) {
      setDebugMsg("Erro: canvasRef nulo ao capturar.");
      return;
    }
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) {
      setDebugMsg("Erro: não foi possível obter contexto do canvas.");
      return;
    }
    ctx.drawImage(videoRef.current, 0, 0, 320, 240);
    const dataUrl = canvasRef.current.toDataURL('image/jpeg');
    setCaptured(dataUrl);
    setDebugMsg("Imagem capturada com sucesso.");
  };

  const handleUpload = async () => {
    if (!canvasRef.current) return;
    setLoading(true);
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) {
        toast({ variant: 'destructive', title: 'Erro ao capturar imagem', description: 'Não foi possível gerar o blob da imagem. Tente novamente.' });
        setLoading(false);
        return;
      }
      const formData = new FormData();
      formData.append('biometria', blob, 'biometria.jpg');
      try {
        await servidoresApi.uploadBiometriaFacial(servidor.id, formData);
        setSuccess(true);
        onUploaded && onUploaded();
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1200);
      } catch (err) {
        toast({ variant: 'destructive', title: 'Erro ao salvar biometria', description: extractApiError(err) });
      } finally {
        setLoading(false);
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-xl w-full max-w-sm relative">
        <h2 className="text-lg font-bold mb-4">{servidor.biometriaFacial?.cadastrada ? 'Atualizar captura facial' : 'Cadastro de Biometria Facial'}</h2>

        {/* Canvas sempre no DOM — canvasRef nunca fica desanexado */}
        <canvas ref={canvasRef} width={320} height={240} style={{ display: 'none' }} />

        {!captured ? (
          <div className="flex flex-col items-center">
            <video ref={videoRef} width={320} height={240} className="rounded border mb-2" />
            {debugMsg && (
              <div className="text-xs text-red-600 mt-2">{debugMsg}</div>
            )}
            <div className="flex w-full justify-between mt-4">
              <button className="btn" type="button" style={{ marginLeft: 0 }} onClick={handleCapture}>
                {servidor.biometriaFacial ? 'Atualizar captura' : 'Capturar'}
              </button>
              <button className="btn-secondary" type="button" style={{ marginRight: 0 }} onClick={onClose}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <img src={captured} alt="Captura" className="rounded border mb-2" />
            {debugMsg && (
              <div className="text-xs text-blue-600 mt-2">{debugMsg}</div>
            )}
            <div className="flex w-full justify-between mt-4">
              <button className="btn" type="button" disabled={loading} onClick={handleUpload}>
                {loading ? 'Enviando...' : 'Enviar'}
              </button>
              <button className="btn-secondary" type="button" onClick={() => { setCaptured(null); setDebugMsg(""); }}>Refazer</button>
            </div>
            {success && (
              <div className="text-green-600 font-semibold mt-2">Captura realizada com sucesso!</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Componentes auxiliares ─────────────────────────────────────────────────

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
          {Array.from({ length: 7 }).map((_, j) => (
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
      <td colSpan={7}>
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">Nenhum servidor encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tente ajustar os filtros ou a busca.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClear}>
            Limpar filtros
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ── Página principal ───────────────────────────────────────────────────────

const LIMIT_OPTIONS = [10, 25, 50, 100]

export default function ServidoresPage() {
  const navigate = useNavigate()

  // Estado de filtros
  const [search, setSearch] = useState('')
  const [situacao, setSituacao] = useState<SituacaoFuncional | ''>('')
  const [vinculo, setVinculo] = useState<VinculoEmpregaticio | ''>('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [orderBy, setOrderBy] = useState('nome')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')

  // Estado de dados
  const [servidores, setServidores] = useState<ServidorResumo[]>([])
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estado do modal de biometria facial
  const [showBiometriaModal, setShowBiometriaModal] = useState<{ servidor: any } | null>(null);

  const debouncedSearch = useDebounce(search, 400)

  // ── Fetch ───────────────────────────────────────────────────────────────

  const fetchServidores = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: ListaServidoresParams = {
        page,
        limit,
        orderBy,
        order,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(situacao && { situacao }),
        ...(vinculo && { vinculo }),
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

  useEffect(() => {
    fetchServidores()
  }, [fetchServidores])

  // Volta para page 1 ao mudar filtros
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, situacao, vinculo, limit])

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleSort = (field: string) => {
    if (orderBy === field) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setOrderBy(field)
      setOrder('asc')
    }
    setPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setSituacao('')
    setVinculo('')
    setPage(1)
  }

  const hasFilters = search || situacao || vinculo

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Modal de Biometria Facial */}
      {showBiometriaModal && (
        <BiometriaFacialModal
          servidor={showBiometriaModal.servidor}
          onClose={() => setShowBiometriaModal(null)}
          onUploaded={() => { fetchServidores(); }}
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
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
          {/* Busca */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Nome, matrícula, CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Situação */}
          <Select
            value={situacao || 'todas'}
            onValueChange={(v) => setSituacao(v === 'todas' ? '' : (v as SituacaoFuncional))}
          >
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
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

          {/* Vínculo */}
          <Select
            value={vinculo || 'todos'}
            onValueChange={(v) => setVinculo(v === 'todos' ? '' : (v as VinculoEmpregaticio))}
          >
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue placeholder="Vínculo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os vínculos</SelectItem>
              {Object.entries(VINCULO_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Limpar filtros */}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground h-9">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              Limpar
            </Button>
          )}

          {/* Itens por página */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Linhas:</span>
            <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger className="h-9 w-16 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIMIT_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
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
                  { field: 'matricula', label: 'Matrícula', width: 'w-28' },
                  { field: 'nome', label: 'Nome', width: '' },
                  { field: 'cargo', label: 'Cargo', width: 'w-52' },
                  { field: 'lotacao', label: 'Lotação', width: 'w-48' },
                  { field: 'situacao', label: 'Situação', width: 'w-32' },
                  { field: 'salarioBase', label: 'Salário Base', width: 'w-36' },
                  { field: 'dataAdmissao', label: 'Admissão', width: 'w-28' },
                ].map(({ field, label, width }) => (
                  <th
                    key={field}
                    className={`px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none ${width}`}
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
                      <Button variant="outline" size="sm" onClick={fetchServidores}>
                        Tentar novamente
                      </Button>
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
                      <span className="font-mono text-xs text-gov-600 font-medium">
                        {s.matricula}
                      </span>
                    </td>

                    {/* Nome */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gov-100 border border-gov-200 flex items-center justify-center shrink-0 text-gov-700 text-xs font-semibold">
                          {s.nome.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{s.nome}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {s.cpf ? formatCPF(s.cpf) : '—'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Cargo */}
                    <td className="px-4 py-3">
                      <p className="text-foreground/90 text-sm leading-tight">{s.vinculos[0]?.cargo?.nome ?? '—'}</p>
                      {(s.vinculos[0]?.nivelSalarial?.nivel || s.vinculos[0]?.nivelSalarial?.classe) && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {[
                            s.vinculos[0]?.nivelSalarial?.nivel && `Nível ${s.vinculos[0].nivelSalarial.nivel}`,
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
                        : <span className="text-muted-foreground text-xs">—</span>
                      }
                    </td>

                    {/* Salário */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-foreground/90">
                        {s.vinculos[0]?.nivelSalarial?.vencimentoBase != null
                          ? formatCurrency(s.vinculos[0].nivelSalarial.vencimentoBase)
                          : '—'}
                      </span>
                    </td>

                    {/* Data admissão */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {s.vinculos[0]?.dataAdmissao ? formatDate(s.vinculos[0].dataAdmissao) : '—'}
                      </span>
                    </td>

                    {/* Ação + Status Biometria */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {/* Botão ver perfil — visível no hover */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 shrink-0"
                          title="Ver perfil"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/servidores/${s.id}`)
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {/* Status biometria — sempre visível */}
                        <button
                          className={[
                            'flex flex-col items-center gap-0.5 px-2 py-1 rounded-full text-xs font-medium border transition-colors shrink-0',
                            s.biometriaFacial
                              ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                              : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
                          ].join(' ')}
                          title={s.biometriaFacial ? 'Biometria cadastrada — clique para atualizar' : 'Biometria não cadastrada — clique para cadastrar'}
                          onClick={e => { e.stopPropagation(); setShowBiometriaModal({ servidor: s }) }}
                        >
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {s.biometriaFacial ? 'Cadastrada' : 'Pendente'}
                          </span>
                          {s.biometriaFacial?.atualizadaEm && (
                            <span className="text-[10px] opacity-70 font-mono">
                              {new Date(s.biometriaFacial.atualizadaEm).toLocaleDateString('pt-BR')}
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
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {/* Páginas */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                  let p: number
                  if (meta.totalPages <= 5) {
                    p = i + 1
                  } else if (page <= 3) {
                    p = i + 1
                  } else if (page >= meta.totalPages - 2) {
                    p = meta.totalPages - 4 + i
                  } else {
                    p = page - 2 + i
                  }
                  return (
                    <Button
                      key={p}
                      variant={page === p ? 'gov' : 'outline'}
                      size="icon"
                      className="h-8 w-8 text-xs"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= meta.totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(meta.totalPages)}
                disabled={page >= meta.totalPages}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
