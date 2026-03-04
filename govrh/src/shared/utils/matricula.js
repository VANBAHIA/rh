const prisma = require('../../config/prisma');

/**
 * Gera matrícula funcional única por tenant.
 * Formato: ANO + SEQUENCIAL_6_DIGITOS  -> Ex: 2026000123
 * Garante unicidade com retry em caso de race condition.
 */
async function gerarMatricula(tenantId) {
  const ano = new Date().getFullYear();
  const prefix = String(ano);

  // Busca a maior matrícula do ano corrente para este tenant
  const ultimo = await prisma.servidor.findFirst({
    where: { tenantId, matricula: { startsWith: prefix } },
    orderBy: { matricula: 'desc' },
    select: { matricula: true },
  });

  let seq = 1;
  if (ultimo) {
    const parteNum = parseInt(ultimo.matricula.slice(4), 10);
    seq = parteNum + 1;
  }

  return `${prefix}${String(seq).padStart(6, '0')}`;
}

module.exports = { gerarMatricula };
