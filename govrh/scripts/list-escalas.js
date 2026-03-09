#!/usr/bin/env node
require('dotenv').config();
const prisma = require('../src/config/prisma');

async function main() {
  try {
    const escalas = await prisma.escalaTrabalho.findMany({ orderBy: { nome: 'asc' } });
    console.log(`Encontradas ${escalas.length} escalas:`);
    escalas.forEach(e => {
      console.log(`- ${e.id} | ${e.nome} | turno=${e.turno} | entrada=${e.horaEntrada} saída=${e.horaSaida}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Erro listando escalas:', err.message || err);
    process.exit(1);
  }
}

main();
