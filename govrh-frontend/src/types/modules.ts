// ── Cargos ────────────────────────────────────────────────────────────────

export interface GrupoCargo {
  id: string
  codigo: string
  nome: string
  descricao?: string
  totalCargos: number
}

export interface Cargo {
  id: string
  codigo: string
  nome: string
  grupoId: string
  grupo: { nome: string; codigo: string }
  cargaHoraria: number
  escolaridadeMinima: string
  regimeJuridico?: string
  descricao?: string
  ativo: boolean
  totalServidores: number
}

export interface NivelSalarial {
  nivel: string
  classe: string
  valor: number
}

export interface TabelaSalarial {
  id: string
  nome: string
  vigencia: string
  ativo: boolean
  niveis: NivelSalarial[]
}

// ── Férias ────────────────────────────────────────────────────────────────

export type StatusFerias = 'PENDENTE' | 'APROVADA' | 'REJEITADA' | 'CANCELADA' | 'GOZADA' | 'EM_GOZO'

export interface PeriodoAquisitivo {
  id: string
  servidorId: string
  servidor: { nome: string; matricula: string }
  dataInicio: string
  dataFim: string
  diasDevidos: number
  diasGozados: number
  diasSaldo: number
  vencimento: string
  status: StatusFerias
  periodoGozo?: { inicio: string; fim: string; dias: number }
}

export const STATUS_FERIAS_LABELS: Record<StatusFerias, string> = {
  PENDENTE: 'Pendente',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  CANCELADA: 'Cancelada',
  GOZADA: 'Gozada',
  EM_GOZO: 'Em gozo',
}

// ── Licenças ──────────────────────────────────────────────────────────────

export type TipoLicenca =
  | 'MEDICA'
  | 'GESTANTE'
  | 'PATERNIDADE'
  | 'NOJO'
  | 'GALA'
  | 'PREMIO'
  | 'CAPACITACAO'
  | 'MANDATO_CLASSISTA'
  | 'SERVICO_MILITAR'
  | 'ACIDENTE_SERVICO'
  | 'DOENCA_FAMILIA'

export type StatusLicenca = 'SOLICITADA' | 'APROVADA' | 'REJEITADA' | 'EM_VIGENCIA' | 'ENCERRADA' | 'PRORROGADA'

export interface Licenca {
  id: string
  servidorId: string
  servidor: { nome: string; matricula: string; cargo: string }
  tipo: TipoLicenca
  status: StatusLicenca
  dataInicio: string
  dataFim: string
  dias: number
  cid?: string
  observacao?: string
  criadoEm: string
  prorrogacoes?: { dataFim: string; dias: number }[]
}

export const TIPO_LICENCA_LABELS: Record<TipoLicenca, string> = {
  MEDICA: 'Licença Médica',
  GESTANTE: 'Licença Gestante',
  PATERNIDADE: 'Licença Paternidade',
  NOJO: 'Licença Nojo (Luto)',
  GALA: 'Licença Gala (Casamento)',
  PREMIO: 'Licença Prêmio',
  CAPACITACAO: 'Afastamento para Capacitação',
  MANDATO_CLASSISTA: 'Mandato Classista',
  SERVICO_MILITAR: 'Serviço Militar',
  ACIDENTE_SERVICO: 'Acidente em Serviço',
  DOENCA_FAMILIA: 'Doença em Família',
}

export const STATUS_LICENCA_LABELS: Record<StatusLicenca, string> = {
  SOLICITADA: 'Solicitada',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  EM_VIGENCIA: 'Em vigência',
  ENCERRADA: 'Encerrada',
  PRORROGADA: 'Prorrogada',
}

// ── Concurso ──────────────────────────────────────────────────────────────

export type StatusConcurso = 'PLANEJADO' | 'INSCRICOES' | 'EM_ANDAMENTO' | 'HOMOLOGADO' | 'ENCERRADO'

export interface Concurso {
  id: string
  numero: string
  objeto: string
  status: StatusConcurso
  edital?: string
  dataAbertura: string
  dataValidade: string
  totalVagas: number
  vagasPreenchidas: number
  cargos: { cargoId: string; cargo: string; vagas: number }[]
  candidatos: number
  empossados: number
}

