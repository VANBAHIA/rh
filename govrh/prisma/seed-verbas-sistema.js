// =============================================================
// GovHRPub — Seed de Verbas Reservadas do Sistema
// Cria verbas de sistema para todos os tenants ativos.
// Verbas isSistema=true são protegidas contra edição/exclusão.
// Uso: node prisma/seed-verbas-sistema.js
// =============================================================

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const VERBAS_SISTEMA = [
  // ── PROVENTOS ────────────────────────────────────────────────
  {
    codigoSistema: 'SYS_VENC_BASE',
    codigo:        '0001',
    nome:          'Vencimento Base',
    tipo:          'PROVENTO',
    incideIrrf:    true,
    incideRpps:    true,
    incideInss:    true,
    incideFgts:    true,
    incide13:      true,
    incideFerias:  true,
    isFixo:        true,
  },
  {
    codigoSistema: 'SYS_13_PRIMEIRA',
    codigo:        '0002',
    nome:          '13º Salário - 1ª Parcela',
    tipo:          'PROVENTO',
    incideIrrf:    false,
    incideRpps:    true,
    incideInss:    true,
    incideFgts:    true,
    incide13:      false,
    incideFerias:  false,
    isFixo:        false,
  },
  {
    codigoSistema: 'SYS_13_SEGUNDA',
    codigo:        '0003',
    nome:          '13º Salário - 2ª Parcela',
    tipo:          'PROVENTO',
    incideIrrf:    true,
    incideRpps:    true,
    incideInss:    true,
    incideFgts:    true,
    incide13:      false,
    incideFerias:  false,
    isFixo:        false,
  },
  {
    codigoSistema: 'SYS_FERIAS',
    codigo:        '0004',
    nome:          'Férias',
    tipo:          'PROVENTO',
    incideIrrf:    true,
    incideRpps:    true,
    incideInss:    true,
    incideFgts:    true,
    incide13:      false,
    incideFerias:  false,
    isFixo:        false,
  },
  {
    codigoSistema: 'SYS_ABONO_FERIAS',
    codigo:        '0005',
    nome:          'Abono Pecuniário de Férias (1/3)',
    tipo:          'PROVENTO',
    incideIrrf:    true,
    incideRpps:    false,
    incideInss:    false,
    incideFgts:    false,
    incide13:      false,
    incideFerias:  false,
    isFixo:        false,
  },
  // ── DESCONTOS ────────────────────────────────────────────────
  {
    codigoSistema: 'SYS_RPPS',
    codigo:        '0101',
    nome:          'Contribuição Previdenciária (RPPS)',
    tipo:          'DESCONTO',
    incideIrrf:    false,
    incideRpps:    false,
    incideInss:    false,
    incideFgts:    false,
    incide13:      false,
    incideFerias:  false,
    isFixo:        true,
  },
  {
    codigoSistema: 'SYS_INSS',
    codigo:        '0102',
    nome:          'Contribuição Previdenciária (INSS)',
    tipo:          'DESCONTO',
    incideIrrf:    false,
    incideRpps:    false,
    incideInss:    false,
    incideFgts:    false,
    incide13:      false,
    incideFerias:  false,
    isFixo:        true,
  },
  {
    codigoSistema: 'SYS_IRRF',
    codigo:        '0103',
    nome:          'Imposto de Renda Retido na Fonte (IRRF)',
    tipo:          'DESCONTO',
    incideIrrf:    false,
    incideRpps:    false,
    incideInss:    false,
    incideFgts:    false,
    incide13:      false,
    incideFerias:  false,
    isFixo:        true,
  },
  {
    codigoSistema: 'SYS_CONSIGNADO',
    codigo:        '0104',
    nome:          'Desconto de Consignado',
    tipo:          'DESCONTO',
    incideIrrf:    false,
    incideRpps:    false,
    incideInss:    false,
    incideFgts:    false,
    incide13:      false,
    incideFerias:  false,
    isFixo:        false,
  },
  // ── COMISSIONADOS ────────────────────────────────────────────
  {
    codigoSistema: 'SYS_GF',
    codigo:        '0006',
    nome:          'Gratificação de Função (GF)',
    tipo:          'PROVENTO',
    incideIrrf:    true,
    incideRpps:    true,
    incideInss:    true,
    incideFgts:    true,
    incide13:      true,
    incideFerias:  true,
    isFixo:        false,
  },
  // ── INFORMATIVOS ─────────────────────────────────────────────
  {
    codigoSistema: 'SYS_BASE_FGTS',
    codigo:        '0201',
    nome:          'Base de Cálculo FGTS',
    tipo:          'INFORMATIVO',
    incideIrrf:    false,
    incideRpps:    false,
    incideInss:    false,
    incideFgts:    false,
    incide13:      false,
    incideFerias:  false,
    isFixo:        false,
  },
  {
    codigoSistema: 'SYS_FGTS',
    codigo:        '0202',
    nome:          'FGTS (8%)',
    tipo:          'INFORMATIVO',
    incideIrrf:    false,
    incideRpps:    false,
    incideInss:    false,
    incideFgts:    false,
    incide13:      false,
    incideFerias:  false,
    isFixo:        false,
  },
];

async function main() {
  console.log('Iniciando seed de verbas de sistema...\n');

  const tenants = await prisma.tenant.findMany({ where: { ativo: true }, select: { id: true, nomeFantasia: true } });

  if (tenants.length === 0) {
    console.log('Nenhum tenant ativo encontrado. Execute o seed principal primeiro.');
    return;
  }

  for (const tenant of tenants) {
    console.log(`Tenant: ${tenant.nomeFantasia} (${tenant.id})`);
    let criadas = 0;

    for (const verba of VERBAS_SISTEMA) {
      await prisma.verba.upsert({
        where: { codigoSistema: verba.codigoSistema },
        create: {
          tenantId:      tenant.id,
          isSistema:     true,
          ativo:         true,
          ...verba,
        },
        update: {
          nome:          verba.nome,
          tipo:          verba.tipo,
          incideIrrf:    verba.incideIrrf,
          incideRpps:    verba.incideRpps,
          incideInss:    verba.incideInss,
          incideFgts:    verba.incideFgts,
          incide13:      verba.incide13,
          incideFerias:  verba.incideFerias,
          isFixo:        verba.isFixo,
          isSistema:     true,
        },
      });
      criadas++;
    }

    console.log(`   ${criadas} verbas de sistema criadas/atualizadas\n`);
  }

  console.log('Seed de verbas de sistema concluido!');
}

main()
  .catch((e) => { console.error('Erro no seed de verbas:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
