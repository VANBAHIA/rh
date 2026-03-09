const { z } = require('zod');

const vinculoSchema = z.object({
  regimeJuridico:    z.enum(['ESTATUTARIO','CELETISTA','COMISSIONADO','ESTAGIARIO','TEMPORARIO','AGENTE_POLITICO']),
  cargoId:           z.string().uuid(),
  tabelaSalarialId:  z.string().uuid(),
  nivelSalarialId:   z.string().uuid(),
  lotacaoId:         z.string().uuid(),
  dataAdmissao:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataPosse:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dataExercicio:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dataTermino:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cargaHoraria:      z.number().int().positive().optional(),
  turno:             z.enum(['MANHA','TARDE','NOITE','INTEGRAL','PLANTAO_12x36','PLANTAO_24x48']).optional(),
  nivelTitulacao:    z.string().max(10).optional(),
  titulacaoComprovada: z.enum(['FUNDAMENTAL_INCOMPLETO','FUNDAMENTAL_COMPLETO','MEDIO_INCOMPLETO','MEDIO_COMPLETO','TECNICO','SUPERIOR_INCOMPLETO','SUPERIOR_COMPLETO','POS_GRADUACAO','MESTRADO','DOUTORADO']).optional(),
  tipoAlteracao:     z.enum(['ADMISSAO','REINTEGRACAO','POSSE','EXERCICIO','PROGRESSAO_HORIZONTAL','PROGRESSAO_VERTICAL','ENQUADRAMENTO','TRANSFERENCIA_LOTACAO','MUDANCA_REGIME','MUDANCA_JORNADA','MUDANCA_CARGO','AFASTAMENTO','RETORNO_AFASTAMENTO','SUSPENSAO','CESSAO','APOSENTADORIA','EXONERACAO','FALECIMENTO','RESCISAO']).optional(),
  portaria:          z.string().max(100).optional(),
  lei:               z.string().max(100).optional(),
  observacao:        z.string().max(500).optional(),
});

const contatoSchema = z.object({
  tipo:      z.string(),
  valor:     z.string(),
  principal: z.boolean().optional(),
});

const enderecoSchema = z.object({
  logradouro: z.string(),
  numero:     z.string().optional(),
  complemento: z.string().optional(),
  bairro:     z.string().optional(),
  cidade:     z.string(),
  uf:         z.string().length(2),
  cep:        z.string().optional(),
  principal:  z.boolean().optional(),
});

const criarServidorSchema = z.object({
  body: z.object({
    nome:           z.string().min(1).max(150),
    nomeSocial:     z.string().max(150).optional(),
    cpf:            z.string().min(11).max(14),
    rg:             z.string().max(20).optional(),
    rgOrgaoEmissor: z.string().max(20).optional(),
    rgUf:           z.string().length(2).optional().or(z.literal('').transform(() => undefined)),
    rgDataEmissao:  z.string().optional(),
    dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    naturalidade:   z.string().max(100).optional(),
    nacionalidade:  z.string().max(50).optional(),
    sexo:           z.enum(['MASCULINO','FEMININO','NAO_INFORMADO']),
    estadoCivil:    z.enum(['SOLTEIRO','CASADO','DIVORCIADO','VIUVO','UNIAO_ESTAVEL','SEPARADO']),
    corRaca:        z.enum(['BRANCA','PRETA','PARDA','AMARELA','INDIGENA','NAO_INFORMADO']).optional(),
    pne:            z.boolean().optional(),
    tipoPne:        z.string().max(200).optional(),
    fotoUrl:        z.string().url().optional(),
    numeroCtps:     z.string().max(20).optional(),
    serieCtps:      z.string().max(10).optional(),
    ufCtps:         z.string().length(2).optional().or(z.literal('').transform(() => undefined)),
    pisPasep:       z.string().max(14).optional(),
    tituloEleitor:  z.string().max(20).optional(),
    matriculaRpps:  z.string().max(20).optional(),
    matriculaInss:  z.string().max(20).optional(),
    inicioMandato:  z.string().optional(),
    fimMandato:     z.string().optional(),
    cargo_mandato:  z.string().max(100).optional(),
    vinculo:        vinculoSchema.optional(),
    contatos:       z.array(contatoSchema).optional(),
    enderecos:      z.array(enderecoSchema).optional(),
  }),
});

