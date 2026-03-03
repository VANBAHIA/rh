import { useState, useEffect, useCallback } from 'react'
import { GraduationCap, Search, RefreshCw, Check, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { aposentadoriaApi } from '@/services/modules'
import type { SimulacaoAposentadoria } from '@/types/modules'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'

function SimulacaoCard({ sim }: { sim: SimulacaoAposentadoria }) {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="bg-[#0f1629] text-white rounded-xl p-5">
        <p className="text-slate-400 text-xs uppercase tracking-wider font-mono">Simulação — EC 103/2019</p>
        <h2 className="text-lg font-semibold mt-1">{sim.nome}</h2>
        <p className="text-slate-400 text-sm font-mono">{sim.matricula}</p>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-slate-400 text-xs">Idade atual</p>
            <p className="text-white text-xl font-bold">{sim.idadeAtual} anos</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Tempo de contribuição</p>
            <p className="text-white text-xl font-bold">{sim.tempoContribuicaoAnos} anos</p>
          </div>
          {sim.tempoMagisterioAnos != null && (
            <div>
              <p className="text-slate-400 text-xs">Tempo no magistério</p>
              <p className="text-amber-400 text-xl font-bold">{sim.tempoMagisterioAnos} anos</p>
            </div>
          )}
        </div>
      </div>

      {/* Cards de modalidade */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Voluntária */}
        <div className={cn('rounded-xl border-2 p-5 space-y-3',
          sim.voluntaria.elegivel ? 'border-emerald-300 bg-emerald-50' : 'border-border bg-card')}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-foreground text-sm">Voluntária</p>
              <p className="text-xs text-muted-foreground mt-0.5">62 anos + 35 anos contrib.</p>
            </div>
            {sim.voluntaria.elegivel
              ? <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              : <Clock className="w-5 h-5 text-muted-foreground shrink-0" />}
          </div>
          {sim.voluntaria.elegivel ? (
            <>
              <div className="pt-1 border-t border-emerald-200">
                <p className="text-xs text-emerald-600 font-semibold">✓ ELEGÍVEL</p>
                {sim.voluntaria.proventoEstimado && (
                  <p className="text-lg font-bold text-emerald-700 mt-1">{formatCurrency(sim.voluntaria.proventoEstimado)}</p>
                )}
                <p className="text-xs text-muted-foreground">Provento estimado/mês</p>
              </div>
            </>
          ) : (
            <div className="pt-1 border-t border-border text-xs text-muted-foreground space-y-1">
              {sim.voluntaria.idadeFaltam != null && <p>Idade: faltam <strong>{sim.voluntaria.idadeFaltam} anos</strong></p>}
              {sim.voluntaria.contribuicaoFaltam != null && <p>Contrib.: faltam <strong>{sim.voluntaria.contribuicaoFaltam} anos</strong></p>}
              {sim.voluntaria.dataEstimada && <p className="text-gov-600 font-medium">Estimada: {formatDate(sim.voluntaria.dataEstimada)}</p>}
            </div>
          )}
        </div>

        {/* Especial Professor */}
        <div className={cn('rounded-xl border-2 p-5 space-y-3',
          sim.especialProfessor.elegivel ? 'border-amber-300 bg-amber-50' : 'border-border bg-card')}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-foreground text-sm">Especial Professor</p>
              <p className="text-xs text-muted-foreground mt-0.5">57 anos + 30 anos magistério</p>
            </div>
            {sim.especialProfessor.elegivel
              ? <Check className="w-5 h-5 text-amber-600 shrink-0" />
              : <Clock className="w-5 h-5 text-muted-foreground shrink-0" />}
          </div>
          {sim.especialProfessor.elegivel ? (
            <div className="pt-1 border-t border-amber-200">
              <p className="text-xs text-amber-600 font-semibold">✓ ELEGÍVEL</p>
              {sim.especialProfessor.proventoEstimado && (
                <p className="text-lg font-bold text-amber-700 mt-1">{formatCurrency(sim.especialProfessor.proventoEstimado)}</p>
              )}
              <p className="text-xs text-muted-foreground">Provento estimado/mês</p>
            </div>
          ) : (
            <div className="pt-1 border-t border-border text-xs text-muted-foreground space-y-1">
              {sim.especialProfessor.idadeFaltam != null && <p>Idade: faltam <strong>{sim.especialProfessor.idadeFaltam} anos</strong></p>}
              {sim.especialProfessor.magisterioFaltam != null && <p>Magistério: faltam <strong>{sim.especialProfessor.magisterioFaltam} anos</strong></p>}
              {sim.especialProfessor.dataEstimada && <p className="text-gov-600 font-medium">Estimada: {formatDate(sim.especialProfessor.dataEstimada)}</p>}
            </div>
          )}
        </div>

        {/* Compulsória */}
        <div className="rounded-xl border-2 border-border bg-card p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-foreground text-sm">Compulsória</p>
              <p className="text-xs text-muted-foreground mt-0.5">75 anos de idade</p>
            </div>
            <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
          </div>
          <div className="pt-1 border-t border-border text-xs text-muted-foreground space-y-1">
            <p>Data: <strong className="text-foreground">{formatDate(sim.compulsoria.dataEstimada)}</strong></p>
            <p>Restam: <strong>{sim.compulsoria.anosRestantes} anos</strong></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AposentadoriaPage() {
  const [servidorId, setServidorId] = useState('')
  const [simulacao, setSimulacao] = useState<SimulacaoAposentadoria | null>(null)
  const [aptos, setAptos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingAptos, setLoadingAptos] = useState(true)

  useEffect(() => {
    aposentadoriaApi.pensionistas()
      .then(r => setAptos((r.data as any).data ?? []))
      .catch(() => setAptos([]))
      .finally(() => setLoadingAptos(false))
  }, [])

  const handleSimular = async () => {
    if (!servidorId.trim()) {
      toast({ variant: 'destructive', title: 'Informe o ID do servidor.' }); return
    }
    setLoading(true)
    try {
      const { data: res } = await aposentadoriaApi.simulador(servidorId.trim())
      setSimulacao((res as any).data)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">Aposentadoria</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Simulador EC 103/2019 — Regras do RPPS Municipal</p>
      </div>

      {/* Simulador */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-gov-600" />
          Simulador Individual
        </h2>
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={servidorId} onChange={e => setServidorId(e.target.value)}
              placeholder="UUID do servidor"
              className="pl-9 h-10 font-mono text-sm"
              onKeyDown={e => e.key === 'Enter' && handleSimular()}
            />
          </div>
          <Button variant="gov" onClick={handleSimular} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Simulando...</> : 'Simular'}
          </Button>
          {simulacao && <Button variant="outline" onClick={() => setSimulacao(null)}>Limpar</Button>}
        </div>

        {simulacao && <SimulacaoCard sim={simulacao} />}
      </div>

      {/* Aptos para aposentadoria */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Servidores Aptos para Aposentadoria</h2>
          <span className="text-xs text-muted-foreground font-mono">{aptos.length} encontrado(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Servidor', 'Idade', 'Tempo contrib.', 'Modalidade', 'Data elegível', 'Ação'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingAptos ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                </tr>
              )) : aptos.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">Nenhum servidor apto no momento.</p>
                </td></tr>
              ) : aptos.map((a: any) => (
                <tr key={a.servidorId} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{a.nome}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{a.matricula}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold">{a.idadeAtual} anos</td>
                  <td className="px-4 py-3">{a.tempoContribuicaoAnos} anos</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-semibold',
                      a.modalidade === 'ESPECIAL_PROFESSOR' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
                      {a.modalidade === 'ESPECIAL_PROFESSOR' ? 'Especial Professor' : 'Voluntária'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{a.dataElegivel ? formatDate(a.dataElegivel) : '—'}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-gov-600"
                      onClick={() => setServidorId(a.servidorId)}>
                      Ver simulação
                    </Button>
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
