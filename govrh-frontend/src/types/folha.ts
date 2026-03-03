export type TipoFolha =
  | 'MENSAL'
  | 'DECIMO_TERCEIRO_PRIMEIRA'
  | 'DECIMO_TERCEIRO_SEGUNDA'
  | 'FERIAS'
  | 'RESCISAO'

export type StatusFolha = 'ABERTA' | 'EM_PROCESSAMENTO' | 'PROCESSADA' | 'FECHADA' | 'RETIFICADA'

export const TIPO_FOLHA_LABELS: Record<TipoFolha, string> = {
  MENSAL: 'Mensal',
  DECIMO_TERCEIRO_PRIMEIRA: '13º Salário — 1ª Parcela',
  DECIMO_TERCEIRO_SEGUNDA: '13º Salário — 2ª Parcela',
  FERIAS: 'Férias',
  RESCISAO: 'Rescisão',
}

export const STATUS_FOLHA_LABELS: Record<StatusFolha, string> = {
  ABERTA: 'Aberta',
  EM_PROCESSAMENTO: 'Processando',
  PROCESSADA: 'Processada',
  FECHADA: 'Fechada',
  RETIFICADA: 'Retificada',
}

export interface FolhaResumo {
  id: string
  competencia: string
  tipo: TipoFolha
  status: StatusFolha
  totalProventos: number
  totalDescontos: number
  totalLiquido: number
  totalServid: number
  processadaEm?: string
  criadoEm?: string
}

export interface VerbaHolerite {
  id: string
  codigo: string
  nome: string
  tipo: 'PROVENTO' | 'DESCONTO' | 'INFORMATIVO'
  valor: number
  referencia?: string        // horas, dias, percentual
}

export interface Holerite {
  id: string
  competencia: string
  tipo: TipoFolha
  servidor: {
    id: string
    matricula: string
    nome: string
    cpf: string
    cargo: string
    nivel?: string
    classe?: string
    lotacao: string
    vinculo: string
  }
  verbas: VerbaHolerite[]
  totalProventos: number
  totalDescontos: number
  totalLiquido: number
  baseFgts?: number
  basePrevid?: number
  baseIrrf?: number
  folhaId: string
}

export interface ProcessarFolhaPayload {
  competencia: string
  tipo: TipoFolha
}
