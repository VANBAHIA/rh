import { cn } from '@/lib/utils'
import { SITUACAO_LABELS, type SituacaoFuncional } from '@/types/servidor'

const SITUACAO_STYLES: Record<SituacaoFuncional, string> = {
  ATIVO:       'bg-emerald-100 text-emerald-700 border-emerald-200',
  LICENCA:     'bg-blue-100 text-blue-700 border-blue-200',
  AFASTADO:    'bg-orange-100 text-orange-700 border-orange-200',
  CEDIDO:      'bg-purple-100 text-purple-700 border-purple-200',
  SUSPENSO:    'bg-amber-100 text-amber-700 border-amber-200',
  APOSENTADO:  'bg-gray-100 text-gray-600 border-gray-200',
  EXONERADO:   'bg-red-100 text-red-600 border-red-200',
  FALECIDO:    'bg-gray-200 text-gray-500 border-gray-300',
}

const SITUACAO_DOT: Record<SituacaoFuncional, string> = {
  ATIVO:       'bg-emerald-500',
  LICENCA:     'bg-blue-500',
  AFASTADO:    'bg-orange-500',
  CEDIDO:      'bg-purple-500',
  SUSPENSO:    'bg-amber-500',
  APOSENTADO:  'bg-gray-400',
  EXONERADO:   'bg-red-500',
  FALECIDO:    'bg-gray-400',
}

interface SituacaoBadgeProps {
  situacao: SituacaoFuncional
  showDot?: boolean
  className?: string
}

export function SituacaoBadge({ situacao, showDot = true, className }: SituacaoBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        SITUACAO_STYLES[situacao],
        className,
      )}
    >
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', SITUACAO_DOT[situacao])} />
      )}
      {SITUACAO_LABELS[situacao]}
    </span>
  )
}
