import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Clock, Calendar, RefreshCw, Search, ChevronLeft, ChevronRight,
  AlertCircle, Check, Plus, TrendingUp, TrendingDown, Minus, Loader2,
  Pencil, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { pontoApi } from '@/services/ponto'
import { servidoresApi } from '@/services/servidores'
import type { ResumoMensal, BatidasDia, Escala, TipoOcorrencia } from '@/types/ponto'
import { TIPO_ESCALA_LABELS, DIAS_SEMANA } from '@/types/ponto'
import { formatDate, cn } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'

type Tab = 'resumo' | 'ocorrencias' | 'escalas'

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtHoras(h: number): string {
  const neg = h < 0
  const abs = Math.abs(h)
  const hh = Math.floor(abs)
  const mm = Math.round((abs - hh) * 60)
  return `${neg ? '−' : ''}${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function competenciaAnterior(c: string): string {
  const [y, m] = c.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

function competenciaProxima(c: string): string {
  const [y, m] = c.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

function formatCompetencia(c: string): string {
  const [y, m] = c.split('-')
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${meses[parseInt(m) - 1]}/${y}`
}

// ── Calendário de ponto ───────────────────────────────────────────────────

const OCORRENCIA_COR: Record<TipoOcorrencia, string> = {
  FALTA: 'bg-red-500',
  ATRASO: 'bg-amber-500',
  SAIDA_ANTECIPADA: 'bg-orange-400',
  HORA_EXTRA: 'bg-blue-500',
  FERIADO: 'bg-purple-400',
  RECESSO: 'bg-indigo-400',
  ABONO: 'bg-teal-500',
  LICENCA: 'bg-amber-600',
  FERIAS: 'bg-emerald-500',
}

