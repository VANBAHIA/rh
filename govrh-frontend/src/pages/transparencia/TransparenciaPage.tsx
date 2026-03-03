import { useState, useEffect } from 'react'
import { Globe, Users, DollarSign, BarChart3, RefreshCw, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { transparenciaApi } from '@/services/modules'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'

type Tab = 'servidores' | 'folha' | 'estatisticas'

export default function TransparenciaPage() {
  const [activeTab, setActiveTab] = useState<Tab>('estatisticas')
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    setLoading(true)
    try {
      if (activeTab === 'estatisticas') {
        const { data: res } = await transparenciaApi.quadroPessoal()
        setDados((res as any).data)
      } else if (activeTab === 'servidores') {
        const { data: res } = await transparenciaApi.remuneracao({ limit: "50" })
        setDados((res as any).data ?? [])
      } else {
        const { data: res } = await transparenciaApi.remuneracao()
        setDados((res as any).data ?? [])
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [activeTab])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Portal da Transparência</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Dados públicos conforme Lei de Acesso à Informação (LAI)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Atualizar
          </Button>
          <Button variant="outline" size="sm">
            <ExternalLink className="w-4 h-4 mr-2" />Portal público
          </Button>
        </div>
      </div>

      {/* Banner LAI */}
      <div className="bg-[#0f1629] text-white rounded-xl p-5 flex items-start gap-4">
        <Globe className="w-8 h-8 text-indigo-300 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Acesso público disponível</p>
          <p className="text-slate-400 text-sm mt-0.5">
            Os endpoints <span className="font-mono text-indigo-300">/api/v1/transparencia/*</span> são públicos (sem JWT) e seguem os requisitos da Lei nº 12.527/2011.
            Dados de remuneração, cargos e quantitativos são publicados automaticamente.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-border">
          {([
            { id: 'estatisticas', label: 'Painel Geral', icon: BarChart3 },
            { id: 'servidores', label: 'Quadro de Servidores', icon: Users },
            { id: 'folha', label: 'Remuneração', icon: DollarSign },
          ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={cn('flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px',
                activeTab === id ? 'border-gov-600 text-gov-600' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Estatísticas */}
          {activeTab === 'estatisticas' && (
            loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            ) : dados ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Total de servidores', value: dados.totalServidores?.toLocaleString('pt-BR') ?? '—', icon: Users, color: 'bg-gov-50 text-gov-600' },
                    { label: 'Servidores ativos', value: dados.servidoresAtivos?.toLocaleString('pt-BR') ?? '—', icon: Users, color: 'bg-emerald-50 text-emerald-600' },
                    { label: 'Folha mensal', value: dados.folhaMensal ? formatCurrency(dados.folhaMensal) : '—', icon: DollarSign, color: 'bg-amber-50 text-amber-600' },
                    { label: 'Média salarial', value: dados.mediaSalarial ? formatCurrency(dados.mediaSalarial) : '—', icon: DollarSign, color: 'bg-blue-50 text-blue-600' },
                  ].map(item => {
                    const Icon = item.icon
                    return (
                      <div key={item.label} className="bg-card border border-border rounded-xl p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                          <div className={cn('p-2 rounded-lg', item.color)}><Icon className="w-3.5 h-3.5" /></div>
                        </div>
                        <p className="text-xl font-semibold text-foreground">{item.value}</p>
                      </div>
                    )
                  })}
                </div>

                {/* Distribuição por cargo/grupo */}
                {dados.porCargo && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Distribuição por grupo funcional</h3>
                    <div className="space-y-2">
                      {dados.porCargo.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <p className="text-sm text-muted-foreground w-40 truncate">{item.grupo}</p>
                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gov-600 rounded-full transition-all"
                              style={{ width: `${(item.total / (dados.totalServidores || 1)) * 100}%` }}
                            />
                          </div>
                          <p className="text-sm font-semibold text-foreground w-12 text-right">{item.total}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null
          )}

          {/* Servidores públicos */}
          {activeTab === 'servidores' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Nome', 'Cargo', 'Lotação', 'Vínculo', 'Situação', 'Remuneração bruta'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                    </tr>
                  )) : Array.isArray(dados) && dados.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">Nenhum dado disponível.</td></tr>
                  ) : Array.isArray(dados) && dados.map((s: any, i: number) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-foreground">{s.nome}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.cargo}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.lotacao}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.vinculo}</td>
                      <td className="px-4 py-3 text-sm">{s.situacao}</td>
                      <td className="px-4 py-3 font-mono text-sm font-semibold">{s.remuneracaoBruta ? formatCurrency(s.remuneracaoBruta) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Remuneração */}
          {activeTab === 'folha' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Competência', 'Tipo', 'Total bruto', 'Total descontos', 'Total líquido', 'Servidores'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                    </tr>
                  )) : Array.isArray(dados) && dados.map((f: any, i: number) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono font-semibold text-foreground">{f.competencia}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{f.tipo}</td>
                      <td className="px-4 py-3 font-mono text-sm">{f.totalBruto ? formatCurrency(f.totalBruto) : '—'}</td>
                      <td className="px-4 py-3 font-mono text-sm text-red-600">{f.totalDesconto ? `− ${formatCurrency(f.totalDesconto)}` : '—'}</td>
                      <td className="px-4 py-3 font-mono text-sm font-bold text-emerald-700">{f.totalLiquido ? formatCurrency(f.totalLiquido) : '—'}</td>
                      <td className="px-4 py-3 text-center">{f.totalServidores ?? '—'}</td>
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
