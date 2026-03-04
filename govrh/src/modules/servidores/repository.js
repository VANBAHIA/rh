// src/modules/servidores/repository.js
// Camada de acesso ao banco — apenas queries, sem regras de negócio

const { getPagination } = require('../../utils/pagination');

class ServidoresRepository {
  constructor(db) {
    // db é o Prisma client com tenant scope já aplicado
    this.db = db;
  }

  async findAll({ filtros = {}, query = {} }) {
    const { page, pageSize, skip, take } = getPagination(query);

    const where = this._buildWhere(filtros);

    const [servidores, total] = await Promise.all([
      this.db.servidor.findMany({
        where,
        skip,
        take,
        orderBy: { nome: 'asc' },
        select: {
          id: true, matricula: true, nome: true, cpf: true,
          regimeJuridico: true, situacaoFuncional: true,
          dataAdmissao: true, fotoUrl: true,
          cargo: { select: { id: true, nome: true, codigo: true } },
          lotacao: { select: { id: true, nome: true, sigla: true } },
          nivelSalarial: { select: { nivel: true, classe: true, vencimentoBase: true } },
        },
      }),
      this.db.servidor.count({ where }),
    ]);

    return { servidores, total, page, pageSize };
  }

  async findById(id) {
    return this.db.servidor.findUnique({
      where: { id },
      include: {
        cargo: { include: { grupoOcupacional: true } },
        tabelaSalarial: true,
        nivelSalarial: true,
        lotacao: { include: { lotacaoPai: true } },
        dadosBancarios: true,
        dependentes: { where: { ativo: true } },
        documentos: { where: { ativo: true }, orderBy: { createdAt: 'desc' } },
        estagioProbatorio: { include: { avaliacoes: true } },
      },
    });
  }

  async findByCpf(cpf) {
    return this.db.servidor.findFirst({ where: { cpf } });
  }

  async findByMatricula(matricula) {
    return this.db.servidor.findFirst({ where: { matricula } });
  }

  async create(data) {
    return this.db.servidor.create({ data, include: { cargo: true, lotacao: true, nivelSalarial: true } });
  }

  async update(id, data) {
    return this.db.servidor.update({ where: { id }, data, include: { cargo: true, lotacao: true, nivelSalarial: true } });
  }

  async delete(id) {
    return this.db.servidor.delete({ where: { id } });
  }

  async findHistorico(servidorId) {
    return this.db.historicoFuncional.findMany({
      where: { servidorId },
      orderBy: { dataAlteracao: 'desc' },
    });
  }

  async createHistorico(data) {
    return this.db.historicoFuncional.create({ data });
  }

  async findProgressoes(servidorId) {
    return this.db.progressao.findMany({
      where: { servidorId },
      orderBy: { dataCompetencia: 'desc' },
      include: {
        nivelOrigem: true,
        nivelDestino: true,
        cargo: { select: { nome: true } },
      },
    });
  }

  async createProgressao(data) {
    return this.db.progressao.create({ data });
  }

  async findDocumentos(servidorId) {
    return this.db.documentoServidor.findMany({
      where: { servidorId, ativo: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async gerarMatricula(tenantId) {
    // Gera matrícula sequencial por tenant: prefixo ano + sequencial 6 dígitos
    const ano = new Date().getFullYear().toString().slice(2);
    const ultimo = await this.db.servidor.findFirst({
      orderBy: { matricula: 'desc' },
      select: { matricula: true },
    });
    const seq = ultimo
      ? String(parseInt(ultimo.matricula.replace(/\D/g, '')) + 1).padStart(6, '0')
      : '000001';
    return `${ano}${seq}`;
  }

  _buildWhere(filtros) {
    const where = {};
    if (filtros.nome) where.nome = { contains: filtros.nome };
    if (filtros.cpf) where.cpf = { contains: filtros.cpf.replace(/\D/g, '') };
    if (filtros.matricula) where.matricula = { contains: filtros.matricula };
    if (filtros.situacao) where.situacaoFuncional = filtros.situacao;
    if (filtros.regime) where.regimeJuridico = filtros.regime;
    if (filtros.lotacaoId) where.lotacaoId = filtros.lotacaoId;
    if (filtros.cargoId) where.cargoId = filtros.cargoId;
    return where;
  }
}

module.exports = ServidoresRepository;
