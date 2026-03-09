// src/types/servidor.ts
import type { ServidorEscala } from './ponto'

// ── Enums ────────────────────────────────────────────────────────

export type SituacaoFuncional =
  | 'ATIVO'
  | 'AFASTADO'
  | 'CEDIDO'
  | 'LICENCA'
  | 'SUSPENSO'
  | 'EXONERADO'
  | 'APOSENTADO'
  | 'FALECIDO'

export type VinculoEmpregaticio =
  | 'ESTATUTARIO'
  | 'CELETISTA'
  | 'COMISSIONADO'
  | 'ESTAGIARIO'
  | 'TEMPORARIO'
  | 'AGENTE_POLITICO'

export const VINCULO_LABELS: Record<VinculoEmpregaticio, string> = {
  ESTATUTARIO:    'Estatutário',
  CELETISTA:      'Celetista',
  COMISSIONADO:   'Comissionado',
  ESTAGIARIO:     'Estagiário',
  TEMPORARIO:     'Temporário',
  AGENTE_POLITICO:'Agente Político',
}

// ── Fragmentos de vínculo (retornados no select da listagem) ─────

export interface NivelSalarialResumo {
  nivel?:         string | null
  classe?:        string | null
  vencimentoBase?: number | null
}

export interface CargoResumo {
  id:     string
  nome:   string
  codigo: string
}

export interface LotacaoResumo {
  id:    string
  nome:  string
  sigla?: string | null
}

export interface VinculoResumo {
  regimeJuridico:    VinculoEmpregaticio
  situacaoFuncional: SituacaoFuncional
  dataAdmissao:      string
  cargo?:            CargoResumo | null
  lotacao?:          LotacaoResumo | null
  nivelSalarial?:    NivelSalarialResumo | null
}

// ── Biometria facial (resumo retornado no select da listagem) ────

export interface BiometriaFacialResumo {
  cadastrada:   boolean
  atualizadaEm: string
}

// ── Servidor resumo (listagem) ────────────────────────────────────

export interface ServidorResumo {
  id:             string
  matricula:      string
  nome:           string
  cpf?:           string | null
  fotoUrl?:       string | null
  vinculos:       VinculoResumo[]
  contatos?:      Array<{ tipo: string; valor: string }> | null

  /** Biometria facial — presente na listagem via select */
  biometriaFacial?: BiometriaFacialResumo | null

  /** Escala ativa do servidor — incluída opcionalmente */
  escalaAtiva?: ServidorEscala | null
}

// ── Parâmetros de listagem ────────────────────────────────────────

export interface ListaServidoresParams {
  page?:     number
  limit?:    number
  orderBy?:  string
  order?:    'asc' | 'desc'
  search?:   string          // nome, matrícula ou CPF
  situacao?: SituacaoFuncional | ''
  vinculo?:  VinculoEmpregaticio | ''
  lotacaoId?: string
  cargoId?:   string
}

// ── Servidor completo (perfil) ────────────────────────────────────

export interface Contato {
  id:        string
  tipo:      string
  valor:     string
  principal: boolean
  ativo:     boolean
}

export interface Endereco {
  id:          string
  logradouro:  string
  numero?:     string
  complemento?: string
  bairro?:     string
  municipio:   string
  uf:          string
  cep?:        string
  principal:   boolean
  ativo:       boolean
}

export interface DadosBancarios {
  id:        string
  banco:     string
  nomeBanco: string
  agencia:   string
  conta:     string
  digito:    string
  tipoConta: 'CORRENTE' | 'POUPANCA'
  chavePix?: string | null
  ativa:     boolean
}

export interface ServidorCompleto extends Omit<ServidorResumo, 'vinculos'> {
  // Dados pessoais extras
  nomeSocial?:     string | null
  rg?:             string | null
  rgOrgaoEmissor?: string | null
  rgUf?:           string | null
  rgDataEmissao?:  string | null
  dataNascimento:  string
  naturalidade?:   string | null
  nacionalidade:   string
  sexo:            'MASCULINO' | 'FEMININO' | 'NAO_INFORMADO'
  estadoCivil:     string
  corRaca:         string
  pne:             boolean
  tipoPne?:        string | null
  pisPasep?:       string | null
  numeroCtps?:     string | null
  serieCtps?:      string | null
  ufCtps?:         string | null
  tituloEleitor?:  string | null
  matriculaRpps?:  string | null
  matriculaInss?:  string | null

  // Relacionamentos completos
  vinculos:        VinculoResumo[]
  contatos:        Contato[]
  enderecos:       Endereco[]
  dadosBancarios:  DadosBancarios[]
  escalaAtiva?:    ServidorEscala | null
  createdAt:       string
  updatedAt:       string
}
