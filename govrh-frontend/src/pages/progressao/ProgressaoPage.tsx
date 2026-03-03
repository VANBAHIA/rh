import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, RefreshCw, CheckSquare, Square, ChevronRight,
  Users, Loader2, AlertCircle, Info, Clock, ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { progressaoApi } from '@/services/progressao'
import type { ServidorApto, TipoProgressao, ProgressaoRegistro } from '@/types/progressao'
import { TIPO_PROGRESSAO_LABELS, STATUS_PROGRESSAO_LABELS } from '@/types/progressao'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'

// ── Tipos de tabs ──────────────────────────────────────────────────────────

type Tab = 'aptos' | 'historico'

// ── Status badge ──────────────────────────────────────────────────────────

const STATUS_STYLES = {
  PENDENTE:  'bg-amber-100 text-amber-700 border-amber-200',
  APROVADA:  'bg-blue-100 text-blue-700 border-blue-200',
  REJEITADA: 'bg-red-100 text-red-600 border-red-200',
  APLICADA:  'bg-emerald-100 text-emerald-700 border-emerald-200',
}

function StatusBadge({ status }: { status: keyof typeof STATUS_STYLES }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', STATUS_STYLES[status])}>
      {STATUS_PROGRESSAO_LABELS[status]}
    </span>
  )
}

// ── Tipo badge ────────────────────────────────────────────────────────────

const TIPO_COLORS: Record<TipoProgressao, string> = {
  HORIZONTAL:         'bg-gov-100 text-gov-700 border-gov-200',
  VERTICAL_TITULACAO: 'bg-purple-100 text-purple-700 border-purple-200',
  ENQUADRAMENTO:      'bg-amber-100 text-amber-700 border-amber-200',
  PROMOCAO:           'bg-emerald-100 text-emerald-700 border-emerald-200',
}

function TipoBadge({ tipo }: { tipo: TipoProgressao }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wide', TIPO_COLORS[tipo])}>
      {tipo === 'HORIZONTAL' ? 'Horizontal' :
       tipo === 'VERTICAL_TITULACAO' ? 'Vertical' :
       tipo === 'ENQUADRAMENTO' ? 'Enquadramento' : 'Promoção'}
    </span>
  )
}

// ── Modal Confirmar Lote ──────────────────────────────────────────────────

