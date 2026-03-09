const prisma = require('../../config/prisma');

class DashboardService {
  async resumo(tenantId) {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const mmAnterior = String(hoje.getMonth()).padStart(2, '0') || '12';
    const aaAnterior = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
    const competenciaAtual    = `${hoje.getFullYear()}-${mm}`;
    const competenciaAnterior = `${aaAnterior}-${mmAnterior}`;

    const [
      totalServidores,
      admitidosMes,
      folhaAtual,
      folhaAnterior,
      progressoesPendentes,
      feriasMes,
      estagiosVencendo,
    ] = await Promise.all([
      prisma.servidor.count({
        where: {
          tenantId,
          vinculos: { some: { atual: true, situacaoFuncional: 'ATIVO' } },
        },
      }),

      prisma.servidor.count({
        where: {
          tenantId,
          vinculos: { some: { atual: true, dataAdmissao: { gte: inicioMes, lte: fimMes } } },
        },
      }),

      prisma.folhaPagamento.findFirst({
        where: { tenantId, competencia: competenciaAtual, tipo: 'MENSAL' },
        select: { totalLiquido: true, totalProventos: true, totalDescontos: true, status: true, totalServid: true },
      }),

      prisma.folhaPagamento.findFirst({
        where: { tenantId, competencia: competenciaAnterior, tipo: 'MENSAL' },
        select: { totalLiquido: true },
      }),

      prisma.progressao.count({
        where: { servidor: { tenantId }, statusAprovacao: 'PENDENTE' },
      }),

      prisma.ferias.count({
        where: {
          servidor: { tenantId },
          status: 'APROVADO',
          dataInicio: { lte: fimMes },
          dataFim:    { gte: inicioMes },
        },
      }),

      prisma.estagioProbatorio.count({
        where: {
          servidor: { tenantId },
          dataFim: {
            gte: hoje,
            lte: new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      }).catch(() => 0),
    ]);

    const liquidoAtual   = Number(folhaAtual?.totalLiquido   ?? 0);
    const liquidoAnterior = Number(folhaAnterior?.totalLiquido ?? 0);
    const variacaoFolha = liquidoAnterior > 0
      ? ((liquidoAtual - liquidoAnterior) / liquidoAnterior) * 100
      : null;

    const alertas = [];

    if (progressoesPendentes > 0) {
      alertas.push({
        tipo: 'info',
        texto: `${progressoesPendentes} servidor${progressoesPendentes > 1 ? 'es' : ''} com progressão pendente de aprovação`,
      });
    }

    if (!folhaAtual || folhaAtual.status === 'ABERTA') {
      const [m, a] = [mm, hoje.getFullYear()];
      alertas.push({
        tipo: 'warning',
        texto: `Competência ${m}/${a} ainda não foi processada`,
      });
    }

    if (estagiosVencendo > 0) {
      alertas.push({
        tipo: 'warning',
        texto: `${estagiosVencendo} estágio${estagiosVencendo > 1 ? 's' : ''} probatório${estagiosVencendo > 1 ? 's' : ''} vence${estagiosVencendo > 1 ? 'm' : ''} nos próximos 30 dias`,
      });
    }

    return {
      kpis: {
        servidoresAtivos:     totalServidores,
        admitidosMes,
        folhaMes:             liquidoAtual,
        folhaMesProventos:    Number(folhaAtual?.totalProventos ?? 0),
        folhaMesDescontos:    Number(folhaAtual?.totalDescontos ?? 0),
        folhaMesStatus:       folhaAtual?.status ?? null,
        folhaMesServidores:   folhaAtual?.totalServid ?? 0,
        variacaoFolha,
        progressoesPendentes,
        feriasMes,
      },
      alertas,
    };
  }
}

module.exports = DashboardService;
