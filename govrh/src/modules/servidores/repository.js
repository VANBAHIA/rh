// src/modules/servidores/repository.js
// Camada de acesso ao banco — apenas queries, sem regras de negócio

const { getPagination } = require('../../utils/pagination');

const vinculoAtualInclude = {
  cargo: { include: { grupoOcupacional: true } },
  tabelaSalarial: true,
  nivelSalarial: true,
  lotacao: { include: { lotacaoPai: true } },
};

class ServidoresRepository {
  constructor(db) {
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
          id: true,
          matricula: true,
          nome: true,
          cpf: true,
          fotoUrl: true,
          vinculos: {
            where: { atual: true },
            take: 1,
            select: {
              regimeJuridico: true,
              situacaoFuncional: true,
              dataAdmissao: true,
              cargo: { select: { id: true, nome: true, codigo: true } },
              lotacao: { select: { id: true, nome: true, sigla: true } },
              nivelSalarial: { select: { nivel: true, classe: true, vencimentoBase: true } },
            },
          },
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
        vinculos: {
          where: { atual: true },
          take: 1,
          include: vinculoAtualInclude,
        },
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

  async create(dadosServidor) {
    return this.db.servidor.create({
      data: dadosServidor,
      include: {
        vinculos: {
          where: { atual: true },
          take: 1,
          include: vinculoAtualInclude,
        },
      },
    });
  }

  async createVinculo(data) {
    return this.db.vinculoFuncional.create({ data, include: vinculoAtualInclude });
  }

  async updateVinculo(id, data) {
    return this.db.vinculoFuncional.update({ where: { id }, data });
  }

  async findVinculoAtual(servidorId) {
    return this.db.vinculoFuncional.findFirst({
      where: { servidorId, atual: true },
      include: vinculoAtualInclude,
    });
  }

  async update(id, data) {
    return this.db.servidor.update({
      where: { id },
      data,
      include: {
        vinculos: {
          where: { atual: true },
          take: 1,
          include: vinculoAtualInclude,
        },
      },
    });
  }

  async delete(id) {
    return this.db.servidor.delete({ where: { id } });
  }

  async findHistorico(servidorId) {
    return this.db.vinculoFuncional.findMany({
      where: { servidorId },
      orderBy: { createdAt: 'desc' },
      include: {
        cargo: { select: { nome: true, codigo: true } },
        lotacao: { select: { nome: true, sigla: true } },
        nivelSalarial: { select: { nivel: true, classe: true, vencimentoBase: true } },
      },
    });
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

  async updateProgressao(id, data) {
    return this.db.progressao.update({ where: { id }, data });
  }

  async findDocumentos(servidorId) {
    return this.db.documentoServidor.findMany({
      where: { servidorId, ativo: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async gerarMatricula() {
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

    if (filtros.situacao || filtros.regime || filtros.lotacaoId || filtros.cargoId) {
      where.vinculos = {
        some: {
          atual: true,
          ...(filtros.situacao && { situacaoFuncional: filtros.situacao }),
          ...(filtros.regime && { regimeJuridico: filtros.regime }),
          ...(filtros.lotacaoId && { lotacaoId: filtros.lotacaoId }),
          ...(filtros.cargoId && { cargoId: filtros.cargoId }),
        },
      };
    }

    return where;
  }

  // Lista todas as contas
  async findDadosBancarios(servidorId) {
    return this.db.dadosBancarios.findMany({
      where: { servidorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Cria nova conta — desativa as anteriores em transaction
  async createDadosBancarios(servidorId, data) {
    return this.db.$transaction([
      this.db.dadosBancarios.updateMany({
        where: { servidorId, ativa: true },
        data: { ativa: false },
      }),
      this.db.dadosBancarios.create({
        data: { servidorId, ...data, ativa: true },
      }),
    ]);
  }

  // Ativa uma conta específica — desativa as demais
  async ativarConta(servidorId, contaId) {
    return this.db.$transaction([
      this.db.dadosBancarios.updateMany({
        where: { servidorId, ativa: true },
        data: { ativa: false },
      }),
      this.db.dadosBancarios.update({
        where: { id: contaId },
        data: { ativa: true },
      }),
    ]);
  }

}

module.exports = ServidoresRepository;
