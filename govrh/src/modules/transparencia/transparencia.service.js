const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');

class TransparenciaService {
  async getRemuneracao({ cnpj, competencia, skip, take }) {
    if (!cnpj) throw Errors.VALIDATION('CNPJ do órgão é obrigatório.');
    const tenant = await prisma.tenant.findUnique({ where: { cnpj } });
    if (!tenant) throw Errors.TENANT_NOT_FOUND();

    const pub = await prisma.publicacaoTransparencia.findFirst({
      where: { tenantId: tenant.id, competencia: competencia || undefined, ativa: true },
      orderBy: { competencia: 'desc' },
    });
    if (!pub) return { dados: [], total: 0 };

    const dados = Array.isArray(pub.dados) ? pub.dados : [];
    return { dados: dados.slice(skip, skip + take), total: dados.length };
  }

  async exportar({ cnpj, competencia, formato = 'json' }) {
    const { dados } = await this.getRemuneracao({ cnpj, competencia, skip: 0, take: 99999 });
    if (formato === 'json') {
      return {
        buffer: Buffer.from(JSON.stringify(dados, null, 2)),
        contentType: 'application/json',
        filename: `transparencia-${competencia || 'atual'}.json`,
      };
    }
    // CSV básico
    const header = 'nome,cargo,lotacao,regime,remuneracaoBruta,descontos,remuneracaoLiquida\n';
    const rows = dados.map(d =>
      `"${d.nome}","${d.cargo}","${d.lotacao}","${d.regime}",${d.remuneracaoBruta},${d.descontos},${d.remuneracaoLiquida}`
    ).join('\n');
    return {
      buffer: Buffer.from(header + rows),
      contentType: 'text/csv',
      filename: `transparencia-${competencia || 'atual'}.csv`,
    };
  }

  async getQuadroPessoal(cnpj) {
    if (!cnpj) throw Errors.VALIDATION('CNPJ do órgão é obrigatório.');
    const tenant = await prisma.tenant.findUnique({ where: { cnpj } });
    if (!tenant) throw Errors.TENANT_NOT_FOUND();

    const [total, porRegime, porLotacao] = await prisma.$transaction([
      prisma.servidor.count({ where: { tenantId: tenant.id, situacaoFuncional: 'ATIVO' } }),
      prisma.servidor.groupBy({
        by: ['regimeJuridico'],
        where: { tenantId: tenant.id, situacaoFuncional: 'ATIVO' },
        _count: true,
      }),
      prisma.servidor.groupBy({
        by: ['lotacaoId'],
        where: { tenantId: tenant.id, situacaoFuncional: 'ATIVO' },
        _count: true,
      }),
    ]);
    return { totalAtivos: total, porRegime, porLotacao };
  }
}

module.exports = TransparenciaService;
