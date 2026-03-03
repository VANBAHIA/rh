import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign, Play, Lock, RefreshCw,
  FileText, TrendingUp, Users, AlertCircle, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { folhaApi } from '@/services/folha'
import type { FolhaResumo, TipoFolha, StatusFolha, ProcessarFolhaPayload } from '@/types/folha'
import { TIPO_FOLHA_LABELS, STATUS_FOLHA_LABELS } from '@/types/folha'
import { formatCurrency, formatDate } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'
import { confirmToast } from '@/lib/confirm'
import { cn } from '@/lib/utils'

// ── Status badge ─────────────────────────────────────────────────────────

const STATUS_STYLES: Record<StatusFolha, string> = {
  ABERTA:       'bg-blue-100 text-blue-700 border-blue-200',
  EM_PROCESSAMENTO:  'bg-amber-100 text-amber-700 border-amber-200',
  PROCESSADA:   'bg-green-100 text-green-700 border-green-200',
  FECHADA:      'bg-slate-100 text-slate-600 border-slate-200',
  RETIFICADA:    'bg-red-100 text-red-600 border-red-200',
}

function StatusBadge({ status }: { status: StatusFolha }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', STATUS_STYLES[status])}>
      {status === 'EM_PROCESSAMENTO' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
      {STATUS_FOLHA_LABELS[status]}
    </span>
  )
}

// ── Modal processar folha ─────────────────────────────────────────────────

