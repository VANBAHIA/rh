import { useEffect, useState } from 'react'
import {
  Users, DollarSign, TrendingUp, Palmtree, Clock, AlertCircle,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { dashboardApi } from '@/services/modules'
import { formatCurrency } from '@/lib/utils'

interface Kpis {
  servidoresAtivos: number
  admitidosMes: number
  folhaMes: number
  folhaMesProventos: number
  folhaMesDescontos: number
  folhaMesServidores: number
  folhaMesStatus: string | null
  variacaoFolha: number | null
  progressoesPendentes: number
  feriasMes: number
}

interface Alerta {
  tipo: 'info' | 'warning'
  texto: string
}

interface DashboardData {
  kpis: Kpis
  alertas: Alerta[]
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3 animate-pulse">
      <div className="h-3 bg-muted rounded w-2/3" />
      <div className="h-7 bg-muted rounded w-1/2" />
      <div className="h-2 bg-muted rounded w-1/3" />
    </div>
  )
}

export default function DashboardPage() {
  const { usuario } = useAuthStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.resumo()
      .then(res => setData(res.data?.data ?? res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const kpis = data?.kpis
  const alertas = data?.alertas ?? []

  const variacao = kpis?.variacaoFolha
  const variacaoLabel = variacao != null
    ? `${variacao >= 0 ? '+' : ''}${variacao.toFixed(1)}% vs anterior`
    : 'Sem folha anterior'

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {saudacao}, {usuario?.nome.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {usuario?.tenant.nome} · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="bg-card border border-border rounded-xl p-5 space-y-3 animate-fade-in">
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground font-medium">Servidores Ativos</p>
                <div className="p-2 rounded-lg text-gov-600 bg-gov-50"><Users className="w-4 h-4" /></div>
              </div>
              <p className="text-2xl font-semibold text-foreground">{kpis?.servidoresAtivos.toLocaleString('pt-BR') ?? '—'}</p>
              <p className="text-xs text-muted-foreground">
                {kpis?.admitidosMes ? `+${kpis.admitidosMes} admitido${kpis.admitidosMes > 1 ? 's' : ''} este mês` : 'Sem admissões este mês'}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-3 animate-fade-in" style={{ animationDelay: '0.07s' }}>
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground font-medium">Folha do Mês</p>
                <div className="p-2 rounded-lg text-emerald-600 bg-emerald-50"><DollarSign className="w-4 h-4" /></div>
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {kpis?.folhaMes ? formatCurrency(kpis.folhaMes) : '—'}
              </p>
              <p className="text-xs text-muted-foreground">{variacaoLabel}</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-3 animate-fade-in" style={{ animationDelay: '0.14s' }}>
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground font-medium">Progressões Pendentes</p>
                <div className="p-2 rounded-lg text-amber-600 bg-amber-50"><TrendingUp className="w-4 h-4" /></div>
              </div>
              <p className="text-2xl font-semibold text-foreground">{kpis?.progressoesPendentes ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-3 animate-fade-in" style={{ animationDelay: '0.21s' }}>
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground font-medium">Férias em Andamento</p>
                <div className="p-2 rounded-lg text-blue-600 bg-blue-50"><Palmtree className="w-4 h-4" /></div>
              </div>
              <p className="text-2xl font-semibold text-foreground">{kpis?.feriasMes ?? '—'}</p>
              <p className="text-xs text-muted-foreground">No mês corrente</p>
            </div>
          </>
        )}
      </div>

      {/* Alertas */}
      {(loading || alertas.length > 0) && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Alertas e pendências
          </h2>
          <div className="space-y-2">
            {loading ? (
              <div className="animate-pulse h-10 bg-card border border-border rounded-lg" />
            ) : alertas.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-3 rounded-lg border text-sm animate-fade-in"
                style={{ animationDelay: `${0.3 + i * 0.07}s` }}
              >
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${a.tipo === 'warning' ? 'bg-amber-500' : 'bg-gov-500'}`} />
                <p className="text-foreground/80">{a.texto}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Folha — detalhes rápidos */}
      {!loading && kpis?.folhaMes != null && kpis.folhaMes > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Resumo da folha do mês
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Servidores',  value: kpis.folhaMesServidores?.toLocaleString('pt-BR') ?? '—' },
              { label: 'Proventos',   value: formatCurrency(kpis.folhaMesProventos) },
              { label: 'Descontos',   value: formatCurrency(kpis.folhaMesDescontos) },
              { label: 'Líquido',     value: formatCurrency(kpis.folhaMes) },
            ].map(item => (
              <div key={item.label}>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{item.label}</p>
                <p className="text-lg font-semibold text-foreground mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
