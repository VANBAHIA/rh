const { z } = require('zod');
const baseSchemas = require('./schemas');

const desativarServidorSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      motivo: z.string().max(255).optional(),
    })
    .optional(),
});

const criarVinculoSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    cargoId: z.string().uuid().optional(),
    lotacaoId: z.string().uuid().optional(),
    dataInicio: z.string().optional(),
    observacao: z.string().max(500).optional(),
  }),
});

const atualizarVinculoSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    cargoId: z.string().uuid().optional(),
    lotacaoId: z.string().uuid().optional(),
    dataFim: z.string().optional(),
    observacao: z.string().max(500).optional(),
  }),
});

module.exports = {
  ...baseSchemas,
  desativarServidorSchema,
  criarVinculoSchema,
  atualizarVinculoSchema,
};