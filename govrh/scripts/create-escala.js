#!/usr/bin/env node
require('dotenv').config();
const prisma = require('../src/config/prisma');
const logger = require('../src/config/logger');

async function main() {
  try {
    const escala = await prisma.escalaTrabalho.create({
      data: {
        nome: process.env.ESCALA_NOME || 'Escala de Teste - Admin',
        turno: 'INTEGRAL',
        horaEntrada: process.env.ESCALA_ENTRADA || '08:00',
        horaSaida: process.env.ESCALA_SAIDA || '17:00',
        intervaloMin: parseInt(process.env.ESCALA_INTERVALO_MIN || '60', 10),
        horasDiarias: process.env.ESCALA_HORAS_DIARIAS || '8.00',
        diasSemana: JSON.parse(process.env.ESCALA_DIAS_SEMANA || '[1,2,3,4,5]'),
        toleranciaAtraso: parseInt(process.env.ESCALA_TOLERANCIA || '10', 10),
        tenantId: process.env.TENANT_ID || null,
      },
    });

    console.log('Escala criada:', { id: escala.id, nome: escala.nome });
    process.exit(0);
  } catch (err) {
    logger.error('Erro ao criar escala:', err.message || err);
    console.error(err);
    process.exit(1);
  }
}

main();