export const STATUS_CONCURSO_LABELS: Record<StatusConcurso, string> = {
  PLANEJADO: 'Planejado',
  INSCRICOES: 'Inscrições abertas',
  EM_ANDAMENTO: 'Em andamento',
  HOMOLOGADO: 'Homologado',
  ENCERRADO: 'Encerrado',
}

// ── Aposentadoria ─────────────────────────────────────────────────────────

export type TipoAposentadoria =
  | 'VOLUNTARIA'
  | 'ESPECIAL_PROFESSOR'
  | 'COMPULSORIA'
  | 'INVALIDEZ'
  | 'PENSAO_MORTE'

export interface SimulacaoAposentadoria {
  servidorId: string
  nome: string
  matricula: string
  dataNascimento: string
  dataAdmissao: string
  idadeAtual: number
  tempoContribuicaoAnos: number
  tempoMagisterioAnos?: number

  voluntaria: {
    elegivel: boolean
    idadeFaltam?: number
    contribuicaoFaltam?: number
    dataEstimada?: string
    proventoEstimado?: number
  }
  especialProfessor: {
    elegivel: boolean
    idadeFaltam?: number
    magisterioFaltam?: number
    dataEstimada?: string
    proventoEstimado?: number
  }
  compulsoria: {
    dataEstimada: string
    anosRestantes: number
  }
}

// ── Disciplinar ───────────────────────────────────────────────────────────

export type TipoProcesso = 'SINDICANCIA' | 'PAD'
export type StatusProcesso =
  | 'INSTAURADO'
  | 'EM_INSTRUCAO'
  | 'RELATORIO'
  | 'JULGAMENTO'
  | 'ARQUIVADO'
  | 'PENALIDADE_APLICADA'

export type TipoPenalidade =
  | 'ADVERTENCIA'
  | 'SUSPENSAO'
  | 'DEMISSAO'
  | 'CASSACAO_APOSENTADORIA'
  | 'DESTITUICAO_CARGO'

export interface ProcessoDisciplinar {
  id: string
  numero: string
  tipo: TipoProcesso
  status: StatusProcesso
  servidorId: string
  servidor: { nome: string; matricula: string }
  objeto: string
  dataInstauracao: string
  prazoEncerramento?: string
  comissao?: string[]
  penalidade?: TipoPenalidade
  observacao?: string
}

export const TIPO_PROCESSO_LABELS: Record<TipoProcesso, string> = {
  SINDICANCIA: 'Sindicância',
  PAD: 'PAD — Processo Administrativo Disciplinar',
}

export const STATUS_PROCESSO_LABELS: Record<StatusProcesso, string> = {
  INSTAURADO: 'Instaurado',
  EM_INSTRUCAO: 'Em instrução',
  RELATORIO: 'Relatório',
  JULGAMENTO: 'Julgamento',
  ARQUIVADO: 'Arquivado',
  PENALIDADE_APLICADA: 'Penalidade aplicada',
}

// ── Assinatura Digital ────────────────────────────────────────────────────

export type StatusAssinatura = 'PENDENTE' | 'PARCIAL' | 'CONCLUIDA' | 'EXPIRADA' | 'CANCELADA'

export interface DocumentoAssinatura {
  id: string
  titulo: string
  tipo: string
  status: StatusAssinatura
  hash?: string
  criadoPor: string
  criadoEm: string
  prazoAssinatura?: string
  signatarios: {
    id: string
    nome: string
    email: string
    assinou: boolean
    dataAssinatura?: string
  }[]
  totalSignatarios: number
  totalAssinaturas: number
}

export const STATUS_ASSINATURA_LABELS: Record<StatusAssinatura, string> = {
  PENDENTE: 'Pendente',
  PARCIAL: 'Parcialmente assinado',
  CONCLUIDA: 'Concluída',
  EXPIRADA: 'Expirada',
  CANCELADA: 'Cancelada',
}

// ── Notificações ──────────────────────────────────────────────────────────

export type TipoNotificacao =
  | 'PROGRESSAO'
  | 'FERIAS'
  | 'LICENCA'
  | 'FOLHA'
  | 'ESTAGIO_PROBATORIO'
  | 'SISTEMA'
  | 'DISCIPLINAR'

export interface Notificacao {
  id: string
  tipo: TipoNotificacao
  titulo: string
  mensagem: string
  lida: boolean
  criadaEm: string
  link?: string
}
