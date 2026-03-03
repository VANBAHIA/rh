import { useState, useEffect, useCallback } from 'react'
import { Shield, RefreshCw, Plus, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { disciplinarApi } from '@/services/modules'
import type { ProcessoDisciplinar, TipoProcesso, StatusProcesso, TipoPenalidade } from '@/types/modules'
import { TIPO_PROCESSO_LABELS, STATUS_PROCESSO_LABELS } from '@/types/modules'
import { formatDate, cn } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'

const STATUS_STYLES: Record<StatusProcesso, string> = {
  INSTAURADO:          'bg-blue-100 text-blue-700 border-blue-200',
  EM_INSTRUCAO:        'bg-amber-100 text-amber-700 border-amber-200',
  RELATORIO:           'bg-indigo-100 text-indigo-700 border-indigo-200',
  JULGAMENTO:          'bg-purple-100 text-purple-700 border-purple-200',
  ARQUIVADO:           'bg-gray-100 text-gray-500 border-gray-200',
  PENALIDADE_APLICADA: 'bg-red-100 text-red-700 border-red-200',
}

const PENALIDADES: { value: TipoPenalidade; label: string }[] = [
  { value: 'ADVERTENCIA', label: 'Advertência' },
  { value: 'SUSPENSAO', label: 'Suspensão' },
  { value: 'DEMISSAO', label: 'Demissão' },
  { value: 'CASSACAO_APOSENTADORIA', label: 'Cassação de Aposentadoria' },
  { value: 'DESTITUICAO_CARGO', label: 'Destituição de Cargo Comissionado' },
]

const STATUS_FLOW: StatusProcesso[] = ['INSTAURADO', 'EM_INSTRUCAO', 'RELATORIO', 'JULGAMENTO', 'ARQUIVADO', 'PENALIDADE_APLICADA']

function ModalInstaurar({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ servidorId: '', tipo: 'SINDICANCIA' as TipoProcesso, objeto: '', comissao: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.servidorId || !form.objeto) {
      toast({ variant: 'destructive', title: 'Preencha os campos obrigatórios.' }); return
    }
    setSaving(true)
    try {
      await disciplinarApi.instaurar({
        servidorId: form.servidorId, tipo: form.tipo, objeto: form.objeto,
        comissao: form.comissao ? form.comissao.split(',').map(s => s.trim()) : undefined,
      })
      toast({ title: `${TIPO_PROCESSO_LABELS[form.tipo]} instaurada com sucesso.` })
      onSuccess(); onClose()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Instaurar Processo Disciplinar</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Sindicância ou PAD</p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">ID do Servidor *</label>
            <input value={form.servidorId} onChange={e => setForm(p => ({ ...p, servidorId: e.target.value }))}
              placeholder="UUID"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tipo *</label>
            <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v as TipoProcesso }))}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SINDICANCIA">Sindicância</SelectItem>
                <SelectItem value="PAD">PAD — Processo Administrativo Disciplinar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Objeto / fato apurado *</label>
            <textarea value={form.objeto} onChange={e => setForm(p => ({ ...p, objeto: e.target.value }))} rows={3}
              placeholder="Descreva os fatos que motivaram a instauração..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Membros da comissão (separados por vírgula)</label>
            <input value={form.comissao} onChange={e => setForm(p => ({ ...p, comissao: e.target.value }))}
              placeholder="Nome 1, Nome 2, Nome 3"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="gov" onClick={handleSubmit} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Instaurar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function DisciplinarPage() {
  const [processos, setProcessos] = useState<ProcessoDisciplinar[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<StatusProcesso | ''>('')
  const [filterTipo, setFilterTipo] = useState<TipoProcesso | ''>('')
  const [showModal, setShowModal] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterStatus) params.status = filterStatus
      if (filterTipo) params.tipo = filterTipo
      const { data: res } = await disciplinarApi.listar(params)
      setProcessos((res as any).data ?? [])
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setLoading(false) }
  }, [filterStatus, filterTipo])

  useEffect(() => { fetch() }, [fetch])

  const handleAvancarStatus = async (p: ProcessoDisciplinar) => {
    const currentIdx = STATUS_FLOW.indexOf(p.status)
    if (currentIdx >= STATUS_FLOW.length - 1) return
    const nextStatus = STATUS_FLOW[currentIdx + 1]
    setActionId(p.id)
    try {
      await disciplinarApi.aplicarPenalidade(p.id, { penalidade: nextStatus, observacao: "" })
      toast({ title: `Status atualizado → ${STATUS_PROCESSO_LABELS[nextStatus]}` })
      fetch()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setActionId(null) }
  }

  const handlePenalidade = async (p: ProcessoDisciplinar) => {
    const pen = prompt(`Penalidade:\n${PENALIDADES.map((x, i) => `${i + 1}. ${x.label}`).join('\n')}\nDigite o número:`)
    if (!pen) return
    const idx = parseInt(pen) - 1
    if (isNaN(idx) || idx < 0 || idx >= PENALIDADES.length) {
      toast({ variant: 'destructive', title: 'Opção inválida.' }); return
    }
    const penalidade = PENALIDADES[idx].value
    const obs = prompt('Fundamentação da penalidade:') ?? ''
    setActionId(p.id)
    try {
      await disciplinarApi.aplicarPenalidade(p.id, { penalidade, observacao: obs })
      toast({ title: `Penalidade aplicada: ${PENALIDADES[idx].label}` })
      fetch()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setActionId(null) }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Processo Disciplinar</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Sindicâncias e PADs — controle de tramitação</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterTipo || 'todos'} onValueChange={v => setFilterTipo(v === 'todos' ? '' : v as TipoProcesso)}>
            <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="SINDICANCIA">Sindicância</SelectItem>
              <SelectItem value="PAD">PAD</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus || 'todos'} onValueChange={v => setFilterStatus(v === 'todos' ? '' : v as StatusProcesso)}>
            <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(STATUS_PROCESSO_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Atualizar
          </Button>
          <Button variant="gov" size="sm" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />Instaurar
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Nº Processo', 'Servidor', 'Tipo', 'Objeto', 'Instauração', 'Prazo', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                </tr>
              )) : processos.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-muted-foreground">
                  <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Nenhum processo disciplinar encontrado.</p>
                </td></tr>
              ) : processos.map(p => {
                const vencendo = p.prazoEncerramento &&
                  new Date(p.prazoEncerramento).getTime() - Date.now() < 15 * 24 * 60 * 60 * 1000
                const podeAvancar = !['ARQUIVADO', 'PENALIDADE_APLICADA'].includes(p.status)
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-gov-700 text-sm">{p.numero}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{p.servidor.nome}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{p.servidor.matricula}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex px-2 py-0.5 rounded text-[11px] font-semibold',
                        p.tipo === 'PAD' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                        {p.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-sm text-foreground truncate" title={p.objeto}>{p.objeto}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(p.dataInstauracao)}</td>
                    <td className="px-4 py-3">
                      {p.prazoEncerramento ? (
                        <span className={cn('text-sm', vencendo && 'text-red-600 font-semibold')}>
                          {formatDate(p.prazoEncerramento)}
                          {vencendo && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 rounded">!</span>}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', STATUS_STYLES[p.status])}>
                        {STATUS_PROCESSO_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {podeAvancar && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-gov-600 px-2"
                            onClick={() => handleAvancarStatus(p)} disabled={actionId === p.id}>
                            {actionId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ChevronRight className="w-3 h-3 mr-1" />Avançar</>}
                          </Button>
                        )}
                        {p.status === 'JULGAMENTO' && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 px-2"
                            onClick={() => handlePenalidade(p)} disabled={actionId === p.id}>
                            Penalidade
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && <ModalInstaurar onClose={() => setShowModal(false)} onSuccess={fetch} />}
    </div>
  )
}
