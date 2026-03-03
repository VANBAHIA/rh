export type TipoProgressao =
  | 'HORIZONTAL'
  | 'VERTICAL_TITULACAO'
  | 'ENQUADRAMENTO'
  | 'PROMOCAO'

export type StatusProgressao =
  | 'PENDENTE'
  | 'APROVADA'
  | 'REJEITADA'
  | 'APLICADA'

export const TIPO_PROGRESSAO_LABELS: Record<TipoProgressao, string> = {
  HORIZONTAL: 'Horizontal (Antiguidade)',
  VERTICAL_TITULACAO: 'Vertical por Titulação',
  ENQUADRAMENTO: 'Enquadramento Especial',
  PROMOCAO: 'Promoção',
}

export const STATUS_PROGRESSAO_LABELS: Record<StatusProgressao, string> = {
  PENDENTE: 'Pendente',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  APLICADA: 'Aplicada',
}

export interface ServidorApto {
  servidorId: string
  matricula: string
  nome: string
  cargo: string
  nivelAtual?: string
  classeAtual?: string
  nivelProximo?: string
  classeProxima?: string
  tipo: TipoProgressao
  dataApto: string           // data em que ficou apto
  mesesIntersticio: number
  salarioAtual: number
  salarioProximo: number
  percentualAumento: number
  observacao?: string
}

export interface SimulacaoProgressao {
  servidorId: string
  nome: string
  matricula: string
  nivelAtual?: string
  classeAtual?: string
  salarioAtual: number
  historico: {
    tipo: TipoProgressao
    de: string
    para: string
    data: string
    salario: number
  }[]
  projecoes: {
    tipo: TipoProgressao
    nivelPrevisto?: string
    classePrevista?: string
    dataEstimada: string
    salarioPrevisto: number
    percentualAumento: number
  }[]
}

export interface ProgressaoRegistro {
  id: string
  servidorId: string
  servidor: { nome: string; matricula: string }
  tipo: TipoProgressao
  status: StatusProgressao
  nivelAnterior?: string
  classeAnterior?: string
  nivelNovo?: string
  classeNova?: string
  salarioAnterior: number
  salarioNovo: number
  dataEfetivacao: string
  observacao?: string
  criadoEm: string
}

export interface LoteProgressaoPayload {
  tipo: TipoProgressao
  servidorIds: string[]
  dataEfetivacao: string
  observacao?: string
}
