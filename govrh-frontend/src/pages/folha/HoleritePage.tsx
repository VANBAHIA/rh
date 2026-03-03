import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Printer, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { folhaApi } from '@/services/folha'
import { TIPO_FOLHA_LABELS } from '@/types/folha'
import type { TipoFolha } from '@/types/folha'
import { formatCurrency, formatCPF, formatDate } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { toast } from '@/hooks/useToast'
import { confirmToast } from '@/lib/confirm'

interface VerbaItem {
  id: string
  codigo?: string
  nome?: string
  tipo: 'PROVENTO' | 'DESCONTO' | 'INFORMATIVO'
  valor: number
  referencia?: number | null
  observacao?: string | null
}

interface HoleriteData {
  folhaId: string
  competencia: string
  tipo: TipoFolha
  status: string
  servidor: {
    id: string
    matricula: string
    nome: string
    cpf: string
    cargo?: string
    lotacao?: string
    regime?: string
    nivel?: string
    classe?: string
    tabela?: string
  }
  proventos: VerbaItem[]
  descontos: VerbaItem[]
  informativos: VerbaItem[]
  totais: {
    bruto: number
    descontos: number
    liquido: number
    baseIrrf?: number | null
    basePrevidencia?: number | null
    baseFgts?: number | null
  }
}

function VerbaRow({ verba }: { verba: VerbaItem }) {
  return (
    <tr className="border-b border-border/40 hover:bg-muted/20">
      <td className="py-1.5 px-3 font-mono text-xs text-muted-foreground">{verba.codigo ?? '—'}</td>
      <td className="py-1.5 px-3 text-sm text-foreground">{verba.nome ?? verba.observacao ?? '—'}</td>
      <td className="py-1.5 px-3 text-xs text-center text-muted-foreground">
        {verba.referencia != null ? formatCurrency(verba.referencia) : '—'}
      </td>
      <td className={`py-1.5 px-3 text-sm font-mono text-right font-medium ${
        verba.tipo === 'PROVENTO'    ? 'text-emerald-700' :
        verba.tipo === 'DESCONTO'    ? 'text-red-600'     : 'text-foreground/60'
      }`}>
        {verba.tipo === 'INFORMATIVO' ? '—' : formatCurrency(verba.valor)}
      </td>
    </tr>
  )
}

