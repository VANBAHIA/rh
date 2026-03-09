// ── Enums (espelhando o schema.prisma) ────────────────────────────────────

export type SituacaoFuncional =
  | 'ATIVO'
  | 'AFASTADO'
  | 'CEDIDO'
  | 'LICENCA'
  | 'SUSPENSO'
  | 'EXONERADO'
  | 'APOSENTADO'
  | 'FALECIDO'

export type RegimeJuridico =
  | 'ESTATUTARIO'
  | 'CELETISTA'
  | 'COMISSIONADO'
  | 'ESTAGIARIO'
  | 'TEMPORARIO'
  | 'AGENTE_POLITICO'

export type Sexo = 'MASCULINO' | 'FEMININO' | 'NAO_INFORMADO'

export type EstadoCivil =
  | 'SOLTEIRO'
  | 'CASADO'
  | 'DIVORCIADO'
  | 'VIUVO'
  | 'UNIAO_ESTAVEL'
  | 'SEPARADO'

export type CorRaca = 'BRANCA' | 'PRETA' | 'PARDA' | 'AMARELA' | 'INDIGENA' | 'NAO_INFORMADO'

export type TurnoTrabalho = 'MANHA' | 'TARDE' | 'NOITE' | 'INTEGRAL' | 'PLANTAO_12x36' | 'PLANTAO_24x48'

export type TipoAlteracaoVinculo =
  | 'ADMISSAO'
  | 'REINTEGRACAO'
  | 'POSSE'
  | 'EXERCICIO'
  | 'PROGRESSAO_HORIZONTAL'
  | 'PROGRESSAO_VERTICAL'
  | 'ENQUADRAMENTO'
  | 'TRANSFERENCIA_LOTACAO'
  | 'MUDANCA_REGIME'
  | 'MUDANCA_JORNADA'
  | 'MUDANCA_CARGO'
  | 'AFASTAMENTO'
  | 'RETORNO_AFASTAMENTO'
  | 'SUSPENSAO'
  | 'CESSAO'
  | 'APOSENTADORIA'
  | 'EXONERACAO'
  | 'FALECIMENTO'
  | 'RESCISAO'

export type TipoProgressao =
  | 'HORIZONTAL'
  | 'VERTICAL_TITULACAO'
  | 'ENQUADRAMENTO'
  | 'PROMOCAO'

// ── Entidades ──────────────────────────────────────────────────────────────

export interface GrupoOcupacional {
  id: string
  nome: string
  sigla: string
}

export interface Cargo {
  id: string
  codigo: string
  nome: string
  regimeJuridico?: string
  grupoOcupacional?: GrupoOcupacional
}

export interface Lotacao {
  id: string
  nome: string
  sigla: string
  lotacaoPai?: { id: string; nome: string; sigla: string }
}

export interface TabelaSalarial {
  id: string
  nome: string
  vigencia?: string
}

export interface NivelSalarial {
  id: string
  nivel: string
  classe: string
  vencimentoBase: number
}

export interface VinculoFuncional {
  id: string
  regimeJuridico: RegimeJuridico
  situacaoFuncional: SituacaoFuncional
  cargoId: string
  cargo?: Cargo
  lotacaoId: string
  lotacao?: Lotacao
  tabelaSalarialId: string
  tabelaSalarial?: TabelaSalarial
  nivelSalarialId: string
  nivelSalarial?: NivelSalarial
  cargaHoraria: number
  turno: TurnoTrabalho
  nivelTitulacao?: string
  titulacaoComprovada?: string
  dataAdmissao: string
  dataPosse?: string
  dataExercicio?: string
  dataTermino?: string
  dataEncerramento?: string
  motivoEncerramento?: string
  atual: boolean
  tipoAlteracao: TipoAlteracaoVinculo
  portaria?: string
  lei?: string
  observacao?: string
}

export interface ContatoServidor {
  id: string
  tipo: string
  valor: string
  principal: boolean
  ativo: boolean
}

export interface EnderecoServidor {
  id: string
  logradouro: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade: string
  uf: string
  cep?: string
  principal: boolean
  ativo: boolean
}

export interface Servidor {
  id: string
  matricula: string
  nome: string
  nomeSocial?: string
  cpf: string
  rg?: string
  rgOrgaoEmissor?: string
  rgUf?: string
  rgDataEmissao?: string
  dataNascimento: string
  naturalidade?: string
  nacionalidade: string
  sexo: Sexo
  estadoCivil: EstadoCivil
  corRaca: CorRaca
  pne: boolean
  tipoPne?: string
  fotoUrl?: string
  numeroCtps?: string
  serieCtps?: string
  ufCtps?: string
  pisPasep?: string
  tituloEleitor?: string
  matriculaRpps?: string
  matriculaInss?: string
  vinculos: VinculoFuncional[]
  contatos: ContatoServidor[]
  enderecos: EnderecoServidor[]
  createdAt: string
  updatedAt: string
}

export interface ServidorResumo {
  id: string
  matricula: string
  nome: string
  cpf: string
  biometriaFacial?: { cadastrada: boolean; atualizadaEm: string } | null
  fotoUrl?: string
  vinculos: Array<{
    regimeJuridico: RegimeJuridico
    situacaoFuncional: SituacaoFuncional
    dataAdmissao: string
    nivelTitulacao?: string
    cargaHoraria: number
    turno: TurnoTrabalho
    cargo: { nome: string; codigo: string }
    lotacao: { nome: string; sigla: string }
    nivelSalarial: { nivel: string; classe: string; vencimentoBase: number }
  }>
  contatos: Array<{ tipo: string; valor: string }>
  /** Escala de trabalho atualmente ativa — carregada sob demanda no perfil */
  escalaAtiva?: import('./ponto').ServidorEscala | null
}

