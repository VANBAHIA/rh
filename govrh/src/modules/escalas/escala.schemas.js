// src/modules/escalas/escala.schemas.js
const { z } = require('zod');

// ── Almoço (opcional por dia) ────────────────────────────────────
const almocoSchema = z.object({
  inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm esperado'),
  fim:    z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm esperado'),
}).optional();

// ── Configuração de aviso por tipo de batida ─────────────────────
// Define a partir de quantos minutos de antecedência OU atraso
// o sistema começa a exibir mensagens informativas no terminal.
// Abaixo do limiar: ponto registra silenciosamente.
// Acima do limiar: registra + exibe aviso contextual.
const avisosBatidaSchema = z.object({
  entrada:       z.number().int().min(0).max(120).optional().default(10),
  saidaAlmoco:   z.number().int().min(0).max(120).optional().default(10),
  retornoAlmoco: z.number().int().min(0).max(120).optional().default(10),
  saida:         z.number().int().min(0).max(120).optional().default(10),
}).optional().default({
  entrada: 10, saidaAlmoco: 10, retornoAlmoco: 10, saida: 10,
});

// ── Turno individual (um dia da semana) ──────────────────────────
// diaSemana: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
const turnoSchema = z.object({
  diaSemana:    z.number().int().min(0).max(6),
  entrada:      z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm esperado'),
  saida:        z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm esperado'),
  intervaloMin: z.number().int().min(0).max(120).optional().default(60),
  almoco:       almocoSchema,
  folga:        z.boolean().optional().default(false),
});

// ── Catálogo — criar escala ──────────────────────────────────────
const criarEscalaSchema = z.object({
  body: z.object({
    nome:                z.string().min(2).max(100),
    descricao:           z.string().max(500).optional(),
    tipo:                z.enum(['FIXO', 'REVEZAMENTO', 'PLANTAO_12x36', 'PLANTAO_24x48']),
    cargaHorariaSemanal: z.number().min(1).max(60).optional().default(40),
    toleranciaAtraso:    z.number().int().min(0).max(60).optional().default(10),
    // Novo: limiar de aviso por tipo de batida
    avisosBatida:        avisosBatidaSchema,
    turnos:              z.array(turnoSchema).min(1, 'Informe ao menos um turno.'),
  }),
});

// ── Catálogo — atualizar escala ──────────────────────────────────
const atualizarEscalaSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    nome:                z.string().min(2).max(100).optional(),
    descricao:           z.string().max(500).optional().nullable(),
    tipo:                z.enum(['FIXO', 'REVEZAMENTO', 'PLANTAO_12x36', 'PLANTAO_24x48']).optional(),
    cargaHorariaSemanal: z.number().min(1).max(60).optional(),
    toleranciaAtraso:    z.number().int().min(0).max(60).optional(),
    // Novo: limiar de aviso por tipo de batida
    avisosBatida:        avisosBatidaSchema,
    turnos:              z.array(turnoSchema).min(1).optional(),
  }),
});

// ── Atribuição de escala ao servidor ────────────────────────────
const atribuirEscalaSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    escalaId:        z.string().uuid(),
    dataInicio:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD esperado'),
    motivoAlteracao: z.string().max(200).optional(),
  }),
});

// ── Filtros de listagem ──────────────────────────────────────────
const filtroEscalaSchema = z.object({
  query: z.object({
    nome:     z.string().optional(),
    tipo:     z.enum(['FIXO', 'REVEZAMENTO', 'PLANTAO_12x36', 'PLANTAO_24x48']).optional(),
    ativo:    z.enum(['true', 'false']).optional(),
    page:     z.string().optional(),
    pageSize: z.string().optional(),
  }),
});

module.exports = {
  criarEscalaSchema,
  atualizarEscalaSchema,
  atribuirEscalaSchema,
  filtroEscalaSchema,
};
