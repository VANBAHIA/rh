const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');
const { anosDeServico } = require('../../shared/utils/date');

// Regras EC 103/2019 — Regras de transição e definitivas (simplificadas)
const REGRAS_APOSENTADORIA = {
  VOLUNTARIA: {
    ESTATUTARIO: { idadeMin: 62, tempoServicoMin: 35, tempoContribuicaoMin: 35 }, // mulher: 57/30/30
    CELETISTA:   { idadeMin: 65, tempoServicoMin: 20 },
  },
  COMPULSORIA: { idadeMin: 75 }, // Todos os regimes — art. 40 §1º II CF
  ESPECIAL_PROFESSOR: { idadeMin: 57, tempoServicoMin: 30, tempoContribuicaoMin: 30 }, // magistério
};

class AposentadoriaService {

  async simular(tenantId, servidorId) {
    const srv = await this._findServidor(tenantId, servidorId);
    const anos = anosDeServico(srv.dataAdmissao);
    const idadeAtual = this._calcularIdade(srv.dataNascimento);
    const vencBase = Number(srv.nivelSalarial?.vencimentoBase || 0);

    // Regras para estatutário (simplificado — regra definitiva EC 103)
    const regra = REGRAS_APOSENTADORIA.VOLUNTARIA[srv.regimeJuridico] || REGRAS_APOSENTADORIA.VOLUNTARIA.CELETISTA;
    const regraEspecial = REGRAS_APOSENTADORIA.ESPECIAL_PROFESSOR;
    const regraCompulsoria = REGRAS_APOSENTADORIA.COMPULSORIA;

    // Voluntária
    const faltaIdade    = Math.max(0, regra.idadeMin - idadeAtual);
    const faltaServico  = Math.max(0, (regra.tempoServicoMin || 35) - anos);
    const aptaVoluntaria = faltaIdade === 0 && faltaServico === 0;

    // Especial professor
    const faltaIdadeProf   = Math.max(0, regraEspecial.idadeMin - idadeAtual);
    const faltaServicoProf = Math.max(0, regraEspecial.tempoServicoMin - anos);
    const aptaEspecial = faltaIdadeProf === 0 && faltaServicoProf === 0;

    // Compulsória
    const faltaCompulsoria = Math.max(0, regraCompulsoria.idadeMin - idadeAtual);

    // Cálculo simplificado do benefício (média das últimas remunerações)
    const beneficioEstimado = aptaVoluntaria
      ? vencBase // Na regra definitiva EC103: média 100% das contribuições — simplificamos como vencimento base
      : null;

    return {
      servidor: { id: srv.id, matricula: srv.matricula, nome: srv.nome, regime: srv.regimeJuridico },
      situacaoAtual: { idadeAtual, anosServico: anos, vencimentoBase: vencBase },
      aposentadoriaVoluntaria: {
        apta: aptaVoluntaria,
        faltaIdade, faltaServico,
        idadeMinima: regra.idadeMin,
        tempoServicoMinimo: regra.tempoServicoMin,
        beneficioEstimado,
        dataEstimada: aptaVoluntaria ? null : this._calcularDataEstimada(srv, regra),
      },
      aposentadoriaEspecialProfessor: {
        apta: aptaEspecial,
        faltaIdadeProf, faltaServicoProf,
        obs: 'Válido apenas para professores com exercício exclusivo em sala de aula.',
      },
      aposentadoriaCompulsoria: {
        faltaAnos: faltaCompulsoria,
        idadeLimite: regraCompulsoria.idadeMin,
        dataEstimada: this._projetarData(srv.dataNascimento, regraCompulsoria.idadeMin),
      },
    };
  }

