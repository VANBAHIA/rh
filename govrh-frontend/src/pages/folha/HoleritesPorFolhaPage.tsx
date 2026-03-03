import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Eye, Download, FileText, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { folhaApi } from '@/services/folha'
import type { FolhaResumo } from '@/types/folha'
import { TIPO_FOLHA_LABELS } from '@/types/folha'
import { formatCurrency, cn } from '@/lib/utils'
import { toast } from '@/hooks/useToast'
import { extractApiError } from '@/services/api'
import { confirmToast } from '@/lib/confirm'

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return d
}

export default function HoleritesPorFolhaPage() {
  const { folhaId } = useParams<{ folhaId: string }>()
  const navigate = useNavigate()
  const [holerites, setHolerites] = useState<any[]>([])
  const [meta, setMeta] = useState<{ total: number; page: number; totalPages: number }>({ total: 0, page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [loadingFolha, setLoadingFolha] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [folha, setFolha] = useState<FolhaResumo | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const dSearch = useDebounce(search, 400)

  useEffect(() => {
    if (!folhaId) return
    setLoadingFolha(true)
    folhaApi.listar()
      .then(r => {
        const lista: FolhaResumo[] = r.data?.data ?? r.data ?? []
        const encontrada = lista.find((f: FolhaResumo) => f.id === folhaId) ?? null
        setFolha(encontrada)
      })
      .catch(() => {})
      .finally(() => setLoadingFolha(false))
  }, [folhaId])

  useEffect(() => {
    if (!folhaId) return
    setLoading(true)
    folhaApi.itensPorId(folhaId, { search: dSearch || undefined, page, limit: 20 })
      .then(r => {
        const payload = r.data
        setHolerites(payload.data ?? [])
        setMeta({
          total:      payload.meta?.total      ?? payload.total ?? 0,
          page:       payload.meta?.page       ?? page,
          totalPages: payload.meta?.totalPages ?? payload.totalPages ?? 1,
        })
      })
      .catch(() => {
        toast({ title: 'Erro ao carregar holerites', variant: 'destructive' })
        setHolerites([])
      })
      .finally(() => setLoading(false))
  }, [folhaId, page, dSearch])

  const handleVerHolerite = (servidorId: string) => {
    if (!folha) return
    navigate(`/folha/holerite/${servidorId}/${folha.competencia}?tipo=${folha.tipo}`)
  }

  const handleReprocessar = async (servidorId: string) => {
    if (!folha) return
    const confirmed = await confirmToast('Reprocessar holerite deste servidor? Esta ação recalcula apenas este registro.')
    if (!confirmed) return
    setActionLoading(servidorId)
    try {
      await folhaApi.reprocessarServidor(folhaId!, servidorId)
      toast({ title: 'Holerite reprocessado.' })
      // refresh list
      setLoading(true)
      const r = await folhaApi.itensPorId(folhaId!, { search: dSearch || undefined, page, limit: 20 })
      const payload = r.data
      setHolerites(payload.data ?? [])
      setMeta({
        total:      payload.meta?.total      ?? payload.total ?? 0,
        page:       payload.meta?.page       ?? page,
        totalPages: payload.meta?.totalPages ?? payload.totalPages ?? 1,
      })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setActionLoading(null)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/folha')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Holerites da Folha</h1>
            {loadingFolha ? (
              <Skeleton className="h-4 w-48 mt-1" />
            ) : folha ? (
              <p className="text-sm text-muted-foreground font-mono">
                {folha.competencia} · {TIPO_FOLHA_LABELS[folha.tipo]} · {folha.totalServid ?? 0} servidores
              </p>
            ) : null}
          </div>
        </div>
        <Button variant="outline" size="sm" disabled>
          <Download className="w-4 h-4 mr-2" />
          Exportar todos (PDF)
        </Button>
      </div>

      {/* KPIs */}
      {folha && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Proventos', value: formatCurrency(folha.totalProventos ?? 0), color: 'text-foreground' },
            { label: 'Total Descontos', value: formatCurrency(folha.totalDescontos ?? 0), color: 'text-red-600' },
            { label: 'Total Líquido',   value: formatCurrency(folha.totalLiquido   ?? 0), color: 'text-emerald-700' },
          ].map(item => (
            <div key={item.label} className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={cn('text-xl font-semibold font-mono mt-1', item.color)}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou matrícula..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Tabela */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Matrícula', 'Servidor', 'Cargo', 'Lotação', 'Proventos', 'Descontos', 'Líquido', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
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
              ) : holerites.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="text-center py-16 text-muted-foreground space-y-3">
                      <FileText className="w-12 h-12 mx-auto opacity-20" />
                      <div>
                        <p className="font-medium">Nenhum holerite encontrado</p>
                        <p className="text-xs mt-1">
                          {search ? 'Nenhum resultado para a busca.' : 'Processe a folha para gerar os holerites.'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                holerites.map((h: any) => (
                  <tr key={h.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gov-600 font-semibold">{h.servidor?.matricula}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{h.servidor?.nome}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{h.servidor?.cargo}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{h.servidor?.lotacao}</td>
                    <td className="px-4 py-3 font-mono text-sm text-emerald-700">{formatCurrency(Number(h.totalProventos) ?? 0)}</td>
                    <td className="px-4 py-3 font-mono text-sm text-red-600">− {formatCurrency(Number(h.totalDescontos) ?? 0)}</td>
                    <td className="px-4 py-3 font-mono text-sm font-bold">{formatCurrency(Number(h.totalLiquido) ?? 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={!folha}
                          onClick={() => handleVerHolerite(h.servidor?.id)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {folha && folha.status !== 'FECHADA' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Reprocessar servidor"
                            onClick={() => handleReprocessar(h.servidor?.id)}
                            disabled={actionLoading === h.servidor?.id}
                          >
                            {actionLoading === h.servidor?.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <RefreshCw className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Total: {meta.total.toLocaleString('pt-BR')} holerites
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