function CalendarioPonto({ batidas, competencia }: { batidas: BatidasDia[]; competencia: string }) {
  const [selected, setSelected] = useState<BatidasDia | null>(null)
  const [y, m] = competencia.split('-').map(Number)
  const diasNoMes = new Date(y, m, 0).getDate()
  const primeiroDia = new Date(y, m - 1, 1).getDay()

  const mapa = Object.fromEntries((batidas || []).map(b => [b.data.split('T')[0], b]))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-3">
        <div className="grid grid-cols-7 gap-1">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: diasNoMes }).map((_, i) => {
            const dia = i + 1
            const dataStr = `${y}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
            const batida = mapa[dataStr]
            const isWeekend = new Date(y, m - 1, dia).getDay() % 6 === 0
            const isSel = selected?.data.startsWith(dataStr)
            return (
              <button
                key={dia}
                onClick={() => batida && setSelected(isSel ? null : batida)}
                className={cn(
                  'aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all border',
                  isWeekend && !batida && 'bg-muted/30 border-border/30 text-muted-foreground/50',
                  !batida && !isWeekend && 'border-border/30 text-muted-foreground hover:bg-muted/30',
                  batida && 'border-border hover:border-gov-300 cursor-pointer',
                  batida && batida.saldo > 0 && 'bg-blue-50 border-blue-200',
                  batida && batida.saldo === 0 && batida.ocorrencias.length === 0 && 'bg-emerald-50 border-emerald-200',
                  batida && batida.saldo < 0 && 'bg-red-50 border-red-200',
                  batida && batida.ocorrencias.includes('FERIADO') && 'bg-purple-50 border-purple-200',
                  isSel && 'ring-2 ring-gov-500',
                )}
              >
                <span className={cn('font-semibold', batida ? 'text-foreground' : '')}>{dia}</span>
                {batida && batida.horasTrabalhadas != null && (
                  <span className={cn('text-[9px] font-mono mt-0.5',
                    batida.saldo > 0 ? 'text-blue-600' : batida.saldo < 0 ? 'text-red-600' : 'text-emerald-600')}>
                    {fmtHoras(batida.horasTrabalhadas)}
                  </span>
                )}
                {batida && batida.ocorrencias.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {batida.ocorrencias.slice(0, 3).map((oc, j) => (
                      <div key={j} className={cn('w-1.5 h-1.5 rounded-full', OCORRENCIA_COR[oc])} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          {[
            { label: 'Normal', class: 'bg-emerald-400' },
            { label: 'Hora extra', class: 'bg-blue-400' },
            { label: 'Falta/atraso', class: 'bg-red-400' },
            { label: 'Feriado', class: 'bg-purple-400' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className={cn('w-2.5 h-2.5 rounded-full', l.class)} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-muted/30 border border-border rounded-xl p-4">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm text-center">
            <Calendar className="w-8 h-8 mb-2 opacity-30" />
            Clique em um dia para ver os detalhes das batidas
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                {formatDate(selected.data)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {selected.saldo > 0 && <TrendingUp className="w-4 h-4 text-blue-600" />}
                {selected.saldo < 0 && <TrendingDown className="w-4 h-4 text-red-600" />}
                {selected.saldo === 0 && <Minus className="w-4 h-4 text-emerald-600" />}
                <span className={cn('text-sm font-semibold',
                  selected.saldo > 0 ? 'text-blue-600' : selected.saldo < 0 ? 'text-red-600' : 'text-emerald-600')}>
                  {selected.saldo > 0 ? '+' : ''}{fmtHoras(selected.saldo)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Entrada', value: selected.entrada },
                { label: 'Saída p/ almoço', value: selected.saidaAlmoco },
                { label: 'Retorno almoço', value: selected.retornoAlmoco },
                { label: 'Saída', value: selected.saida },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-sm font-mono font-semibold text-foreground">{value ?? '—'}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-xs text-muted-foreground">Horas trabalhadas</span>
                <span className="text-sm font-mono font-semibold">
                  {selected.horasTrabalhadas != null ? fmtHoras(selected.horasTrabalhadas) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-muted-foreground">Horas devidas</span>
                <span className="text-sm font-mono font-semibold">{fmtHoras(selected.horasDevidas)}</span>
              </div>
            </div>
            {selected.ocorrencias.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ocorrências</p>
                {selected.ocorrencias.map((oc) => (
                  <div key={oc} className="flex items-center gap-2 text-xs">
                    <div className={cn('w-2 h-2 rounded-full shrink-0', OCORRENCIA_COR[oc])} />
                    <span>{oc.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            )}
            {selected.observacao && (
              <p className="text-xs text-muted-foreground border-l-2 border-border pl-2">{selected.observacao}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Aba Resumo ─────────────────────────────────────────────────────────────

function TabResumo() {
  const currentDate = new Date()
  const defaultComp = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  const [competencia, setCompetencia] = useState(defaultComp)
  const [servidorId, setServidorId] = useState('')
  const [resumo, setResumo] = useState<ResumoMensal | null>(null)
  const [loading, setLoading] = useState(false)

  const handleBuscar = async () => {
    if (!servidorId.trim()) { toast({ variant: 'destructive', title: 'Informe o ID do servidor.' }); return }
    setLoading(true)
    try {
      const { data: resumo } = await pontoApi.espelho(servidorId, competencia)
      setResumo(resumo)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 border border-border rounded-lg overflow-hidden">
          <button onClick={() => setCompetencia(competenciaAnterior(competencia))} className="p-2 hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-sm font-semibold min-w-[90px] text-center">{formatCompetencia(competencia)}</span>
          <button onClick={() => setCompetencia(competenciaProxima(competencia))} disabled={competencia >= defaultComp} className="p-2 hover:bg-muted transition-colors disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <Input
          placeholder="UUID ou matrícula do servidor"
          value={servidorId}
          onChange={e => setServidorId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleBuscar()}
          className="h-9 text-sm font-mono max-w-xs"
        />
        <Button variant="gov" size="sm" onClick={handleBuscar} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : resumo ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-3">
            {[
              { label: 'Dias úteis', value: resumo.diasUteis, unit: 'dias', color: '' },
              { label: 'Dias trabalhados', value: resumo.diasTrabalhados, unit: 'dias', color: 'text-emerald-700' },
              { label: 'Faltas', value: resumo.diasFalta, unit: 'dias', color: resumo.diasFalta > 0 ? 'text-red-600' : '' },
              { label: 'Hrs previstas', value: fmtHoras(resumo.horasPrevistas), color: '' },
              { label: 'Hrs trabalhadas', value: fmtHoras(resumo.horasTrabalhadas), color: 'text-gov-700' },
              { label: 'Banco de horas', value: fmtHoras(resumo.saldoBanco), color: resumo.saldoBanco >= 0 ? 'text-blue-600' : 'text-red-600' },
            ].map(item => (
              <div key={item.label} className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={cn('text-lg font-bold font-mono mt-1', item.color)}>
                  {item.value}
                  {item.unit && <span className="text-xs font-normal text-muted-foreground ml-1">{item.unit}</span>}
                </p>
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-semibold text-foreground">{resumo.nome}</p>
                <p className="text-xs text-muted-foreground font-mono">{resumo.matricula} · {formatCompetencia(competencia)}</p>
              </div>
            </div>
            <CalendarioPonto batidas={resumo.batidas} competencia={competencia} />
          </div>
        </>
      ) : (
        <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Clock className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-medium">Consulte o ponto de um servidor</p>
          <p className="text-sm mt-1">Informe o UUID e a competência acima</p>
        </div>
      )}
    </div>
  )
}

// ── Aba Ocorrências ────────────────────────────────────────────────────────

function TabOcorrencias() {
  const [ocorrencias, setOcorrencias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await pontoApi.pendencias()
      setOcorrencias((res as any).data ?? [])
    } catch { setOcorrencias([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAprovar = async (id: string) => {
    setActionId(id)
    try {
      throw new Error('Aprovação individual não disponível no backend')
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setActionId(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-700">
          Ocorrências pendentes de aprovação — faltas, atrasos e horas extras registradas pelos gestores.
        </p>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Servidor', 'Data', 'Tipo', 'Horas', 'Descrição', 'Status', 'Ação'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              )) : ocorrencias.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Check className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-50" />
                    <p className="text-sm">Nenhuma ocorrência pendente.</p>
                  </td>
                </tr>
              ) : ocorrencias.map((oc: any) => (
                <tr key={oc.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground text-sm">{oc.servidor?.nome}</p>
                    <p className="text-[11px] font-mono text-muted-foreground">{oc.servidor?.matricula}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{oc.data ? formatDate(oc.data) : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className={cn('w-2 h-2 rounded-full shrink-0', (OCORRENCIA_COR as any)[oc.tipo] ?? 'bg-gray-400')} />
                      <span className="text-sm">{oc.tipo?.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{oc.horas ? fmtHoras(oc.horas) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{oc.descricao ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                      oc.status === 'PENDENTE' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        oc.status === 'APROVADO' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          'bg-red-100 text-red-600 border-red-200',
                    )}>
                      {oc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {oc.status === 'PENDENTE' && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600"
                        onClick={() => handleAprovar(oc.id)} disabled={actionId === oc.id}>
                        {actionId === oc.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <><Check className="w-3 h-3 mr-1" />Aprovar</>
                        }
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Aba Escalas ────────────────────────────────────────────────────────────

interface TurnoConfig {
  entrada: string
  saida: string
  almoco?: { inicio: string; fim: string }
}

// ── Tipo dos avisos de batida ─────────────────────────────────────────────
interface AvisosBatida {
  entrada: number
  saidaAlmoco: number
  retornoAlmoco: number
  saida: number
}

const AVISOS_PADRAO: AvisosBatida = {
  entrada: 10,
  saidaAlmoco: 10,
  retornoAlmoco: 10,
  saida: 10,
}

const HORARIOS_PADRAO: Record<number, TurnoConfig> = {
  0: { entrada: '08:00', saida: '17:00', almoco: { inicio: '12:00', fim: '13:00' } },
  1: { entrada: '08:00', saida: '17:00', almoco: { inicio: '12:00', fim: '13:00' } },
  2: { entrada: '08:00', saida: '17:00', almoco: { inicio: '12:00', fim: '13:00' } },
  3: { entrada: '08:00', saida: '17:00', almoco: { inicio: '12:00', fim: '13:00' } },
  4: { entrada: '08:00', saida: '17:00', almoco: { inicio: '12:00', fim: '13:00' } },
  5: { entrada: '08:00', saida: '17:00', almoco: { inicio: '12:00', fim: '13:00' } },
  6: { entrada: '08:00', saida: '17:00', almoco: { inicio: '12:00', fim: '13:00' } },
}

function TabEscalas() {
  const [escalas, setEscalas] = useState<Escala[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // ── formData com avisosBatida tipado ─────────────────────────────────────
  const [formData, setFormData] = useState<{
    nome: string
    descricao: string
    tipo: Escala['tipo']
    cargaHorariaSemanal: number
    avisosBatida: AvisosBatida
  }>({
    nome: '',
    descricao: '',
    tipo: 'FIXO',
    cargaHorariaSemanal: 40,
    avisosBatida: { ...AVISOS_PADRAO },
  })

  const [diasSelecionados, setDiasSelecionados] = useState<Set<number>>(new Set([1]))
  const [horariosPorDia, setHorariosPorDia] = useState<Record<number, TurnoConfig>>({ ...HORARIOS_PADRAO })
  const [creating, setCreating] = useState(false)
  const [selectedEscala, setSelectedEscala] = useState<Escala | null>(null)

  const carregarEscalas = useCallback(async () => {
    setLoading(true)
    try {
      const { data: r } = await servidoresApi.listarEscalas({ ativo: true })
      const lista = (r as any).data ?? (r as any).escalas ?? r ?? []
      setEscalas(Array.isArray(lista) ? lista : [])
    } catch {
      setEscalas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregarEscalas() }, [carregarEscalas])

  useEffect(() => {
    if (!showModal) return
    document.body.style.overflow = 'hidden'
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKey)
    }
  }, [showModal])

  const handleClose = () => {
    setShowModal(false)
    setSelectedEscala(null)
    setFormData({ nome: '', descricao: '', tipo: 'FIXO', cargaHorariaSemanal: 40, avisosBatida: { ...AVISOS_PADRAO } })
    setDiasSelecionados(new Set([1]))
    setHorariosPorDia({ ...HORARIOS_PADRAO })
  }

  const handleToggleDia = (dia: number) => {
    const nova = new Set(diasSelecionados)
    if (nova.has(dia)) nova.delete(dia)
    else nova.add(dia)
    setDiasSelecionados(nova)
  }

  const construirTurnos = () =>
    Array.from(diasSelecionados).sort((a, b) => a - b).map(dia => ({ diaSemana: dia, ...horariosPorDia[dia] }))

  const handleCreateEscala = async () => {
    if (!formData.nome.trim()) { toast({ variant: 'destructive', title: 'Nome da escala é obrigatório.' }); return }
    if (diasSelecionados.size === 0) { toast({ variant: 'destructive', title: 'Selecione pelo menos um dia da semana.' }); return }
    setCreating(true)
    try {
      const turnos = construirTurnos()
      if (selectedEscala) {
        if (!selectedEscala.tenantId) {
          toast({ variant: 'destructive', title: 'Não é possível editar escala do sistema.' })
        } else {
          await servidoresApi.atualizarEscala(selectedEscala.id, { ...formData, turnos })
          toast({ title: '✓ Escala atualizada com sucesso!' })
          handleClose()
        }
      } else {
        await servidoresApi.criarEscala({ ...formData, turnos })
        toast({ title: '✓ Escala criada com sucesso!' })
        handleClose()
      }
      carregarEscalas()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setCreating(false)
    }
  }

  // Helper para atualizar um campo de avisosBatida
  const setAviso = (key: keyof AvisosBatida, value: number) =>
    setFormData(f => ({ ...f, avisosBatida: { ...f.avisosBatida, [key]: value } }))

  const modal = showModal
    ? createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
        <div
          className="relative bg-background border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <h2 className="text-lg font-semibold">{selectedEscala ? 'Editar Escala' : 'Nova Escala'}</h2>
            <button onClick={handleClose} aria-label="Fechar" className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-muted">✕</button>
          </div>

          {/* Corpo */}
          <div className="overflow-y-auto overscroll-contain px-6 py-4 space-y-4 flex-1">

            {selectedEscala && (selectedEscala._count?.servidores ?? 0) > 0 && (
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <p>
                  Esta escala está vinculada a{' '}
                  <strong>{selectedEscala._count?.servidores} servidor{(selectedEscala._count?.servidores ?? 0) !== 1 ? 'es' : ''}</strong>.
                  Alterações nos horários serão aplicadas imediatamente a todos eles.
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input placeholder="ex: Horário Administrativo" value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })} className="mt-1" />
            </div>

            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input placeholder="ex: Escala para setor administrativo" value={formData.descricao}
                onChange={e => setFormData({ ...formData, descricao: e.target.value })} className="mt-1" />
            </div>

            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select value={formData.tipo} onValueChange={(v: any) => setFormData(f => ({ ...f, tipo: v as Escala['tipo'] }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXO">Horário Fixo</SelectItem>
                  <SelectItem value="REVEZAMENTO">Revezamento de Turnos</SelectItem>
                  <SelectItem value="PLANTAO_12x36">Plantão 12×36</SelectItem>
                  <SelectItem value="PLANTAO_24x48">Plantão 24×48</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Carga Horária Semanal (h)</label>
              <Input type="number" value={formData.cargaHorariaSemanal}
                onChange={e => setFormData({ ...formData, cargaHorariaSemanal: parseInt(e.target.value) })} className="mt-1" />
            </div>

            {/* ── Avisos de ponto fora do horário ── */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-1">Aviso de ponto fora do horário</p>
              <p className="text-xs text-muted-foreground mb-3">
                O sistema começa a informar o servidor apenas quando o atraso ou antecedência
                ultrapassar o tempo configurado. Abaixo do limite o ponto registra silenciosamente.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'entrada' as keyof AvisosBatida, label: 'Entrada' },
                  { key: 'saidaAlmoco' as keyof AvisosBatida, label: 'Saída p/ almoço' },
                  { key: 'retornoAlmoco' as keyof AvisosBatida, label: 'Retorno almoço' },
                  { key: 'saida' as keyof AvisosBatida, label: 'Saída' },
                ]).map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-muted-foreground">{label} (min)</label>
                    <Input
                      type="number" min={0} max={120}
                      value={formData.avisosBatida[key]}
                      onChange={e => setAviso(key, parseInt(e.target.value) || 0)}
                      className="mt-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Dias da semana ── */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Selecione os dias da semana</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {DIAS_SEMANA.map((dia, idx) => (
                  <label key={idx} className={cn(
                    'flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all text-sm',
                    diasSelecionados.has(idx) ? 'bg-gov-100 border-gov-300 text-gov-900' : 'bg-muted border-border text-muted-foreground hover:border-gov-200',
                  )}>
                    <input type="checkbox" checked={diasSelecionados.has(idx)} onChange={() => handleToggleDia(idx)} className="w-4 h-4" />
                    <span className="font-medium">{dia}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ── Horários por dia ── */}
            {diasSelecionados.size > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-4">Horários por dia</p>
                <div className="space-y-4">
                  {Array.from(diasSelecionados).sort((a, b) => a - b).map(dia => {
                    const horario = horariosPorDia[dia]
                    return (
                      <div key={dia} className="bg-muted rounded-lg p-4 space-y-3">
                        <p className="font-semibold text-sm">{DIAS_SEMANA[dia]}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Entrada</label>
                            <Input type="time" value={horario.entrada}
                              onChange={e => setHorariosPorDia({ ...horariosPorDia, [dia]: { ...horario, entrada: e.target.value } })}
                              className="mt-1 text-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Saída</label>
                            <Input type="time" value={horario.saida}
                              onChange={e => setHorariosPorDia({ ...horariosPorDia, [dia]: { ...horario, saida: e.target.value } })}
                              className="mt-1 text-sm" />
                          </div>
                        </div>
                        {horario.almoco && (
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Almoço - Início</label>
                              <Input type="time" value={horario.almoco.inicio}
                                onChange={e => setHorariosPorDia({ ...horariosPorDia, [dia]: { ...horario, almoco: { ...horario.almoco!, inicio: e.target.value } } })}
                                className="mt-1 text-sm" />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Almoço - Fim</label>
                              <Input type="time" value={horario.almoco.fim}
                                onChange={e => setHorariosPorDia({ ...horariosPorDia, [dia]: { ...horario, almoco: { ...horario.almoco!, fim: e.target.value } } })}
                                className="mt-1 text-sm" />
                            </div>
                          </div>
                        )}
                        <button type="button" className="text-xs text-gov-600 hover:underline font-medium"
                          onClick={() => {
                            if (horario.almoco) setHorariosPorDia({ ...horariosPorDia, [dia]: { entrada: horario.entrada, saida: horario.saida } })
                            else setHorariosPorDia({ ...horariosPorDia, [dia]: { ...horario, almoco: { inicio: '12:00', fim: '13:00' } } })
                          }}>
                          {horario.almoco ? '− Remover almoço' : '+ Adicionar almoço'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
            <Button variant="outline" size="sm" onClick={handleClose} disabled={creating}>Cancelar</Button>
            <Button variant="gov" size="sm" onClick={handleCreateEscala} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {creating ? (selectedEscala ? 'Salvando...' : 'Criando...') : (selectedEscala ? 'Salvar' : 'Criar Escala')}
            </Button>
          </div>
        </div>
      </div>,
      document.body,
    )
    : null

  return (
    <div className="space-y-4">
      {modal}
      <div className="flex justify-end">
        <Button variant="gov" size="sm" onClick={() => { setSelectedEscala(null); setShowModal(true) }}>
          <Plus className="w-4 h-4 mr-2" />Nova Escala
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : escalas.length === 0 ? (
        <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Clock className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhuma escala cadastrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {escalas.map((escala) => {
            const emUso = (escala._count?.servidores ?? 0) > 0
            const totalServidores = escala._count?.servidores ?? 0
            return (
              <div key={escala.id} className="bg-card border border-border rounded-xl p-5 space-y-3 hover:border-gov-200 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{escala.nome}</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gov-100 text-gov-700">
                        {TIPO_ESCALA_LABELS[escala.tipo]}
                      </span>
                      {emUso && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          Em uso · {totalServidores} servidor{totalServidores !== 1 ? 'es' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 ml-2">
                    <button
                      onClick={() => {
                        setSelectedEscala(escala)
                        setFormData({
                          nome: escala.nome,
                          descricao: escala.descricao || '',
                          tipo: escala.tipo,
                          cargaHorariaSemanal: escala.cargaHorariaSemanal,
                          // Popula avisosBatida da escala ou usa padrão
                          avisosBatida: (escala as any).avisosBatida ?? { ...AVISOS_PADRAO },
                        })
                        const dias = new Set<number>()
                        const horarios: Record<number, TurnoConfig> = { ...HORARIOS_PADRAO };
                        (escala.turnos || []).forEach(turno => {
                          dias.add(turno.diaSemana)
                          horarios[turno.diaSemana] = { entrada: turno.entrada, saida: turno.saida, almoco: turno.almoco }
                        })
                        setDiasSelecionados(dias)
                        setHorariosPorDia(horarios)
                        setShowModal(true)
                      }}
                      className="text-gov-600 hover:text-gov-800 p-1 rounded transition-colors"
                      title={emUso ? `Editar — afeta ${totalServidores} servidor(es)` : 'Editar'}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {emUso ? (
                      <button
                        onClick={() => toast({
                          variant: 'destructive',
                          title: 'Não é possível excluir esta escala',
                          description: `${totalServidores} servidor${totalServidores !== 1 ? 'es estão' : ' está'} vinculado${totalServidores !== 1 ? 's' : ''} a ela. Reatribua-os a outra escala antes de excluir.`,
                        })}
                        className="text-red-400 hover:text-red-600 p-1 rounded transition-colors"
                        title={`Não pode excluir — ${totalServidores} servidor(es) vinculado(s)`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          if (confirm('Deseja realmente excluir esta escala?')) {
                            try {
                              await servidoresApi.excluirEscala(escala.id)
                              toast({ title: 'Escala excluída.' })
                              carregarEscalas()
                            } catch (e) {
                              toast({ variant: 'destructive', title: 'Erro ao excluir', description: extractApiError(e) })
                            }
                          }
                        }}
                        className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Carga horária: <strong className="text-foreground">{(escala.cargaHorariaSemanal ?? (escala as any).horasDiarias ?? '—')}h/semana</strong>
                </p>
                {escala.descricao && <p className="text-xs text-muted-foreground">{escala.descricao}</p>}
                <div className="space-y-1.5 border-t border-border pt-3">
                  {(escala.turnos || []).map((turno, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground w-8">{DIAS_SEMANA[turno.diaSemana]}</span>
                      <span className="font-mono text-muted-foreground">{turno.entrada} – {turno.saida}</span>
                      {turno.almoco && (
                        <span className="text-muted-foreground/60 font-mono">almoço {turno.almoco.inicio}–{turno.almoco.fim}</span>
                      )}
                    </div>
                  ))}
                </div>
                {(escala.lotacoes ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 border-t border-border pt-3">
                    {(escala.lotacoes ?? []).map((l: any) => (
                      <span
                        key={l.id}
                        className="px-2 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground border border-border"
                      >
                        {l.nome}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────

export default function PontoPage() {
  const [activeTab, setActiveTab] = useState<Tab>('resumo')

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">Ponto & Escalas</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Espelho de ponto, banco de horas e gestão de escalas de trabalho
        </p>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {([
            { id: 'resumo', label: 'Espelho de Ponto', icon: Calendar },
            { id: 'ocorrencias', label: 'Ocorrências', icon: AlertCircle },
            { id: 'escalas', label: 'Escalas', icon: Clock },
          ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px shrink-0',
                activeTab === id ? 'border-gov-600 text-gov-600' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {activeTab === 'resumo' && <TabResumo />}
          {activeTab === 'ocorrencias' && <TabOcorrencias />}
          {activeTab === 'escalas' && <TabEscalas />}
        </div>
      </div>
    </div>
  )
}