function ModalLote({
  selecionados,
  aptos,
  tipo,
  onClose,
  onSuccess,
}: {
  selecionados: string[]
  aptos: ServidorApto[]
  tipo: TipoProgressao
  onClose: () => void
  onSuccess: () => void
}) {
  const [dataEfetivacao, setDataEfetivacao] = useState(new Date().toISOString().split('T')[0])
  const [observacao, setObservacao] = useState('')
  const [processing, setProcessing] = useState(false)

  const servidoresSel = aptos.filter((a) => selecionados.includes(a.servidorId))

  const handleSubmit = async () => {
    setProcessing(true)
    try {
      const { data: res } = await progressaoApi.lote({ tipo, servidorIds: selecionados, dataEfetivacao, observacao })
      toast({
        title: 'Lote processado!',
        description: `${res.data.processados} progressões aplicadas, ${res.data.erros} erro(s).`,
      })
      onSuccess()
      onClose()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="bg-[#0f1629] px-6 py-4">
          <h2 className="text-white font-semibold">Confirmar Progressão em Lote</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            {selecionados.length} servidor{selecionados.length !== 1 ? 'es' : ''} selecionado{selecionados.length !== 1 ? 's' : ''}
            · {TIPO_PROGRESSAO_LABELS[tipo]}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Lista resumida */}
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border/50">
            {servidoresSel.slice(0, 10).map((a) => (
              <div key={a.servidorId} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-foreground text-xs">{a.nome}</p>
                  <p className="text-muted-foreground text-[10px] font-mono">{a.matricula}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-muted-foreground">{a.classeAtual ?? a.nivelAtual ?? '—'}</span>
                  <ArrowRight className="w-3 h-3 text-gov-500" />
                  <span className="text-gov-700 font-semibold">{a.classeProxima ?? a.nivelProximo ?? '—'}</span>
                </div>
              </div>
            ))}
            {servidoresSel.length > 10 && (
              <div className="px-3 py-2 text-xs text-center text-muted-foreground">
                +{servidoresSel.length - 10} servidores adicionais
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Data de efetivação</label>
            <input
              type="date"
              value={dataEfetivacao}
              onChange={(e) => setDataEfetivacao(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Observação (opcional)</label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              placeholder="Ex: Progressão referente ao interstício de 24 meses — Portaria XX/2026"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="flex gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Esta ação alterará o nível/classe e salário dos servidores selecionados. Essa operação é registrada no histórico funcional.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose} disabled={processing}>Cancelar</Button>
            <Button variant="gov" onClick={handleSubmit} disabled={processing} className="min-w-[140px]">
              {processing
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Aplicando...</>
                : <><TrendingUp className="w-4 h-4 mr-2" />Aplicar Progressões</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Aba Aptos ─────────────────────────────────────────────────────────────

function TabAptos() {
  const navigate = useNavigate()
  const [aptos, setAptos] = useState<ServidorApto[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTipo, setFilterTipo] = useState<TipoProgressao | ''>('')
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [showModal, setShowModal] = useState(false)

  const fetchAptos = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await progressaoApi.aptos(filterTipo || undefined)
      setAptos(res.data)
      setSelecionados([])
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setLoading(false)
    }
  }, [filterTipo])

  useEffect(() => { fetchAptos() }, [fetchAptos])

  const aptosVisiveis = aptos.filter((a) => !filterTipo || a.tipo === filterTipo)
  const todosSelecionados = aptosVisiveis.length > 0 && aptosVisiveis.every((a) => selecionados.includes(a.servidorId))
  const tipoSelecionado = selecionados.length > 0 ? aptos.find((a) => selecionados.includes(a.servidorId))?.tipo : undefined

  const toggleTodos = () => {
    if (todosSelecionados) {
      setSelecionados([])
    } else {
      setSelecionados(aptosVisiveis.map((a) => a.servidorId))
    }
  }

  const toggleItem = (id: string, tipo: TipoProgressao) => {
    // Só permite selecionar mesmo tipo
    if (selecionados.includes(id)) {
      setSelecionados((prev) => prev.filter((s) => s !== id))
    } else {
      if (tipoSelecionado && tipoSelecionado !== tipo) {
        toast({ title: 'Atenção', description: 'Selecione servidores do mesmo tipo de progressão para processamento em lote.' })
        return
      }
      setSelecionados((prev) => [...prev, id])
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtro + ações */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterTipo || 'todos'} onValueChange={(v) => setFilterTipo(v === 'todos' ? '' : v as TipoProgressao)}>
          <SelectTrigger className="h-9 w-56 text-sm">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPO_PROGRESSAO_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={fetchAptos} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Atualizar
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {selecionados.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selecionados.length} selecionado{selecionados.length !== 1 ? 's' : ''}
              </span>
              <Button variant="gov" size="sm" onClick={() => setShowModal(true)}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Aplicar em Lote
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info */}
      {!loading && aptosVisiveis.length > 0 && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-xs">
            <strong>{aptosVisiveis.length}</strong> servidor{aptosVisiveis.length !== 1 ? 'es aptos' : ' apto'} para progressão.
            Selecione servidores do mesmo tipo para processamento em lote.
          </p>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleTodos} className="text-muted-foreground hover:text-foreground">
                    {todosSelecionados ? <CheckSquare className="w-4 h-4 text-gov-600" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                {['Servidor', 'Tipo', 'Posição atual', 'Próxima posição', 'Aumento', 'Apto desde', 'Ação'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : aptosVisiveis.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="text-center py-16 text-muted-foreground">
                      <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">Nenhum servidor apto no momento</p>
                      <p className="text-xs mt-1">Os servidores aptos aparecem aqui automaticamente.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                aptosVisiveis.map((apto) => {
                  const isSel = selecionados.includes(apto.servidorId)
                  return (
                    <tr
                      key={apto.servidorId}
                      className={cn(
                        'border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer',
                        isSel && 'bg-gov-50/60',
                      )}
                      onClick={() => toggleItem(apto.servidorId, apto.tipo)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleItem(apto.servidorId, apto.tipo)}>
                          {isSel
                            ? <CheckSquare className="w-4 h-4 text-gov-600" />
                            : <Square className="w-4 h-4 text-muted-foreground" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground text-sm">{apto.nome}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{apto.matricula} · {apto.cargo}</p>
                      </td>
                      <td className="px-4 py-3"><TipoBadge tipo={apto.tipo} /></td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-foreground">
                          {[apto.nivelAtual && `N.${apto.nivelAtual}`, apto.classeAtual && `Cl.${apto.classeAtual}`].filter(Boolean).join(' ') || '—'}
                        </span>
                        <p className="text-[11px] text-muted-foreground">{formatCurrency(apto.salarioAtual)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-gov-500 shrink-0" />
                          <div>
                            <span className="font-mono text-sm text-gov-700 font-semibold">
                              {[apto.nivelProximo && `N.${apto.nivelProximo}`, apto.classeProxima && `Cl.${apto.classeProxima}`].filter(Boolean).join(' ') || '—'}
                            </span>
                            <p className="text-[11px] text-muted-foreground">{formatCurrency(apto.salarioProximo)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-emerald-700">
                          +{apto.percentualAumento.toFixed(1)}%
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          +{formatCurrency(apto.salarioProximo - apto.salarioAtual)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{formatDate(apto.dataApto)}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {apto.mesesIntersticio} meses de interstício
                        </p>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-gov-600 hover:text-gov-700 hover:bg-gov-50"
                          onClick={() => navigate(`/servidores/${apto.servidorId}`)}
                        >
                          Ver perfil
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && tipoSelecionado && (
        <ModalLote
          selecionados={selecionados}
          aptos={aptos}
          tipo={tipoSelecionado}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setSelecionados([]); fetchAptos() }}
        />
      )}
    </div>
  )
}

// ── Aba Histórico ──────────────────────────────────────────────────────────

function TabHistorico() {
  const [registros, setRegistros] = useState<ProgressaoRegistro[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchHistorico = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await progressaoApi.historico({ page, limit: 20 })
      setRegistros(res.data)
      setTotalPages(res.meta.totalPages)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchHistorico() }, [fetchHistorico])

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Servidor', 'Tipo', 'De', 'Para', 'Diferença', 'Status', 'Data', 'Observação'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : registros.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-muted-foreground">
                    <p className="text-sm">Nenhum registro de progressão encontrado.</p>
                  </td>
                </tr>
              ) : (
                registros.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground text-sm">{r.servidor?.nome}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{r.servidor?.matricula}</p>
                    </td>
                    <td className="px-4 py-3"><TipoBadge tipo={r.tipo} /></td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-muted-foreground">
                        {[r.nivelAnterior && `N.${r.nivelAnterior}`, r.classeAnterior && `Cl.${r.classeAnterior}`].filter(Boolean).join(' ') || '—'}
                      </span>
                      <p className="text-[11px] text-muted-foreground">{formatCurrency(r.salarioAnterior)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-gov-700 font-semibold">
                        {[r.nivelNovo && `N.${r.nivelNovo}`, r.classeNova && `Cl.${r.classeNova}`].filter(Boolean).join(' ') || '—'}
                      </span>
                      <p className="text-[11px] text-muted-foreground">{formatCurrency(r.salarioNovo)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-emerald-700">
                        +{formatCurrency(r.salarioNovo - r.salarioAnterior)}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(r.dataEfetivacao)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                      {r.observacao || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação simples */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <span className="text-sm text-muted-foreground">Pág. {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────

export default function ProgressaoPage() {
  const [activeTab, setActiveTab] = useState<Tab>('aptos')

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Progressão Funcional</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Servidores aptos para progressão horizontal, vertical por titulação e enquadramento especial
        </p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            tipo: 'Horizontal',
            desc: 'Interstício de 24 meses entre classes (A→E)',
            color: 'border-l-gov-500 bg-gov-50',
            textColor: 'text-gov-700',
          },
          {
            tipo: 'Vertical por Titulação',
            desc: 'Novo diploma de nível superior — vigora no exercício seguinte (Art. 31 §5º)',
            color: 'border-l-purple-500 bg-purple-50',
            textColor: 'text-purple-700',
          },
          {
            tipo: 'Enquadramento Especial',
            desc: '20+ anos de serviço → enquadra na Classe C direto (Art. 32 §1º)',
            color: 'border-l-amber-500 bg-amber-50',
            textColor: 'text-amber-700',
          },
        ].map((item) => (
          <div key={item.tipo} className={cn('rounded-xl border-l-4 p-4 space-y-1', item.color)}>
            <p className={cn('text-xs font-bold uppercase tracking-wider', item.textColor)}>{item.tipo}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex border-b border-border">
          {([
            { id: 'aptos', label: 'Aptos para Progressão', icon: Users },
            { id: 'historico', label: 'Histórico de Progressões', icon: Clock },
          ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px',
                activeTab === id
                  ? 'border-gov-600 text-gov-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'aptos' && <TabAptos />}
          {activeTab === 'historico' && <TabHistorico />}
        </div>
      </div>
    </div>
  )
}
