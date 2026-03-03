import { useState, useEffect, useCallback } from 'react'
import { Palmtree, RefreshCw, Plus, Check, X, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { feriasApi } from '@/services/modules'
import type { PeriodoAquisitivo, StatusFerias } from '@/types/modules'
import { STATUS_FERIAS_LABELS } from '@/types/modules'
import { formatDate, cn } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'

const STATUS_STYLES: Record<StatusFerias, string> = {
  PENDENTE:  'bg-amber-100 text-amber-700 border-amber-200',
  APROVADA:  'bg-blue-100 text-blue-700 border-blue-200',
  REJEITADA: 'bg-red-100 text-red-600 border-red-200',
  CANCELADA: 'bg-gray-100 text-gray-500 border-gray-200',
  GOZADA:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  EM_GOZO:   'bg-teal-100 text-teal-700 border-teal-200',
}

function ModalSolicitar({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [servidorId, setServidorId] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dias, setDias] = useState(30)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!servidorId || !dataInicio) {
      toast({ variant: 'destructive', title: 'Preencha todos os campos obrigatórios.' })
      return
    }
    setSaving(true)
    try {
      await feriasApi.agendar({ servidorId, dataInicio, dias })
      toast({ title: 'Férias solicitadas com sucesso!' })
      onSuccess(); onClose()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Solicitar Férias</h2>
          <p className="text-sm text-muted-foreground mt-1">Informe o período desejado para gozo das férias.</p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">ID do Servidor *</label>
            <input value={servidorId} onChange={e => setServidorId(e.target.value)}
              placeholder="UUID do servidor"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Data de início *</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Dias</label>
              <Select value={String(dias)} onValueChange={v => setDias(Number(v))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 15, 20, 30].map(d => <SelectItem key={d} value={String(d)}>{d} dias</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="gov" onClick={handleSubmit} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Solicitar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function FeriasPage() {
  const [periodos, setPeriodos] = useState<PeriodoAquisitivo[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<StatusFerias | ''>('')
  const [showModal, setShowModal] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterStatus) params.status = filterStatus
      const { data: res } = await feriasApi.vencendo()
      setPeriodos((res as any).data ?? [])
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setLoading(false) }
  }, [filterStatus])

  useEffect(() => { fetch() }, [fetch])

  const handleAprovar = async (id: string) => {
    setActionId(id)
    try {
      await feriasApi.aprovar(id)
      toast({ title: 'Férias aprovadas.' })
      fetch()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setActionId(null) }
  }

  const handleRejeitar = async (id: string) => {
    const motivo = prompt('Informe o motivo da rejeição:')
    if (!motivo) return
    setActionId(id)
    try {
      throw new Error("Operação não disponível no backend")
      toast({ title: 'Férias rejeitadas.' })
      fetch()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setActionId(null) }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Férias</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Períodos aquisitivos e controle de gozo</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus || 'todos'} onValueChange={v => setFilterStatus(v === 'todos' ? '' : v as StatusFerias)}>
            <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="Todos os status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(STATUS_FERIAS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Atualizar
          </Button>
          <Button variant="gov" size="sm" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />Solicitar Férias
          </Button>
        </div>
      </div>

      {/* Aviso períodos vencendo */}
      {!loading && periodos.some(p => {
        const diff = new Date(p.vencimento).getTime() - Date.now()
        return diff > 0 && diff < 60 * 24 * 60 * 60 * 1000 && p.diasSaldo > 0
      }) && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            Existem períodos aquisitivos com saldo de dias a vencer nos próximos 60 dias. Programe o gozo antes do vencimento.
          </p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Servidor', 'Período Aquisitivo', 'Dias devidos', 'Dias gozados', 'Saldo', 'Vencimento', 'Período de gozo', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 9 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                </tr>
              )) : periodos.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-16 text-muted-foreground">
                  <Palmtree className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Nenhum período encontrado.</p>
                </td></tr>
              ) : periodos.map(p => {
                const vencendo = new Date(p.vencimento).getTime() - Date.now() < 60 * 24 * 60 * 60 * 1000 && p.diasSaldo > 0
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground text-sm">{p.servidor.nome}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{p.servidor.matricula}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                      {formatDate(p.dataInicio)} – {formatDate(p.dataFim)}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{p.diasDevidos}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{p.diasGozados}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('font-bold', p.diasSaldo > 0 ? 'text-emerald-700' : 'text-muted-foreground')}>
                        {p.diasSaldo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm', vencendo && 'text-amber-600 font-semibold')}>
                        {formatDate(p.vencimento)}
                        {vencendo && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1 rounded">Vencendo</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {p.periodoGozo ? `${formatDate(p.periodoGozo.inicio)} (${p.periodoGozo.dias}d)` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', STATUS_STYLES[p.status])}>
                        {STATUS_FERIAS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'PENDENTE' && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                            onClick={() => handleAprovar(p.id)} disabled={actionId === p.id} title="Aprovar">
                            {actionId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50"
                            onClick={() => handleRejeitar(p.id)} disabled={actionId === p.id} title="Rejeitar">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <ModalSolicitar onClose={() => setShowModal(false)} onSuccess={fetch} />}
    </div>
  )
}