export interface HistoricoItem {
  id: string
  tipo: string
  descricao: string
  dataEvento: string
  observacao?: string
  usuario?: string
}

// ── Payloads de API ────────────────────────────────────────────────────────

export interface ListaServidoresParams {
  page?: number
  limit?: number
  q?: string
  search?: string
  situacao?: SituacaoFuncional | ''
  regime?: RegimeJuridico | ''
  vinculo?: RegimeJuridico | ''
  lotacaoId?: string
  cargoId?: string
  orderBy?: string
  order?: 'asc' | 'desc'
}

export interface ListaServidoresResponse {
  data: ServidorResumo[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface VinculoCreatePayload {
  regimeJuridico: RegimeJuridico
  cargoId: string
  tabelaSalarialId: string
  nivelSalarialId: string
  lotacaoId: string
  dataAdmissao: string
  dataPosse?: string
  dataExercicio?: string
  dataTermino?: string
  cargaHoraria?: number
  turno?: TurnoTrabalho
  nivelTitulacao?: string
  titulacaoComprovada?: string
  tipoAlteracao?: TipoAlteracaoVinculo
  portaria?: string
  lei?: string
  observacao?: string
}

export interface ServidorCreatePayload {
  nome: string
  cpf: string
  dataNascimento: string
  sexo: Sexo
  estadoCivil: EstadoCivil
  nomeSocial?: string
  rg?: string
  rgOrgaoEmissor?: string
  rgUf?: string
  naturalidade?: string
  corRaca?: CorRaca
  pne?: boolean
  pisPasep?: string
  tituloEleitor?: string
  vinculo?: VinculoCreatePayload
  contatos?: Array<{ tipo: string; valor: string; principal?: boolean }>
  enderecos?: Array<{
    logradouro: string; numero?: string; complemento?: string
    bairro?: string; cidade: string; uf: string; cep?: string; principal?: boolean
  }>
}

// ── Labels para display ────────────────────────────────────────────────────

export const SITUACAO_LABELS: Record<SituacaoFuncional, string> = {
  ATIVO: 'Ativo',
  AFASTADO: 'Afastado',
  CEDIDO: 'Cedido',
  LICENCA: 'Licença',
  SUSPENSO: 'Suspenso',
  EXONERADO: 'Exonerado',
  APOSENTADO: 'Aposentado',
  FALECIDO: 'Falecido',
}

export const SITUACAO_BADGE: Record<SituacaoFuncional, string> = {
  ATIVO: 'badge-ativo',
  AFASTADO: 'badge-pendente',
  CEDIDO: 'badge-pendente',
  LICENCA: 'badge-licenca',
  SUSPENSO: 'badge-pendente',
  EXONERADO: 'badge-inativo',
  APOSENTADO: 'badge-inativo',
  FALECIDO: 'badge-inativo',
}

export const REGIME_LABELS: Record<RegimeJuridico, string> = {
  ESTATUTARIO: 'Estatutário',
  CELETISTA: 'CLT',
  COMISSIONADO: 'Comissionado',
  ESTAGIARIO: 'Estagiário',
  TEMPORARIO: 'Temporário',
  AGENTE_POLITICO: 'Agente Político',
}

export const ESTADO_CIVIL_LABELS: Record<EstadoCivil, string> = {
  SOLTEIRO: 'Solteiro(a)',
  CASADO: 'Casado(a)',
  DIVORCIADO: 'Divorciado(a)',
  VIUVO: 'Viúvo(a)',
  UNIAO_ESTAVEL: 'União Estável',
  SEPARADO: 'Separado(a)',
}

export const COR_RACA_LABELS: Record<CorRaca, string> = {
  BRANCA: 'Branca',
  PRETA: 'Preta',
  PARDA: 'Parda',
  AMARELA: 'Amarela',
  INDIGENA: 'Indígena',
  NAO_INFORMADO: 'Não informado',
}

export const TURNO_LABELS: Record<TurnoTrabalho, string> = {
  INTEGRAL: 'Integral (40h)',
  MANHA: 'Manhã',
  TARDE: 'Tarde',
  NOITE: 'Noite',
  PLANTAO_12x36: 'Plantão 12x36',
  PLANTAO_24x48: 'Plantão 24x48',
}

export const TITULACAO_LABELS: Record<string, string> = {
  FUNDAMENTAL_INCOMPLETO: 'Fundamental Incompleto',
  FUNDAMENTAL_COMPLETO: 'Fundamental Completo',
  MEDIO_INCOMPLETO: 'Médio Incompleto',
  MEDIO_COMPLETO: 'Médio Completo',
  TECNICO: 'Técnico',
  SUPERIOR_INCOMPLETO: 'Superior Incompleto',
  SUPERIOR_COMPLETO: 'Superior Completo',
  POS_GRADUACAO: 'Pós-Graduação',
  MESTRADO: 'Mestrado',
  DOUTORADO: 'Doutorado',
}

// alias de retrocompatibilidade
export const VINCULO_LABELS = REGIME_LABELS

export type VinculoEmpregaticio = RegimeJuridico
