// src/modules/servidores/schemas.js
const { z } = require('zod');

const criarServidorSchema = z.object({
  body: z.object({
    // --- Dados pessoais (model Servidor) ---
    nome: z.string().min(3).max(150),
    cpf: z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido.'),
    dataNascimento: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    sexo: z.enum(['MASCULINO', 'FEMININO', 'NAO_INFORMADO']),
    estadoCivil: z.enum(['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL', 'SEPARADO']),
    nomeSocial: z.string().max(150).optional(),
    nomeMae: z.string().max(150).optional(),
    nomePai: z.string().max(150).optional(),
    rg: z.string().max(20).optional(),
    rgOrgaoEmissor: z.string().max(20).optional(),
    rgUf: z.string().length(2).optional(),
    rgDataEmissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    naturalidade: z.string().max(100).optional(),
    nacionalidade: z.string().max(50).optional(),
    corRaca: z.enum(['BRANCA', 'PRETA', 'PARDA', 'AMARELA', 'INDIGENA', 'NAO_INFORMADO']).optional(),
    pne: z.boolean().optional(),
    tipoPne: z.string().max(200).optional(),
    pisPasep: z.string().max(14).optional(),
    numeroCtps: z.string().max(20).optional(),
    serieCtps: z.string().max(10).optional(),
    ufCtps: z.string().length(2).optional(),
    tituloEleitor: z.string().max(20).optional(),
    matriculaRpps: z.string().max(20).optional(),
    matriculaInss: z.string().max(20).optional(),

    // --- Contatos (criados como ContatoServidor) ---
    emailPessoal: z.string().email().optional(),
    emailInstitucional: z.string().email().optional(),
    celular: z.string().optional(),

    // --- Dados do vínculo funcional (model VinculoFuncional) ---
    regimeJuridico: z.enum(['ESTATUTARIO', 'CELETISTA', 'COMISSIONADO', 'ESTAGIARIO', 'TEMPORARIO', 'AGENTE_POLITICO']),
    cargoId: z.string().uuid(),
    tabelaSalarialId: z.string().uuid(),
    nivelSalarialId: z.string().uuid(),
    lotacaoId: z.string().uuid(),
    dataAdmissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dataPosse: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dataExercicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dataTermino: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    cargaHorariaSemanal: z.number().int().min(1).max(44).optional(),
    turno: z.enum(['MANHA', 'TARDE', 'NOITE', 'INTEGRAL', 'PLANTAO_12x36', 'PLANTAO_24x48']).optional(),
    nivelTitulacao: z.string().max(10).optional(),
    titulacaoComprovada: z.enum([
      'FUNDAMENTAL_INCOMPLETO', 'FUNDAMENTAL_COMPLETO', 'MEDIO_INCOMPLETO', 'MEDIO_COMPLETO',
      'TECNICO', 'SUPERIOR_INCOMPLETO', 'SUPERIOR_COMPLETO', 'POS_GRADUACAO', 'MESTRADO', 'DOUTORADO',
    ]).optional(),
    portaria: z.string().max(100).optional(),
    lei: z.string().max(100).optional(),
    observacao: z.string().max(500).optional(),
  }),
});

const atualizarServidorSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: criarServidorSchema.shape.body.partial(),
});

const filtroSchema = z.object({
  query: z.object({
    nome: z.string().optional(),
    cpf: z.string().optional(),
    matricula: z.string().optional(),
    situacao: z.string().optional(),
    regime: z.string().optional(),
    lotacaoId: z.string().optional(),
    cargoId: z.string().optional(),
    page: z.string().optional(),
    pageSize: z.string().optional(),
  }),
});

const dadosBancariosSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    banco:     z.string().max(10),
    nomeBanco: z.string().max(100),
    agencia:   z.string().max(10),
    conta:     z.string().max(20),
    digito:    z.string().max(2),
    tipoConta: z.enum(['CORRENTE', 'POUPANCA']),
    chavePix:  z.string().max(150).optional(),
  }),
});


module.exports = { criarServidorSchema, atualizarServidorSchema, filtroSchema };
