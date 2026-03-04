// src/modules/auth/schemas.js
const { z } = require('zod');

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('E-mail inválido.'),
    senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.'),
    mfaCode: z.string().length(6).optional(),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token obrigatório.'),
  }),
});

const forgotSchema = z.object({
  body: z.object({
    email: z.string().email(),
    tenantCnpj: z.string().min(14, 'CNPJ inválido.'),
  }),
});

const resetSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    novaSenha: z
      .string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres.')
      .regex(/[A-Z]/, 'Deve conter ao menos uma letra maiúscula.')
      .regex(/[0-9]/, 'Deve conter ao menos um número.'),
  }),
});

const mfaSchema = z.object({
  body: z.object({
    code: z.string().length(6, 'Código MFA deve ter 6 dígitos.'),
  }),
});

module.exports = { loginSchema, refreshSchema, forgotSchema, resetSchema, mfaSchema };
