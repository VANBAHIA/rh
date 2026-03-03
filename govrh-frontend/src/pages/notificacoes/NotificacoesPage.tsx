import { useState, useEffect } from 'react'
import { Bell, Check, CheckCheck, TrendingUp, DollarSign, Palmtree, FileText, Shield, Info, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { notificacoesApi } from '@/services/modules'
import type { Notificacao, TipoNotificacao } from '@/types/modules'
import { formatDate, cn } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'
import { useNavigate } from 'react-router-dom'

const TIPO_ICON: Record<TipoNotificacao, React.ElementType> = {
  PROGRESSAO:        TrendingUp,
  FERIAS:            Palmtree,
  LICENCA:           FileText,
  FOLHA:             DollarSign,
  ESTAGIO_PROBATORIO: Clock,
  SISTEMA:           Info,
  DISCIPLINAR:       Shield,
}

const TIPO_COLOR: Record<TipoNotificacao, string> = {
  PROGRESSAO:        'bg-gov-100 text-gov-600',
  FERIAS:            'bg-blue-100 text-blue-600',
  LICENCA:           'bg-amber-100 text-amber-600',
  FOLHA:             'bg-emerald-100 text-emerald-600',
  ESTAGIO_PROBATORIO: 'bg-purple-100 text-purple-600',
  SISTEMA:           'bg-gray-100 text-gray-600',
  DISCIPLINAR:       'bg-red-100 text-red-600',
}

export default function NotificacoesPage() {
  const navigate = useNavigate()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(true)
  const [soNaoLidas, setSoNaoLidas] = useState(false)

  const fetch = async () => {
    setLoading(true)
    try {
      const params: any = { limit: 50 }
      if (soNaoLidas) params.lida = false
      const { data: res } = await notificacoesApi.listar(params)
      setNotificacoes((res as any).data ?? [])
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [soNaoLidas])

  const handleMarcarLida = async (id: string) => {
    try {
      await notificacoesApi.marcarLida(id)
      setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
    } catch { /* silent */ }
  }

  const handleMarcarTodasLidas = async () => {
    try {
      await notificacoesApi.marcarTodasLidas()
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
      toast({ title: 'Todas as notificações marcadas como lidas.' })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    }
  }

  const naoLidas = notificacoes.filter(n => !n.lida).length

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            Notificações
            {naoLidas > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gov-600 text-white text-xs font-bold">
                {naoLidas > 9 ? '9+' : naoLidas}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Alertas e atualizações do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant={soNaoLidas ? 'gov' : 'outline'} size="sm" onClick={() => setSoNaoLidas(!soNaoLidas)}>
            {soNaoLidas ? 'Ver todas' : 'Apenas não lidas'}
          </Button>
          {naoLidas > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarcarTodasLidas}>
              <CheckCheck className="w-4 h-4 mr-2" />Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {loading ? Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 flex gap-4">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-full" /></div>
          </div>
        )) : notificacoes.length === 0 ? (
          <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Bell className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">{soNaoLidas ? 'Nenhuma notificação não lida.' : 'Nenhuma notificação.'}</p>
          </div>
        ) : notificacoes.map(n => {
          const Icon = TIPO_ICON[n.tipo] ?? Info
          return (
            <div
              key={n.id}
              onClick={() => { if (!n.lida) handleMarcarLida(n.id); if (n.link) navigate(n.link) }}
              className={cn(
                'bg-card border rounded-xl p-4 flex gap-4 cursor-pointer transition-all hover:border-gov-200',
                !n.lida ? 'border-gov-200 bg-gov-50/30' : 'border-border',
              )}
            >
              {/* Ícone */}
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', TIPO_COLOR[n.tipo])}>
                <Icon className="w-4.5 h-4.5" size={18} />
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={cn('text-sm font-medium', !n.lida && 'text-foreground font-semibold')}>
                      {n.titulo}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.mensagem}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(n.criadaEm)}</p>
                    {!n.lida && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                        onClick={e => { e.stopPropagation(); handleMarcarLida(n.id) }}
                        title="Marcar como lida">
                        <Check className="w-3.5 h-3.5 text-gov-600" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Indicador não lida */}
              {!n.lida && (
                <div className="w-2 h-2 rounded-full bg-gov-600 shrink-0 mt-2" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
