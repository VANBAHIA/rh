import { useState, useRef } from 'react'
import { FileText, Printer, Filter, ChevronDown, Loader2, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { folhaApi } from '@/services/folha'
import { TIPO_FOLHA_LABELS } from '@/types/folha'
import type { TipoFolha } from '@/types/folha'
import { formatCurrency, formatCPF, formatDate, cn } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'

const TIPOS: TipoFolha[] = [
  'MENSAL',
  'DECIMO_TERCEIRO_PRIMEIRA',
  'DECIMO_TERCEIRO_SEGUNDA',
  'FERIAS',
  'RESCISAO',
]

function gerarMeses(qtd = 24) {
  const meses: string[] = []
  const d = new Date()
  for (let i = 0; i < qtd; i++) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    meses.push(`${y}-${m}`)
    d.setMonth(d.getMonth() - 1)
  }
  return meses
}

function formatCompetencia(c: string) {
  const [y, m] = c.split('-')
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${nomes[parseInt(m) - 1]}/${y}`
}

function formatCPFMask(cpf: string) {
  return cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') ?? ''
}

function formatAdmissao(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default function RelatoriosPage() {
  const printRef = useRef<HTMLDivElement>(null)

  const [tipoRelatorio, setTipoRelatorio] = useState<'analitico' | 'sintetico'>('analitico')
  const [competencia, setCompetencia] = useState(gerarMeses(1)[0])
  const [tipo, setTipo] = useState<TipoFolha>('MENSAL')
  const [loading, setLoading] = useState(false)
  const [dados, setDados] = useState<any>(null)

  const meses = gerarMeses(24)

  const handleGerar = async () => {
    setLoading(true)
    setDados(null)
    try {
      const fn = tipoRelatorio === 'analitico'
        ? folhaApi.relatorioAnalitico
        : folhaApi.relatorioSintetico
      const { data } = await fn(competencia, tipo)
      setDados(data.data ?? data)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally {
      setLoading(false)
    }
  }

  const handleImprimir = () => window.print()

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Relatórios de Folha</h1>
            <p className="text-sm text-muted-foreground">Analítico e Sintético por competência</p>
          </div>
        </div>
        {dados && (
          <Button variant="outline" size="sm" onClick={handleImprimir}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-card border border-border rounded-xl p-4 print:hidden">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Modelo</label>
            <Select value={tipoRelatorio} onValueChange={(v) => { setTipoRelatorio(v as any); setDados(null) }}>
              <SelectTrigger className="w-44 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="analitico">Analítico (por servidor)</SelectItem>
                <SelectItem value="sintetico">Sintético (resumo)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Competência</label>
            <Select value={competencia} onValueChange={(v) => { setCompetencia(v); setDados(null) }}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.map(m => (
                  <SelectItem key={m} value={m}>{formatCompetencia(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tipo de Folha</label>
            <Select value={tipo} onValueChange={(v) => { setTipo(v as TipoFolha); setDados(null) }}>
              <SelectTrigger className="w-52 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map(t => (
                  <SelectItem key={t} value={t}>{TIPO_FOLHA_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleGerar} disabled={loading} className="h-9">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            Gerar Relatório
          </Button>
        </div>
      </div>

      {/* Relatório */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Gerando relatório...</span>
        </div>
      )}

      {!loading && !dados && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <BarChart3 className="w-12 h-12 opacity-20" />
          <p className="text-sm">Selecione os filtros e clique em Gerar Relatório</p>
        </div>
      )}

      {!loading && dados && (
        <div ref={printRef}>
          {tipoRelatorio === 'analitico'
            ? <RelatorioAnalitico dados={dados} />
            : <RelatorioSintetico dados={dados} />
          }
        </div>
      )}
    </div>
  )
}

// ─── Relatório Analítico ──────────────────────────────────────────────────────

function RelatorioAnalitico({ dados }: { dados: any }) {
  const { folha, servidores } = dados

  return (
    <div className="space-y-0 print:space-y-0">
      {servidores.map((srv: any, idx: number) => (
        <div
          key={srv.id}
          className="bg-white border border-border rounded-xl overflow-hidden mb-4 print:mb-3 print:rounded-none print:border-x-0 print:border-t-0 shadow-sm print:shadow-none"
        >
          {/* Cabeçalho do órgão — apenas no primeiro */}
          {idx === 0 && (
            <div className="bg-[#0d1424] text-white px-6 py-4 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  {folha.competencia} — {TIPO_FOLHA_LABELS[folha.tipo as TipoFolha]}
                </p>
                <h2 className="text-base font-semibold text-white mt-0.5">
                  Folha de Pagamento — Relatório Analítico
                </h2>
              </div>
              <div className="text-right text-[10px] text-slate-400 font-mono">
                <p>GovHRPub</p>
                <p className="mt-0.5 text-slate-500">Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          )}

          {/* Lotação como departamento */}
          <div className="bg-slate-50 border-b border-border px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-slate-500">{String(idx + 1).padStart(2, '0')}</span>
              <span className="font-semibold text-sm text-foreground">{srv.nome}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="font-mono">Mat. <span className="text-foreground font-semibold">{srv.matricula}</span></span>
              <span>CPF: {formatCPFMask(srv.cpf)}</span>
              <span>Adm: {formatAdmissao(srv.admissao)}</span>
            </div>
          </div>

          {/* Info do servidor */}
          <div className="px-6 py-3 border-b border-dashed border-border bg-white">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs">
              <div>
                <span className="text-muted-foreground">Lotação: </span>
                <span className="font-medium">{srv.lotacao}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cargo: </span>
                <span className="font-medium">{srv.cargo}</span>
              </div>
              {(srv.nivel || srv.classe) && (
                <div>
                  <span className="text-muted-foreground">PCCV: </span>
                  <span className="font-mono font-medium">
                    {[srv.nivel && `N.${srv.nivel}`, srv.classe && `Cl.${srv.classe}`].filter(Boolean).join(' ')}
                  </span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Vínculo: </span>
                <span className="font-medium">{srv.regime}</span>
              </div>
            </div>
          </div>

          {/* Tabela verbas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {/* Proventos */}
            <div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-emerald-50 border-b border-border">
                    <th className="py-1.5 px-4 text-left font-semibold text-emerald-700 uppercase tracking-wider">Proventos</th>
                    <th className="py-1.5 px-3 text-center font-semibold text-emerald-700 uppercase">Fator</th>
                    <th className="py-1.5 px-3 text-center font-semibold text-emerald-700 uppercase">Base Cálc.</th>
                    <th className="py-1.5 px-3 text-right font-semibold text-emerald-700 uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {srv.proventos.map((v: any, i: number) => (
                    <tr key={i} className="border-b border-border/40 hover:bg-muted/10">
                      <td className="py-1.5 px-4">
                        <span className="font-mono text-muted-foreground mr-2">{v.codigo}</span>
                        {v.nome}
                      </td>
                      <td className="py-1.5 px-3 text-center text-muted-foreground font-mono">
                        {v.fator != null ? v.fator.toLocaleString('pt-BR', { minimumFractionDigits: 3 }) : '1,000'}
                      </td>
                      <td className="py-1.5 px-3 text-center font-mono text-muted-foreground">
                        {v.referencia != null ? formatCurrency(v.referencia) : '—'}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono font-semibold text-emerald-700">
                        {formatCurrency(v.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-50/60 border-t border-border">
                    <td colSpan={3} className="py-1.5 px-4 font-bold text-emerald-800 uppercase text-[11px]">Total Proventos</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-800">{formatCurrency(srv.totalProventos)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Descontos */}
            <div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-red-50 border-b border-border">
                    <th className="py-1.5 px-4 text-left font-semibold text-red-700 uppercase tracking-wider">Descontos</th>
                    <th className="py-1.5 px-3 text-center font-semibold text-red-700 uppercase">Alíq.</th>
                    <th className="py-1.5 px-3 text-center font-semibold text-red-700 uppercase">Base Cálc.</th>
                    <th className="py-1.5 px-3 text-right font-semibold text-red-700 uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {srv.descontos.map((v: any, i: number) => (
                    <tr key={i} className="border-b border-border/40 hover:bg-muted/10">
                      <td className="py-1.5 px-4">
                        <span className="font-mono text-muted-foreground mr-2">{v.codigo}</span>
                        {v.nome}
                      </td>
                      <td className="py-1.5 px-3 text-center font-mono text-muted-foreground">
                        {v.fator != null ? `${(v.fator * 100).toFixed(3)}%` : '—'}
                      </td>
                      <td className="py-1.5 px-3 text-center font-mono text-muted-foreground">
                        {v.referencia != null ? formatCurrency(v.referencia) : '—'}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono font-semibold text-red-600">
                        {formatCurrency(v.valor)}
                      </td>
                    </tr>
                  ))}
                  {srv.descontos.length === 0 && (
                    <tr><td colSpan={4} className="py-3 px-4 text-center text-muted-foreground italic">Sem descontos</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-red-50/60 border-t border-border">
                    <td colSpan={3} className="py-1.5 px-4 font-bold text-red-800 uppercase text-[11px]">Total Descontos</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-red-800">{formatCurrency(srv.totalDescontos)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Rodapé — Líquido */}
          <div className="flex items-center justify-between px-6 py-3 bg-[#0d1424]">
            <div className="flex gap-6 text-xs">
              {srv.basePrevidencia != null && (
                <span className="text-slate-400">Base Prev.: <span className="font-mono text-slate-300">{formatCurrency(srv.basePrevidencia)}</span></span>
              )}
              {srv.baseIrrf != null && (
                <span className="text-slate-400">Base IRRF: <span className="font-mono text-slate-300">{formatCurrency(srv.baseIrrf)}</span></span>
              )}
            </div>
            <div className="text-right">
              <span className="text-slate-400 text-xs uppercase tracking-wider mr-3">Líquido</span>
              <span className="text-white font-mono font-bold text-base">{formatCurrency(srv.totalLiquido)}</span>
            </div>
          </div>
        </div>
      ))}

      {/* Totais gerais */}
      <div className="bg-[#0d1424] text-white rounded-xl p-5 print:rounded-none mt-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wider">Totais da Folha — {folha.competencia}</p>
            <p className="text-slate-300 text-sm mt-1">{TIPO_FOLHA_LABELS[folha.tipo as TipoFolha]} · {folha.totalServid} servidor(es)</p>
          </div>
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-slate-400 text-[10px] uppercase tracking-wider">Total Proventos</p>
              <p className="font-mono text-emerald-400 font-bold text-lg mt-0.5">{formatCurrency(folha.totalProventos)}</p>
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-[10px] uppercase tracking-wider">Total Descontos</p>
              <p className="font-mono text-red-400 font-bold text-lg mt-0.5">{formatCurrency(folha.totalDescontos)}</p>
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-[10px] uppercase tracking-wider">Total Líquido</p>
              <p className="font-mono text-white font-bold text-lg mt-0.5">{formatCurrency(folha.totalLiquido)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Relatório Sintético ──────────────────────────────────────────────────────

function RelatorioSintetico({ dados }: { dados: any }) {
  const { folha, linhas } = dados

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm print:shadow-none print:border-none">
      {/* Cabeçalho */}
      <div className="bg-[#0d1424] text-white px-6 py-5 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            {folha.competencia} — {TIPO_FOLHA_LABELS[folha.tipo as TipoFolha]}
          </p>
          <h2 className="text-base font-semibold text-white mt-0.5">
            Folha de Pagamento — Relatório Sintético
          </h2>
        </div>
        <div className="text-right text-[10px] text-slate-400 font-mono">
          <p>GovHRPub</p>
          <p className="mt-0.5 text-slate-500">Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Funcionário</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cargo</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vl. Bruto</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descontos</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vl. Líquido</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l: any) => (
              <tr key={l.id} className="border-b border-border/50 hover:bg-muted/10">
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{l.matricula}</td>
                <td className="px-4 py-2.5 font-medium text-foreground">{l.nome}</td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground">{l.cargo}</td>
                <td className="px-4 py-2.5 text-right font-mono text-sm text-foreground">{formatCurrency(l.totalProventos)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-sm text-red-600">{formatCurrency(l.totalDescontos)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-sm font-bold text-foreground">{formatCurrency(l.totalLiquido)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/20">
              <td colSpan={3} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total — {folha.totalServid} servidor(es)
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold text-foreground">{formatCurrency(folha.totalProventos)}</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-red-600">{formatCurrency(folha.totalDescontos)}</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-foreground">{formatCurrency(folha.totalLiquido)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Resumo final */}
      <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
        <div className="px-6 py-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Bruto</p>
          <p className="font-mono font-bold text-lg text-foreground mt-1">{formatCurrency(folha.totalProventos)}</p>
        </div>
        <div className="px-6 py-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Descontos</p>
          <p className="font-mono font-bold text-lg text-red-600 mt-1">{formatCurrency(folha.totalDescontos)}</p>
        </div>
        <div className="px-6 py-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Líquido</p>
          <p className="font-mono font-bold text-lg text-emerald-700 mt-1">{formatCurrency(folha.totalLiquido)}</p>
        </div>
      </div>
    </div>
  )
}