const atualizarServidorSchema = z.object({
  body: z.object({
    nome:           z.string().min(1).max(150).optional(),
    nomeSocial:     z.string().max(150).optional().nullable(),
    cpf:            z.string().min(11).max(14).optional(),
    rg:             z.string().max(20).optional().nullable(),
    rgOrgaoEmissor: z.string().max(20).optional().nullable(),
    rgUf:           z.string().length(2).optional().nullable().or(z.literal('').transform(() => undefined)),
    rgDataEmissao:  z.string().optional().nullable(),
    dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    naturalidade:   z.string().max(100).optional().nullable(),
    nacionalidade:  z.string().max(50).optional(),
    sexo:           z.enum(['MASCULINO','FEMININO','NAO_INFORMADO']).optional(),
    estadoCivil:    z.enum(['SOLTEIRO','CASADO','DIVORCIADO','VIUVO','UNIAO_ESTAVEL','SEPARADO']).optional(),
    corRaca:        z.enum(['BRANCA','PRETA','PARDA','AMARELA','INDIGENA','NAO_INFORMADO']).optional(),
    pne:            z.boolean().optional(),
    tipoPne:        z.string().max(200).optional().nullable(),
    fotoUrl:        z.string().url().optional().nullable(),
    numeroCtps:     z.string().max(20).optional().nullable(),
    serieCtps:      z.string().max(10).optional().nullable(),
    ufCtps:         z.string().length(2).optional().nullable().or(z.literal('').transform(() => undefined)),
    pisPasep:       z.string().max(14).optional().nullable(),
    tituloEleitor:  z.string().max(20).optional().nullable(),
    matriculaRpps:  z.string().max(20).optional().nullable(),
    matriculaInss:  z.string().max(20).optional().nullable(),
    inicioMandato:  z.string().optional().nullable(),
    fimMandato:     z.string().optional().nullable(),
    cargo_mandato:  z.string().max(100).optional().nullable(),
  }),
});

const desativarServidorSchema = z.object({
  body: z.object({
    motivo:           z.string().min(1),
    dataEncerramento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    tipoAlteracao:    z.enum(['EXONERACAO','APOSENTADORIA','FALECIMENTO','RESCISAO']).optional(),
  }),
});

const criarVinculoSchema = z.object({
  body: vinculoSchema.extend({
    tipoAlteracao: z.enum(['ADMISSAO','REINTEGRACAO','POSSE','EXERCICIO','PROGRESSAO_HORIZONTAL','PROGRESSAO_VERTICAL','ENQUADRAMENTO','TRANSFERENCIA_LOTACAO','MUDANCA_REGIME','MUDANCA_JORNADA','MUDANCA_CARGO','AFASTAMENTO','RETORNO_AFASTAMENTO','SUSPENSAO','CESSAO','APOSENTADORIA','EXONERACAO','FALECIMENTO','RESCISAO']),
  }),
});

const atualizarVinculoSchema = z.object({
  body: vinculoSchema.partial().extend({
    tipoAlteracao: z.enum(['ADMISSAO','REINTEGRACAO','POSSE','EXERCICIO','PROGRESSAO_HORIZONTAL','PROGRESSAO_VERTICAL','ENQUADRAMENTO','TRANSFERENCIA_LOTACAO','MUDANCA_REGIME','MUDANCA_JORNADA','MUDANCA_CARGO','AFASTAMENTO','RETORNO_AFASTAMENTO','SUSPENSAO','CESSAO','APOSENTADORIA','EXONERACAO','FALECIMENTO','RESCISAO']).optional(),
  }),
});

module.exports = {
  criarServidorSchema,
  atualizarServidorSchema,
  desativarServidorSchema,
  criarVinculoSchema,
  atualizarVinculoSchema,
};
