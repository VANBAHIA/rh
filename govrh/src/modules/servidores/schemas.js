// src/modules/servidores/schemas.js
const { z } = require('zod');

const criarServidorSchema = z.object({
  body: z.object({
    nome: z.string().min(3).max(150),
    cpf: z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido.'),
    dataNascimento: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    sexo: z.enum(['MASCULINO', 'FEMININO', 'NAO_INFORMADO']),
    estadoCivil: z.enum(['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL', 'SEPARADO']),
    escolaridade: z.string(),
    regimeJuridico: z.enum(['ESTATUTARIO', 'CELETISTA', 'COMISSIONADO', 'ESTAGIARIO', 'TEMPORARIO', 'AGENTE_POLITICO']),
    cargoId: z.string().uuid(),
    tabelaSalarialId: z.string().uuid(),
    nivelSalarialId: z.string().uuid(),
    lotacaoId: z.string().uuid(),
    dataAdmissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    cargaHorariaSemanal: z.number().int().min(1).max(44).optional(),
    emailPessoal: z.string().email().optional(),
    emailInstitucional: z.string().email().optional(),
    celular: z.string().optional(),
    // Campos opcionais
    rg: z.string().optional(),
    pne: z.boolean().optional(),
    pisPasep: z.string().optional(),
    dataTermino: z.string().optional(), // Para temporários/estagiários
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

module.exports = { criarServidorSchema, atualizarServidorSchema, filtroSchema };