function ModalProcessar({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const currentYear = new Date().getFullYear()
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0')

  const [competencia, setCompetencia] = useState(`${currentYear}-${currentMonth}`)
  const [tipo, setTipo] = useState<TipoFolha>('MENSAL')
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async () => {
    setProcessing(true)
    try {
      await folhaApi.processar({ competencia, tipo } as ProcessarFolhaPayload)
      toast({ title: 'Folha processada!', description: `Competência ${competencia} — ${TIPO_FOLHA_LABELS[tipo]}` })
      onSuccess()
      onClose()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao processar', description: extractApiError(err) })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Processar Folha de Pagamento</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione a competência e o tipo de folha para processar.
          </p>
        </div>

        <div className="space-y-4">
          {/* Competência */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Competência</label>
            <input
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tipo de Folha</label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoFolha)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_FOLHA_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aviso */}
          <div className="flex gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              O processamento calculará proventos, descontos de RPPS, INSS e IRRF conforme a legislação vigente para todos os servidores ativos.
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <Button variant="outline" onClick={onClose} disabled={processing}>Cancelar</Button>
          <Button variant="gov" onClick={handleSubmit} disabled={processing} className="min-w-[120px]">
            {processing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</> : <><Play className="w-4 h-4 mr-2" />Processar</>}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Card KPI ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-foreground font-mono">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────

export default function FolhaPage() {
  const navigate = useNavigate()
  const [folhas, setFolhas] = useState<FolhaResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchFolhas = useCallback(async () => {
    setLoading(true)
    try {
      const res = await folhaApi.listar()
      const data = (res.data as any)
      setFolhas(Array.isArray(data) ? data : data?.data ?? data?.folhas ?? [])
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFolhas() }, [fetchFolhas])

  const ultimaFolha = folhas[0]

  const handleFechar = async (folha: FolhaResumo) => {
    setActionLoading(folha.id)
    try {
      await folhaApi.fechar(folha.competencia, folha.tipo)
      toast({ title: 'Folha fechada com sucesso.' })
      fetchFolhas()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReprocessar = async (folha: FolhaResumo) => {
    const confirmed = await confirmToast(
      `Reprocessar folha ${folha.competencia} (${TIPO_FOLHA_LABELS[folha.tipo]})? Isto irá recalcular todos os holerites e substituir os valores atuais.`
    )
    if (!confirmed) return
    setActionLoading(folha.id)
    try {
      await folhaApi.reprocessar(folha.competencia, folha.tipo)
      toast({ title: 'Folha reprocessada.' })
      fetchFolhas()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setActionLoading(null)
    }
  }

  const handleExcluir = async (folha: FolhaResumo) => {
    const confirmed = await confirmToast(
      `Deseja realmente excluir a folha ${folha.competencia} (${TIPO_FOLHA_LABELS[folha.tipo]})? Esta ação não pode ser desfeita.`
    )
    if (!confirmed) return
    setActionLoading(folha.id)
    try {
      await folhaApi.excluir(folha.competencia, folha.tipo)
      toast({ title: 'Folha excluída.' })
      fetchFolhas()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Folha de Pagamento</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Processamento e acompanhamento de competências
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchFolhas} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Atualizar
          </Button>
          <Button variant="gov" size="sm" onClick={() => setShowModal(true)}>
            <Play className="w-4 h-4 mr-2" />
            Processar Folha
          </Button>
        </div>
      </div>

      {/* KPIs da última folha */}
      {ultimaFolha && !loading && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Total Bruto"
            value={formatCurrency(ultimaFolha.totalProventos)}
            sub={`Competência ${ultimaFolha.competencia}`}
            icon={DollarSign}
            color="text-gov-600 bg-gov-50"
          />
          <KpiCard
            label="Total Descontos"
            value={formatCurrency(ultimaFolha.totalDescontos)}
            sub="RPPS + IRRF + outros"
            icon={TrendingUp}
            color="text-red-500 bg-red-50"
          />
          <KpiCard
            label="Total Líquido"
            value={formatCurrency(ultimaFolha.totalLiquido)}
            sub="A pagar aos servidores"
            icon={DollarSign}
            color="text-emerald-600 bg-emerald-50"
          />
          <KpiCard
            label="Servidores"
            value={String(ultimaFolha.totalServid ?? 0)}
            sub="Incluídos na folha"
            icon={Users}
            color="text-blue-600 bg-blue-50"
          />
        </div>
      )}

      {/* Histórico de folhas */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-sm">Histórico de Competências</h2>
          <span className="text-xs text-muted-foreground font-mono">{folhas.length} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Competência', 'Tipo', 'Servidores', 'Bruto', 'Descontos', 'Líquido', 'Status', 'Processado em', 'Ações'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : folhas.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="text-center py-16 text-muted-foreground">
                      <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">Nenhuma folha processada ainda</p>
                      <p className="text-xs mt-1">Clique em "Processar Folha" para começar.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                folhas.map((folha) => (
                  <tr key={folha.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-foreground">{folha.competencia}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{TIPO_FOLHA_LABELS[folha.tipo]}</td>
                    <td className="px-4 py-3 text-center font-mono text-sm">{folha.totalServid ?? 0}</td>
                    <td className="px-4 py-3 font-mono text-sm">{formatCurrency(folha.totalProventos)}</td>
                    <td className="px-4 py-3 font-mono text-sm text-red-600">− {formatCurrency(folha.totalDescontos)}</td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-emerald-700">{formatCurrency(folha.totalLiquido)}</td>
                    <td className="px-4 py-3"><StatusBadge status={folha.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {folha.processadaEm ? formatDate(folha.processadaEm) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Ver holerites */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Ver holerites"
                          onClick={() => navigate(`/folha/${folha.id}/holerites`)}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                        {/* Reprocessar (qualquer status exceto FECHADA) */}
                        {folha.status !== 'FECHADA' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Reprocessar folha"
                            onClick={() => handleReprocessar(folha)}
                            disabled={actionLoading === folha.id}
                          >
                            {actionLoading === folha.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <RefreshCw className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                        {/* Fechar */}
                        {folha.status === 'PROCESSADA' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Fechar folha"
                            onClick={() => handleFechar(folha)}
                            disabled={actionLoading === folha.id}
                          >
                            {actionLoading === folha.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Lock className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                        {/* Excluir (não pode se fechada) */}
                        {folha.status !== 'FECHADA' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Excluir folha"
                            onClick={() => handleExcluir(folha)}
                            disabled={actionLoading === folha.id}
                          >
                            {actionLoading === folha.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <AlertCircle className="w-3.5 h-3.5" />}
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
      </div>

      {/* Modal */}
      {showModal && (
        <ModalProcessar
          onClose={() => setShowModal(false)}
          onSuccess={fetchFolhas}
        />
      )}
    </div>
  )
}
