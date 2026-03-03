export type TipoOcorrencia =
  | 'FALTA'
  | 'ATRASO'
  | 'SAIDA_ANTECIPADA'
  | 'HORA_EXTRA'
  | 'FERIADO'
  | 'RECESSO'
  | 'ABONO'
  | 'LICENCA'
  | 'FERIAS'

export type StatusPonto = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'AJUSTADO'

export interface BatidasDia {
  data: string
  entrada?: string
  saidaAlmoco?: string
  retornoAlmoco?: string
  saida?: string
  horasTrabalhadas?: number
  horasDevidas: number
  saldo: number           // positivo = extra, negativo = falta
  ocorrencias: TipoOcorrencia[]
  status: StatusPonto
  observacao?: string
}

export interface ResumoMensal {
  servidorId: string
  nome: string
  matricula: string
  competencia: string
  diasUteis: number
  diasTrabalhados: number
  diasFalta: number
  horasPrevistas: number
  horasTrabalhadas: number
  horasExtra: number
  horasDevidas: number
  saldoBanco: number      // banco de horas acumulado
  batidas: BatidasDia[]
}

export interface Escala {
  id: string
  nome: string
  descricao?: string
  tipo: 'FIXO' | 'REVEZAMENTO' | 'PLANTAO_12x36' | 'PLANTAO_24x48'
  cargaHorariaSemanal: number
  diasSemana?: number[]          // 0=Dom ... 6=Sáb
  turnos: {
    diaSemana: number   // 0=Dom, 1=Seg...6=Sáb
    entrada: string
    saida: string
    almoco?: { inicio: string; fim: string }
  }[]
  lotacoes: { id: string; nome: string }[]
  tenantId?: string // presente quando escala pertence a um tenant específico
}

export const TIPO_ESCALA_LABELS: Record<Escala['tipo'], string> = {
  FIXO:          'Horário fixo',
  REVEZAMENTO:   'Revezamento de turnos',
  PLANTAO_12x36: 'Plantão 12×36',
  PLANTAO_24x48: 'Plantão 24×48',
}

export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
