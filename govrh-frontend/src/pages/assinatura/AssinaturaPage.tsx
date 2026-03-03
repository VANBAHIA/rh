import { useState, useEffect, useCallback } from 'react'
import { PenLine, RefreshCw, Check, X, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { assinaturaApi } from '@/services/modules'
import type { DocumentoAssinatura, StatusAssinatura } from '@/types/modules'
import { STATUS_ASSINATURA_LABELS } from '@/types/modules'
import { formatDate, cn } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'

const STATUS_STYLES: Record<StatusAssinatura, string> = {
  PENDENTE:  'bg-amber-100 text-amber-700 border-amber-200',
  PARCIAL:   'bg-blue-100 text-blue-700 border-blue-200',
  CONCLUIDA: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  EXPIRADA:  'bg-red-100 text-red-600 border-red-200',
  CANCELADA: 'bg-gray-100 text-gray-500 border-gray-200',
}

export default function AssinaturaPage() {
  const [documentos, setDocumentos] = useState<DocumentoAssinatura[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await assinaturaApi.pendentes()
      setDocumentos((res as any).data ?? [])
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleAssinar = async (id: string) => {
    setActionId(id)
    try {
      await assinaturaApi.assinar(id)
      toast({ title: 'Documento assinado com sucesso!', description: 'Assinatura registrada com hash SHA-256.' })
      fetch()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setActionId(null) }
  }

  const handleCancelar = async (id: string) => {
    if (!confirm('Cancelar este documento? Esta ação não pode ser desfeita.')) return
    setActionId(id)
    try {
      throw new Error("Cancelamento não disponível")
      toast({ title: 'Documento cancelado.' })
      fetch()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
    } finally { setActionId(null) }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Assinatura Digital</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Documentos com múltiplos signatários — hash SHA-256</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Atualizar
        </Button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-gov-50 border border-gov-200">
        <Shield className="w-4 h-4 text-gov-600 shrink-0 mt-0.5" />
        <p className="text-sm text-gov-700">
          Todos os documentos são assinados com chave assimétrica e o hash SHA-256 é registrado imutavelmente.
          A validade jurídica segue os termos da MP 2.200-2/2001.
        </p>
      </div>

      {/* Lista de documentos */}
      <div className="space-y-3">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-7 w-24 rounded-full" />)}
            </div>
          </div>
        )) : documentos.length === 0 ? (
          <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-16 text-muted-foreground">
            <PenLine className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">Nenhum documento aguardando assinatura.</p>
          </div>
        ) : documentos.map(doc => (
          <div key={doc.id} className="bg-card border border-border rounded-xl p-5 space-y-4 hover:border-gov-200 transition-colors">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{doc.titulo}</h3>
                  <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', STATUS_STYLES[doc.status])}>
                    {STATUS_ASSINATURA_LABELS[doc.status]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{doc.tipo}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Criado por: <strong className="text-foreground">{doc.criadoPor}</strong></span>
                  <span>em {formatDate(doc.criadoEm)}</span>
                  {doc.prazoAssinatura && (
                    <span className={cn(new Date(doc.prazoAssinatura) < new Date() && 'text-red-600 font-semibold')}>
                      Prazo: {formatDate(doc.prazoAssinatura)}
                    </span>
                  )}
                </div>
                {doc.hash && (
                  <p className="text-[10px] font-mono text-muted-foreground/60 mt-1 truncate max-w-xs">
                    SHA-256: {doc.hash}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {(doc.status === 'PENDENTE' || doc.status === 'PARCIAL') && (
                  <>
                    <Button variant="gov" size="sm" onClick={() => handleAssinar(doc.id)}
                      disabled={actionId === doc.id}>
                      <PenLine className="w-3.5 h-3.5 mr-1.5" />Assinar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleCancelar(doc.id)}
                      disabled={actionId === doc.id}
                      className="text-red-500 hover:text-red-600 hover:border-red-200">
                      <X className="w-3.5 h-3.5 mr-1.5" />Cancelar
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Signatários */}
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                Signatários ({doc.totalAssinaturas}/{doc.totalSignatarios})
              </p>
              <div className="flex flex-wrap gap-2">
                {doc.signatarios.map(sig => (
                  <div key={sig.id} className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border',
                    sig.assinou
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-muted/50 border-border text-muted-foreground'
                  )}>
                    {sig.assinou
                      ? <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                      : <div className="w-3 h-3 rounded-full border-2 border-current shrink-0" />}
                    <span>{sig.nome}</span>
                    {sig.assinou && sig.dataAssinatura && (
                      <span className="text-emerald-600/70">· {formatDate(sig.dataAssinatura)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