  _calcularIdade(dataNascimento) {
    if (!dataNascimento) return 0;
    const hoje = new Date();
    const nasc = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    if (hoje < new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate())) idade--;
    return idade;
  }

  _projetarData(dataNascimento, idadeAlvo) {
    if (!dataNascimento) return null;
    const nasc = new Date(dataNascimento);
    return new Date(nasc.getFullYear() + idadeAlvo, nasc.getMonth(), nasc.getDate());
  }

  _calcularDataEstimada(srv, regra) {
    const anos = anosDeServico(srv.dataAdmissao);
    const idadeAtual = this._calcularIdade(srv.dataNascimento);
    const anosParaServico = Math.max(0, (regra.tempoServicoMin || 35) - anos);
    const anosParaIdade   = Math.max(0, regra.idadeMin - idadeAtual);
    const anosEspera = Math.max(anosParaServico, anosParaIdade);
    const data = new Date();
    data.setFullYear(data.getFullYear() + anosEspera);
    return data;
  }

  async listar(tenantId, query = {}, skip = 0, take = 20) {
    const where = { tenantId };
    if (query.tipo)   where.tipo   = query.tipo;
    if (query.status) where.status = query.status;

    const [dados, total] = await prisma.$transaction([
      prisma.aposentadoria.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: {
          servidor: { select: { matricula: true, nome: true, cargo: { select: { nome: true } } } },
        },
      }),
      prisma.aposentadoria.count({ where }),
    ]);
    return { dados, total };
  }

  async pedido(tenantId, { servidorId, tipo, dataRequerimento, observacao }) {
    const srv = await this._findServidor(tenantId, servidorId);
    if (srv.situacaoFuncional !== 'ATIVO') throw Errors.SERVIDOR_INATIVO();

    const existente = await prisma.aposentadoria.findFirst({
      where: { servidorId, status: { in: ['REQUERIDA', 'EM_ANALISE'] } },
    });
    if (existente) throw Errors.ALREADY_EXISTS('Pedido de aposentadoria em andamento');

    return prisma.aposentadoria.create({
      data: {
        tenantId, servidorId,
        tipo,
        status: 'REQUERIDA',
        dataRequerimento: dataRequerimento ? new Date(dataRequerimento) : new Date(),
        observacao,
      },
    });
  }

  async buscar(tenantId, id) {
    const a = await prisma.aposentadoria.findFirst({
      where: { id, tenantId },
      include: {
        servidor: {
          select: { matricula: true, nome: true, dataNascimento: true, dataAdmissao: true,
            cargo: { select: { nome: true } }, nivelSalarial: { select: { vencimentoBase: true } } },
        },
      },
    });
    if (!a) throw Errors.NOT_FOUND('Aposentadoria');
    return a;
  }

  async conceder(tenantId, id, { portaria, dataConcessao, valorBeneficio, observacao }) {
    const a = await this.buscar(tenantId, id);
    if (!['REQUERIDA', 'EM_ANALISE'].includes(a.status)) {
      throw Errors.VALIDATION('Pedido não está em situação que permita concessão.');
    }

    const [aposAtual] = await prisma.$transaction([
      prisma.aposentadoria.update({
        where: { id },
        data: { status: 'CONCEDIDA', portaria, dataConcessao: new Date(dataConcessao), valorBeneficio, observacao },
      }),
      prisma.servidor.update({
        where: { id: a.servidorId },
        data: { situacaoFuncional: 'APOSENTADO' },
      }),
      prisma.historicoFuncional.create({
        data: {
          servidorId: a.servidorId, tenantId,
          dataAlteracao: new Date(dataConcessao),
          tipoAlteracao: 'APOSENTADORIA',
          descricao: `Aposentadoria ${a.tipo} concedida. Portaria: ${portaria}`,
          situacaoAnterior: 'ATIVO', situacaoNova: 'APOSENTADO',
        },
      }),
    ]);

    return aposAtual;
  }

  async indeferir(tenantId, id, { motivo }) {
    await this.buscar(tenantId, id);
    return prisma.aposentadoria.update({ where: { id }, data: { status: 'INDEFERIDA', observacao: motivo } });
  }

  // ── Pensão por Morte ────────────────────────────────────────

  async pensionistas(tenantId, query = {}, skip = 0, take = 20) {
    const where = { tenantId, ativa: true };
    const [dados, total] = await prisma.$transaction([
      prisma.pensao.findMany({
        where, skip, take,
        include: {
          servidorOrigem: { select: { matricula: true, nome: true } },
          dependente: { select: { nome: true, parentesco: true, cpf: true } },
        },
      }),
      prisma.pensao.count({ where }),
    ]);
    return { dados, total };
  }

  async criarPensao(tenantId, { servidorOrigemId, dependenteId, dataInicio, percentual, valorBeneficio, portaria }) {
    const srv = await prisma.servidor.findFirst({ where: { id: servidorOrigemId, tenantId } });
    if (!srv) throw Errors.NOT_FOUND('Servidor de origem');

    const dep = await prisma.dependente.findFirst({ where: { id: dependenteId, servidorId: servidorOrigemId } });
    if (!dep) throw Errors.NOT_FOUND('Dependente');

    // Marca servidor como falecido
    if (srv.situacaoFuncional !== 'FALECIDO') {
      await prisma.servidor.update({ where: { id: servidorOrigemId }, data: { situacaoFuncional: 'FALECIDO' } });
    }

    return prisma.pensao.create({
      data: {
        tenantId, servidorOrigemId, dependenteId,
        dataInicio: new Date(dataInicio),
        percentual, valorBeneficio, portaria, ativa: true,
      },
    });
  }

  async cessarPensao(tenantId, id, { motivo, dataCessacao }) {
    const p = await prisma.pensao.findFirst({ where: { id, tenantId } });
    if (!p) throw Errors.NOT_FOUND('Pensão');
    return prisma.pensao.update({
      where: { id },
      data: { ativa: false, dataCessacao: new Date(dataCessacao), motivoCessacao: motivo },
    });
  }

  async _findServidor(tenantId, servidorId) {
    const srv = await prisma.servidor.findFirst({
      where: { id: servidorId, tenantId },
      include: { nivelSalarial: true },
    });
    if (!srv) throw Errors.NOT_FOUND('Servidor');
    return srv;
  }
}

module.exports = AposentadoriaService;
