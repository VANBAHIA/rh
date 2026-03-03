import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, RefreshCw, ChevronRight, Users, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { concursoApi } from '@/services/modules'
import type { Concurso, StatusConcurso } from '@/types/modules'
import { STATUS_CONCURSO_LABELS } from '@/types/modules'
import { formatDate, cn } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'

const STATUS_STYLES: Record<StatusConcurso, string> = {
  PLANEJADO:    'bg-gray-100 text-gray-600 border-gray-200',
  INSCRICOES:   'bg-blue-100 text-blue-700 border-blue-200',
  EM_ANDAMENTO: 'bg-amber-100 text-amber-700 border-amber-200',
  HOMOLOGADO:   'bg-emerald-100 text-emerald-700 border-emerald-200',
  ENCERRADO:    'bg-slate-100 text-slate-500 border-slate-200',
}

export default function ConcursoPage() {
  const [concursos, setConcursos] = useState<Concurso[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Concurso | null>(null)
  const [candidatos, setCandidatos] = useState<any[]>([])
  const [loadingCandidatos, setLoadingCandidatos] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await concursoApi.listar()
      setConcursos((res as any).data ?? [])
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleSelectConcurso = async (c: Concurso) => {
    setSelected(c)
    setLoadingCandidatos(true)
    try {
      const { data: res } = await concursoApi.candidatos(c.id)
      setCandidatos((res as any).data ?? [])
    } catch { setCandidatos([]) }
    finally { setLoadingCandidatos(false) }
  }

  const handlePosse = async (candidatoId: string) => {
    if (!selected) return
    const data = prompt('Data da posse (AAAA-MM-DD):')
    if (!data) return
    try {
      await concursoApi.posse(selected.id, { candidatoId, dataPosse: data })
      toast({ title: 'Posse registrada! Servidor criado automaticamente.' })
      handleSelectConcurso(selected)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Concursos Públicos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gestão de candidatos, convocações e posses</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Lista de concursos */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-sm font-semibold text-foreground">Concursos</p>
          </div>
          <div className="divide-y divide-border">
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
            )) : concursos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhum concurso cadastrado.</p>
              </div>
            ) : concursos.map(c => (
              <button key={c.id} onClick={() => handleSelectConcurso(c)}
                className={cn('w-full text-left p-4 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3',
                  selected?.id === c.id && 'bg-gov-50 border-r-2 border-gov-600')}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-foreground">Edital {c.numero}</p>
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border', STATUS_STYLES[c.status])}>
                      {STATUS_CONCURSO_LABELS[c.status]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{c.objeto}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.candidatos ?? 0} candidatos</span>
                    <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" />{c.empossados ?? 0} empossados</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Validade: {formatDate(c.dataValidade)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
              </button>
            ))}
          </div>
        </div>

        {/* Candidatos do concurso selecionado */}
        <div className="lg:col-span-3 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-sm font-semibold text-foreground">
              {selected ? `Candidatos — Edital ${selected.numero}` : 'Selecione um concurso'}
            </p>
            {selected && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{selected.objeto}</p>
            )}
          </div>

          {!selected ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <ClipboardList className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">Selecione um concurso para ver os candidatos</p>
            </div>
          ) : loadingCandidatos ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : candidatos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Users className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">Nenhum candidato cadastrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {['Classif.', 'Nome', 'CPF', 'Cargo', 'Status', 'Ação'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {candidatos.map((c: any) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-gov-700">{c.classificacao ?? '—'}º</td>
                      <td className="px-4 py-3 font-medium text-foreground">{c.nome}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.cpf ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{c.cargo ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                          c.empossado ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          c.convocado ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          'bg-gray-100 text-gray-500 border-gray-200')}>
                          {c.empossado ? 'Empossado' : c.convocado ? 'Convocado' : 'Aguardando'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {!c.empossado && c.convocado && (
                          <Button variant="gov" size="sm" className="h-7 text-xs px-3"
                            onClick={() => handlePosse(c.id)}>
                            <UserCheck className="w-3.5 h-3.5 mr-1" />Dar Posse
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
