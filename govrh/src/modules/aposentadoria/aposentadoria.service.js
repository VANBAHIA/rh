const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');
const { anosDeServico } = require('../../shared/utils/date');

const REGRAS_APOSENTADORIA = {
  VOLUNTARIA: {
    ESTATUTARIO: { idadeMin: 62, tempoServicoMin: 35 },
    CELETISTA:   { idadeMin: 65, tempoServicoMin: 20 },
  },
  COMPULSORIA:        { idadeMin: 75 },
  ESPECIAL_PROFESSOR: { idadeMin: 57, tempoServicoMin: 30 },
};

class AposentadoriaService {

  async simular(tenantId, servidorId) {
    const srv = await this._findServidor(tenantId, servidorId);
    const vinculo = srv.vinculos[0];

    const anos        = anosDeServico(vinculo.dataAdmissao);
    const idadeAtual  = this._calcularIdade(srv.dataNascimento);
    const vencBase    = Number(vinculo.nivelSalarial?.vencimentoBase || 0);
    const regime      = vinculo.regimeJuridico;

    const regra           = REGRAS_APOSENTADORIA.VOLUNTARIA[regime] || REGRAS_APOSENTADORIA.VOLUNTARIA.CELETISTA;
    const regraEspecial   = REGRAS_APOSENTADORIA.ESPECIAL_PROFESSOR;
    const regraCompulsoria = REGRAS_APOSENTADORIA.COMPULSORIA;

    const faltaIdade   = Math.max(0, regra.idadeMin - idadeAtual);
    const faltaServico = Math.max(0, (regra.tempoServicoMin || 35) - anos);
    const aptaVoluntaria = faltaIdade === 0 && faltaServico === 0;

    const faltaIdadeProf   = Math.max(0, regraEspecial.idadeMin - idadeAtual);
    const faltaServicoProf = Math.max(0, regraEspecial.tempoServicoMin - anos);
    const aptaEspecial = faltaIdadeProf === 0 && faltaServicoProf === 0;

    const faltaCompulsoria = Math.max(0, regraCompulsoria.idadeMin - idadeAtual);

    return {
      servidor: { id: srv.id, matricula: srv.matricula, nome: srv.nome, regime },
      situacaoAtual: { idadeAtual, anosServico: anos, vencimentoBase: vencBase },
      aposentadoriaVoluntaria: {
        apta: aptaVoluntaria,
        faltaIdade, faltaServico,
        idadeMinima:        regra.idadeMin,
        tempoServicoMinimo: regra.tempoServicoMin,
        beneficioEstimado:  aptaVoluntaria ? vencBase : null,
        dataEstimada:       aptaVoluntaria ? null : this._calcularDataEstimada(vinculo.dataAdmissao, srv.dataNascimento, regra),
      },
      aposentadoriaEspecialProfessor: {
        apta: aptaEspecial,
        faltaIdadeProf, faltaServicoProf,
        obs: 'Válido apenas para professores com exercício exclusivo em sala de aula.',
      },
      aposentadoriaCompulsoria: {
        faltaAnos:    faltaCompulsoria,
        idadeLimite:  regraCompulsoria.idadeMin,
        dataEstimada: this._projetarData(srv.dataNascimento, regraCompulsoria.idadeMin),
      },
    };
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
          servidor: {
            select: {
              matricula: true,
              nome: true,
              vinculos: {
                where: { atual: true },
                take: 1,
                select: { cargo: { select: { nome: true } } },
              },
            },
          },
        },
      }),
      prisma.aposentadoria.count({ where }),
    ]);
    return { dados, total };
  }

  async pedido(tenantId, { servidorId, tipo, dataRequerimento, observacao }) {
    const srv = await this._findServidor(tenantId, servidorId);
    const vinculo = srv.vinculos[0];
    if (vinculo.situacaoFuncional !== 'ATIVO') throw Errors.SERVIDOR_INATIVO();

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
          select: {
            matricula: true,
            nome: true,
            dataNascimento: true,
            vinculos: {
              where: { atual: true },
              take: 1,
              select: {
                dataAdmissao: true,
                cargo:        { select: { nome: true } },
                nivelSalarial: { select: { vencimentoBase: true } },
              },
            },
          },
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

    const vinculo = await prisma.vinculoFuncional.findFirst({
      where: { servidorId: a.servidorId, atual: true },
    });

    const ops = [
      prisma.aposentadoria.update({
        where: { id },
        data: { status: 'CONCEDIDA', portaria, dataConcessao: new Date(dataConcessao), valorBeneficio, observacao },
      }),
    ];

    if (vinculo) {
      ops.push(
        prisma.vinculoFuncional.update({
          where: { id: vinculo.id },
          data: {
            situacaoFuncional:  'APOSENTADO',
            dataEncerramento:   new Date(dataConcessao),
            motivoEncerramento: `Aposentadoria concedida. Portaria: ${portaria}`,
            tipoAlteracao:      'APOSENTADORIA',
            portaria,
            atual:              false,
          },
        })
      );
    }

    const [aposAtual] = await prisma.$transaction(ops);
    return aposAtual;
  }

  async indeferir(tenantId, id, { motivo }) {
    await this.buscar(tenantId, id);
    return prisma.aposentadoria.update({ where: { id }, data: { status: 'INDEFERIDA', observacao: motivo } });
  }

  async pensionistas(tenantId, query = {}, skip = 0, take = 20) {
    const [dados, total] = await prisma.$transaction([
      prisma.pensao.findMany({
        where: { ativa: true, servidorOrigem: { tenantId } },
        skip, take,
        include: {
          servidorOrigem: { select: { matricula: true, nome: true } },
          dependente:     { select: { nome: true, grauParentesco: true, cpf: true } },
        },
      }),
      prisma.pensao.count({ where: { ativa: true, servidorOrigem: { tenantId } } }),
    ]);
    return { dados, total };
  }

  async criarPensao(tenantId, { servidorOrigemId, dependenteId, dataInicio, percentual, valorBeneficio, portaria }) {
    const srv = await prisma.servidor.findFirst({ where: { id: servidorOrigemId, tenantId } });
    if (!srv) throw Errors.NOT_FOUND('Servidor de origem');

    const dep = await prisma.dependente.findFirst({ where: { id: dependenteId, servidorId: servidorOrigemId } });
    if (!dep) throw Errors.NOT_FOUND('Dependente');

    const vinculo = await prisma.vinculoFuncional.findFirst({
      where: { servidorId: servidorOrigemId, atual: true },
    });

    const ops = [];

    if (vinculo && vinculo.situacaoFuncional !== 'FALECIDO') {
      ops.push(
        prisma.vinculoFuncional.update({
          where: { id: vinculo.id },
          data: {
            situacaoFuncional:  'FALECIDO',
            tipoAlteracao:      'FALECIMENTO',
            dataEncerramento:   new Date(dataInicio),
            atual:              false,
          },
        })
      );
    }

    ops.push(
      prisma.pensao.create({
        data: {
          servidorOrigemId, dependenteId,
          dataInicio:     new Date(dataInicio),
          percentual, valorBeneficio, portaria, ativa: true,
        },
      })
    );

    const results = await prisma.$transaction(ops);
    return results[results.length - 1];
  }

  async cessarPensao(tenantId, id, { motivo, dataCessacao }) {
    const p = await prisma.pensao.findFirst({
      where: { id, servidorOrigem: { tenantId } },
    });
    if (!p) throw Errors.NOT_FOUND('Pensão');
    return prisma.pensao.update({
      where: { id },
      data: { ativa: false, dataFim: new Date(dataCessacao), motivoFim: motivo },
    });
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

  _calcularDataEstimada(dataAdmissao, dataNascimento, regra) {
    const anos        = anosDeServico(dataAdmissao);
    const idadeAtual  = this._calcularIdade(dataNascimento);
    const anosParaServico = Math.max(0, (regra.tempoServicoMin || 35) - anos);
    const anosParaIdade   = Math.max(0, regra.idadeMin - idadeAtual);
    const anosEspera = Math.max(anosParaServico, anosParaIdade);
    const data = new Date();
    data.setFullYear(data.getFullYear() + anosEspera);
    return data;
  }

  async _findServidor(tenantId, servidorId) {
    const srv = await prisma.servidor.findFirst({
      where: { id: servidorId, tenantId },
      include: {
        vinculos: {
          where: { atual: true },
          take: 1,
          include: { nivelSalarial: true },
        },
      },
    });
    if (!srv) throw Errors.NOT_FOUND('Servidor');
    return srv;
  }
}

module.exports = AposentadoriaService;
