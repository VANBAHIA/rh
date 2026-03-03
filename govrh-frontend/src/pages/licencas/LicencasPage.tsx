import { useState, useEffect, useCallback } from 'react'
import { FileText, RefreshCw, Plus, Check, X, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { licencasApi } from '@/services/modules'
import type { Licenca, TipoLicenca, StatusLicenca } from '@/types/modules'
import { TIPO_LICENCA_LABELS, STATUS_LICENCA_LABELS } from '@/types/modules'
import { formatDate, cn } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'

const STATUS_STYLES: Record<StatusLicenca, string> = {
  SOLICITADA:  'bg-amber-100 text-amber-700 border-amber-200',
  APROVADA:    'bg-blue-100 text-blue-700 border-blue-200',
  REJEITADA:   'bg-red-100 text-red-600 border-red-200',
  EM_VIGENCIA: 'bg-teal-100 text-teal-700 border-teal-200',
  ENCERRADA:   'bg-gray-100 text-gray-500 border-gray-200',
  PRORROGADA:  'bg-purple-100 text-purple-700 border-purple-200',
}

const TIPO_COLORS: Record<string, string> = {
  MEDICA:             'bg-red-50 text-red-700',
  GESTANTE:           'bg-pink-50 text-pink-700',
  PATERNIDADE:        'bg-blue-50 text-blue-700',
  NOJO:               'bg-gray-50 text-gray-600',
  GALA:               'bg-rose-50 text-rose-700',
  PREMIO:             'bg-amber-50 text-amber-700',
  CAPACITACAO:        'bg-indigo-50 text-indigo-700',
  MANDATO_CLASSISTA:  'bg-gov-50 text-gov-700',
  SERVICO_MILITAR:    'bg-slate-50 text-slate-700',
  ACIDENTE_SERVICO:   'bg-orange-50 text-orange-700',
  DOENCA_FAMILIA:     'bg-purple-50 text-purple-700',
}

function ModalNovaLicenca({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    servidorId: '', tipo: 'MEDICA' as TipoLicenca, dataInicio: '',
    dataFim: '', cid: '', observacao: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.servidorId || !form.dataInicio || !form.dataFim) {
      toast({ variant: 'destructive', title: 'Preencha todos os campos obrigatórios.' }); return
    }
    setSaving(true)
    try {
      await licencasApi.criar({ ...form, cid: form.cid || undefined, observacao: form.observacao || undefined })
      toast({ title: 'Licença registrada com sucesso!' })
      onSuccess(); onClose()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setSaving(false) }
  }

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div>
          <h2 className="text-lg font-semibold">Registrar Licença</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Preencha os dados da licença funcional.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <label className="text-sm font-medium">ID do Servidor *</label>
            <input value={form.servidorId} onChange={f('servidorId')} placeholder="UUID do servidor"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-sm font-medium">Tipo de licença *</label>
            <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v as TipoLicenca }))}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_LICENCA_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Data início *</label>
            <input type="date" value={form.dataInicio} onChange={f('dataInicio')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Data fim *</label>
            <input type="date" value={form.dataFim} onChange={f('dataFim')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          {form.tipo === 'MEDICA' && (
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium">CID (opcional)</label>
              <input value={form.cid} onChange={f('cid')} placeholder="Ex: J06.9"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          )}
          <div className="col-span-2 space-y-1.5">
            <label className="text-sm font-medium">Observação</label>
            <textarea value={form.observacao} onChange={f('observacao')} rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-1">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="gov" onClick={handleSubmit} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Registrar Licença'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function LicencasPage() {
  const [licencas, setLicencas] = useState<Licenca[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTipo, setFilterTipo] = useState<TipoLicenca | ''>('')
  const [filterStatus, setFilterStatus] = useState<StatusLicenca | ''>('')
  const [showModal, setShowModal] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterTipo) params.tipo = filterTipo
      if (filterStatus) params.status = filterStatus
      const { data: res } = await licencasApi.listar(params)
      setLicencas((res as any).data ?? [])
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setLoading(false) }
  }, [filterTipo, filterStatus])

  useEffect(() => { fetch() }, [fetch])

  const handleAprovar = async (id: string) => {
    setActionId(id)
    try { await licencasApi.aprovar(id); toast({ title: 'Licença aprovada.' }); fetch() }
    catch (err) { toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) }) }
    finally { setActionId(null) }
  }

  const handleRejeitar = async (id: string) => {
    const motivo = prompt('Motivo da rejeição:')
    if (!motivo) return
    setActionId(id)
    try { await licencasApi.encerrar(id); toast({ title: 'Licença rejeitada.' }); fetch() }
    catch (err) { toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) }) }
    finally { setActionId(null) }
  }

  const handleProrrogar = async (id: string) => {
    const data = prompt('Nova data de fim (AAAA-MM-DD):')
    if (!data) return
    setActionId(id)
    try { throw new Error("Prorrogação não disponível"); toast({ title: 'Licença prorrogada.' }); fetch() }
    catch (err) { toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) }) }
    finally { setActionId(null) }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Licenças</h1>
          <p className="text-muted-foreground text-sm mt-0.5">11 tipos de licença com workflow de aprovação</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterTipo || 'todos'} onValueChange={v => setFilterTipo(v === 'todos' ? '' : v as TipoLicenca)}>
            <SelectTrigger className="h-9 w-52 text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {Object.entries(TIPO_LICENCA_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus || 'todos'} onValueChange={v => setFilterStatus(v === 'todos' ? '' : v as StatusLicenca)}>
            <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(STATUS_LICENCA_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Atualizar
          </Button>
          <Button variant="gov" size="sm" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />Nova Licença
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Servidor', 'Tipo', 'Período', 'Dias', 'CID', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                </tr>
              )) : licencas.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Nenhuma licença encontrada.</p>
                </td></tr>
              ) : licencas.map(lic => (
                <tr key={lic.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground text-sm">{lic.servidor.nome}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{lic.servidor.matricula}</p>
                    <p className="text-[11px] text-muted-foreground">{lic.servidor.cargo}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold', TIPO_COLORS[lic.tipo] ?? 'bg-gray-100 text-gray-700')}>
                      {TIPO_LICENCA_LABELS[lic.tipo]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                    {formatDate(lic.dataInicio)}<br />{formatDate(lic.dataFim)}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{lic.dias}</td>
                  <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{lic.cid ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', STATUS_STYLES[lic.status])}>
                      {STATUS_LICENCA_LABELS[lic.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {lic.status === 'SOLICITADA' && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                            onClick={() => handleAprovar(lic.id)} disabled={actionId === lic.id} title="Aprovar">
                            {actionId === lic.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50"
                            onClick={() => handleRejeitar(lic.id)} disabled={actionId === lic.id} title="Rejeitar">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                      {(lic.status === 'EM_VIGENCIA' || lic.status === 'APROVADA') && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-purple-600 hover:bg-purple-50"
                          onClick={() => handleProrrogar(lic.id)} disabled={actionId === lic.id} title="Prorrogar">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && <ModalNovaLicenca onClose={() => setShowModal(false)} onSuccess={fetch} />}
    </div>
  )
}