export default function HoleritePage() {
  const { servidorId, competencia } = useParams<{ servidorId: string; competencia: string }>()
  const [searchParams] = useSearchParams()
  const tipo = searchParams.get('tipo') ?? undefined
  const navigate = useNavigate()
  const printRef = useRef<HTMLDivElement>(null)

  const [holerite, setHolerite] = useState<HoleriteData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!servidorId || !competencia) return
    folhaApi
      .holerite(servidorId, competencia, tipo)
      .then(({ data }) => {
        const payload = data.data ?? data
        setHolerite(payload)
      })
      .catch((err) => {
        toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
        navigate(-1)
      })
      .finally(() => setLoading(false))
  }, [servidorId, competencia, tipo, navigate])

  const handlePrint = () => window.print()

  return (
    <div className="space-y-4 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
          {/* reprocessar individual */}
          {holerite && holerite.status !== 'FECHADA' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (!holerite) return;
                const confirmed = await confirmToast(`Reprocessar holerite de ${holerite.servidor.nome}? As informações atuais serão sobrescritas.`)
                if (!confirmed) return
                setLoading(true);
                try {
                  await folhaApi.reprocessarServidor(holerite.folhaId, holerite.servidor.id);
                  toast({ title: 'Holerite reprocessado.' });
                  // recarrega dados
                  const r = await folhaApi.holerite(holerite.servidor.id, holerite.competencia, holerite.tipo);
                  const payload = r.data.data ?? r.data;
                  setHolerite(payload);
                } catch (err) {
                  toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) });
                } finally {
                  setLoading(false);
                }
              }}
            >
              Reprocessar
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-8 space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <div className="space-y-2 mt-6">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        </div>
      ) : holerite ? (
        <div ref={printRef} className="bg-white border border-border rounded-xl overflow-hidden shadow-sm print:shadow-none print:border-none">
          {/* Cabeçalho */}
          <div className="bg-[#0f1629] text-white px-8 py-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-[10px] font-mono uppercase tracking-widest">Prefeitura Municipal</p>
                <h1 className="text-xl font-display font-light mt-0.5">
                  Contracheque — <span className="text-amber-400 font-semibold">{holerite.competencia}</span>
                </h1>
                <p className="text-slate-400 text-sm mt-0.5">{TIPO_FOLHA_LABELS[holerite.tipo]}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-mono">GovHRPub</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Sistema de RH Municipal</p>
              </div>
            </div>
          </div>

          {/* Dados do servidor */}
          <div className="px-8 py-5 border-b border-border bg-slate-50/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Matrícula</p>
                <p className="text-sm font-mono font-semibold text-foreground mt-0.5">{holerite.servidor.matricula}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Nome</p>
                <p className="text-sm font-medium text-foreground mt-0.5">{holerite.servidor.nome}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">CPF</p>
                <p className="text-sm font-mono text-foreground mt-0.5">{formatCPF(holerite.servidor.cpf)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Cargo</p>
                <p className="text-sm text-foreground mt-0.5">{holerite.servidor.cargo ?? '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">PCCV</p>
                <p className="text-sm font-mono text-foreground mt-0.5">
                  {[
                    holerite.servidor.nivel  && `N.${holerite.servidor.nivel}`,
                    holerite.servidor.classe && `Cl.${holerite.servidor.classe}`,
                  ].filter(Boolean).join(' — ') || '—'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Lotação</p>
                <p className="text-sm text-foreground mt-0.5">{holerite.servidor.lotacao ?? '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Vínculo</p>
                <p className="text-sm text-foreground mt-0.5">{holerite.servidor.regime ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Tabela verbas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {/* Proventos */}
            <div>
              <div className="px-4 py-2 bg-emerald-50 border-b border-border">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Proventos</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="py-1.5 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase">Cód.</th>
                    <th className="py-1.5 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase">Descrição</th>
                    <th className="py-1.5 px-3 text-center text-[10px] font-semibold text-muted-foreground uppercase">Ref.</th>
                    <th className="py-1.5 px-3 text-right text-[10px] font-semibold text-muted-foreground uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {holerite.proventos.map(v => <VerbaRow key={v.id} verba={v} />)}
                  {holerite.proventos.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-center text-xs text-muted-foreground italic">Sem proventos</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-50/80">
                    <td colSpan={3} className="py-2 px-3 text-xs font-bold text-emerald-800 uppercase">Total Proventos</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">{formatCurrency(holerite.totais.bruto)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Descontos */}
            <div>
              <div className="px-4 py-2 bg-red-50 border-b border-border">
                <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Descontos</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="py-1.5 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase">Cód.</th>
                    <th className="py-1.5 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase">Descrição</th>
                    <th className="py-1.5 px-3 text-center text-[10px] font-semibold text-muted-foreground uppercase">Ref.</th>
                    <th className="py-1.5 px-3 text-right text-[10px] font-semibold text-muted-foreground uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {holerite.descontos.map(v => <VerbaRow key={v.id} verba={v} />)}
                  {holerite.descontos.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-center text-xs text-muted-foreground italic">Sem descontos</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-red-50/80">
                    <td colSpan={3} className="py-2 px-3 text-xs font-bold text-red-800 uppercase">Total Descontos</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-red-800">{formatCurrency(holerite.totais.descontos)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Bases de cálculo */}
          {(holerite.totais.basePrevidencia != null || holerite.totais.baseIrrf != null || holerite.totais.baseFgts != null || holerite.informativos.length > 0) && (
            <div className="px-8 py-3 border-t border-dashed border-border bg-slate-50/50">
              <div className="flex flex-wrap gap-6">
                {holerite.totais.basePrevidencia != null && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Base Previdência</p>
                    <p className="text-sm font-mono text-foreground mt-0.5">{formatCurrency(holerite.totais.basePrevidencia)}</p>
                  </div>
                )}
                {holerite.totais.baseIrrf != null && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Base IRRF</p>
                    <p className="text-sm font-mono text-foreground mt-0.5">{formatCurrency(holerite.totais.baseIrrf)}</p>
                  </div>
                )}
                {holerite.totais.baseFgts != null && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Base FGTS</p>
                    <p className="text-sm font-mono text-foreground mt-0.5">{formatCurrency(holerite.totais.baseFgts)}</p>
                  </div>
                )}
                {holerite.informativos.map(v => (
                  <div key={v.id}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{v.nome ?? v.observacao}</p>
                    <p className="text-sm font-mono text-foreground mt-0.5">{formatCurrency(v.valor)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rodapé — Líquido */}
          <div className="px-8 py-4 bg-[#0f1629] text-white flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Valor Líquido a Receber</p>
              <p className="text-2xl font-mono font-bold text-white mt-0.5">{formatCurrency(holerite.totais.liquido)}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-[10px]">Gerado em</p>
              <p className="text-slate-300 text-xs font-mono">{formatDate(new Date().toISOString())}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
