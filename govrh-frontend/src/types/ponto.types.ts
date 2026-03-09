// src/types/ponto.ts

// ── Enums / literais ─────────────────────────────────────────────

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

export type TipoEscala =
  | 'FIXO'
  | 'REVEZAMENTO'
  | 'PLANTAO_12x36'
  | 'PLANTAO_24x48'

export const TIPO_ESCALA_LABELS: Record<TipoEscala, string> = {
  FIXO:           'Horário Fixo',
  REVEZAMENTO:    'Revezamento de Turnos',
  PLANTAO_12x36:  'Plantão 12×36',
  PLANTAO_24x48:  'Plantão 24×48',
}

/**
 * Dias da semana indexados de 0 (Dom) a 6 (Sáb).
 * Alinhado com new Date().getDay() e com o backend (diaSemana: 0-6).
 */
export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6

// ── Turno por dia da semana ──────────────────────────────────────

export interface TurnoDia {
  diaSemana:    DiaSemana
  entrada:      string                          // 'HH:mm'
  saida:        string                          // 'HH:mm'
  intervaloMin?: number                         // minutos de intervalo
  almoco?:      { inicio: string; fim: string } // horário de almoço opcional
  folga?:       boolean
}

// ── Escala de trabalho ───────────────────────────────────────────

export interface Escala {
  id:                  string
  tenantId:            string | null   // null = escala global do sistema (somente leitura)
  nome:                string
  descricao?:          string
  tipo:                TipoEscala
  cargaHorariaSemanal: number
  toleranciaAtraso:    number
  turnos:              TurnoDia[]
  ativo:               boolean
  createdAt:           string
  updatedAt:           string
  /** Contagem de servidores ativos nessa escala (retornado via _count) */
  _count?: { servidores: number }
  /** Lotações associadas (campo futuro — pode não estar disponível) */
  lotacoes?: Array<{ id: string; nome: string }>
}

// ── Vínculo servidor ↔ escala ────────────────────────────────────

export interface ServidorEscala {
  id:              string
  tenantId:        string
  servidorId:      string
  escalaId:        string
  dataInicio:      string
  dataFim?:        string | null
  ativa:           boolean
  motivoAlteracao?: string | null
  registradoPor?:  string | null
  createdAt:       string
  updatedAt:       string
  escala:          Escala
}

// ── Batidas e resumo mensal ──────────────────────────────────────

export interface BatidasDia {
  data:             string                // ISO date 'YYYY-MM-DD'
  entrada?:         string | null         // 'HH:mm' ou null
  saidaAlmoco?:     string | null
  retornoAlmoco?:   string | null
  saida?:           string | null
  horasTrabalhadas: number | null
  horasDevidas:     number
  saldo:            number                // positivo=extra, negativo=falta
  ocorrencias:      TipoOcorrencia[]
  justificativa?:   string | null
  observacao?:      string | null
  abonado:          boolean
}

export interface ResumoMensal {
  servidorId:       string
  nome:             string
  matricula:        string
  competencia:      string               // 'YYYY-MM'
  diasUteis:        number
  diasTrabalhados:  number
  diasFalta:        number
  horasPrevistas:   number
  horasTrabalhadas: number
  horasExtras:      number
  horasFalta:       number
  saldoBanco:       number
  batidas:          BatidasDia[]
}
