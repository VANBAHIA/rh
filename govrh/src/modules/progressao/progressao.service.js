const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');
const { mesesEntreatas, anosDeServico } = require('../../shared/utils/date');

const NIVEL_POR_ESCOLARIDADE = {
  MEDIO:     'I',
  SUPERIOR:  'II',
  POS_LATO:  'III',
  MESTRADO:  'IV',
  DOUTORADO: 'V',
};

const PROXIMO_NIVEL = { I: 'II', II: 'III', III: 'IV', IV: 'V', V: null };

const PROXIMA_CLASSE = {
  I:   { A: 'B', B: 'C', C: null },
  II:  { A: 'B', B: 'C', C: 'D', D: 'E', E: null },
  III: { A: 'B', B: 'C', C: 'D', D: 'E', E: null },
  IV:  { A: 'B', B: 'C', C: 'D', D: 'E', E: null },
  V:   { A: 'B', B: 'C', C: 'D', D: 'E', E: null },
};

class ProgressaoService {

  async aptos(tenantId, query = {}, skip = 0, take = 20) {
    const vinculoFilter = {
      some: {
        atual: true,
        situacaoFuncional: 'ATIVO',
        ...(query.lotacaoId && { lotacaoId: query.lotacaoId }),
        ...(query.cargoId   && { cargoId:   query.cargoId }),
      },
    };

    const servidores = await prisma.servidor.findMany({
      where: { tenantId, vinculos: vinculoFilter },
      include: {
        vinculos: {
          where: { atual: true },
          take: 1,
          include: {
            nivelSalarial: true,
            cargo:   { select: { nome: true, codigo: true } },
            lotacao: { select: { nome: true, sigla: true } },
          },
        },
        progressoes: { orderBy: { dataCompetencia: 'desc' }, take: 1 },
      },
      skip, take,
    });

    const aptos = [];
    for (const srv of servidores) {
      const avaliacao = await this._avaliarAptidao(srv);
      if (avaliacao.apto) {
        const vinculo = srv.vinculos[0];
        aptos.push({
          servidor: { id: srv.id, matricula: srv.matricula, nome: srv.nome, cargo: vinculo?.cargo, lotacao: vinculo?.lotacao },
          ...avaliacao,
        });
      }
    }

    const total = await prisma.servidor.count({ where: { tenantId, vinculos: vinculoFilter } });
    return { dados: aptos, total: aptos.length, totalServidores: total };
  }

  _avaliarAptidao(srv) {
    const vinculo = srv.vinculos?.[0];
    const nivel       = vinculo?.nivelSalarial?.nivel   || 'I';
    const classe      = vinculo?.nivelSalarial?.classe  || 'A';
    const intersticio = vinculo?.nivelSalarial?.intersticio || 24;

    const proximaClasse = (PROXIMA_CLASSE[nivel] || {})[classe];
    if (!proximaClasse) {
      return { apto: false, motivo: 'Servidor já está na classe final do nível.' };
    }

    const ultimaProgressao = srv.progressoes?.[0];
    const dataRef = ultimaProgressao
      ? new Date(ultimaProgressao.dataCompetencia)
      : new Date(vinculo?.dataAdmissao || srv.createdAt);

    const mesesDecorridos = mesesEntreatas(dataRef);

    if (mesesDecorridos < intersticio) {
      return {
        apto: false,
        motivo: `Interstício não atingido. Faltam ${intersticio - mesesDecorridos} meses.`,
        mesesDecorridos,
        intersticioNecessario: intersticio,
      };
    }

    return {
      apto: true,
      nivelAtual: nivel,
      classeAtual: classe,
      proximaClasse,
      mesesDecorridos,
      intersticioNecessario: intersticio,
      dataAptidao: new Date(dataRef.getFullYear(), dataRef.getMonth() + intersticio, dataRef.getDate()),
    };
  }

  async simular(tenantId, servidorId) {
    const srv = await this._findServidor(tenantId, servidorId);
    const vinculo = srv.vinculos[0];
    const aptidao = this._avaliarAptidao(srv);

    const proximoNivel = aptidao.proximaClasse
      ? await prisma.nivelSalarial.findFirst({
          where: {
            tabelaSalarialId: vinculo.tabelaSalarialId,
            nivel:  vinculo.nivelSalarial.nivel,
            classe: aptidao.proximaClasse,
          },
        })
      : null;

    const proximoNivelTitulacao = PROXIMO_NIVEL[vinculo.nivelTitulacao || vinculo.nivelSalarial?.nivel];

    return {
      servidor: { id: srv.id, matricula: srv.matricula, nome: srv.nome },
      situacaoAtual: {
        nivel:          vinculo.nivelSalarial?.nivel,
        classe:         vinculo.nivelSalarial?.classe,
        vencimentoBase: vinculo.nivelSalarial?.vencimentoBase,
        nivelTitulacao: vinculo.nivelTitulacao,
      },
      progressaoHorizontal: {
        ...aptidao,
        vencimentoApos: proximoNivel?.vencimentoBase || null,
        ganho: proximoNivel
          ? Number(proximoNivel.vencimentoBase) - Number(vinculo.nivelSalarial?.vencimentoBase || 0)
          : null,
      },
      progressaoVertical: {
        possivelMudancaNivel: !!proximoNivelTitulacao,
        proximoNivel: proximoNivelTitulacao,
        instrucao: proximoNivelTitulacao
          ? `Apresentar diploma/certificado correspondente ao Nível ${proximoNivelTitulacao} para alterar o nível pessoal.`
          : 'Servidor está no nível máximo de titulação.',
      },
      anosDeServico: anosDeServico(vinculo.dataAdmissao),
    };
  }

  async listarPorServidor(tenantId, servidorId) {
    await this._findServidor(tenantId, servidorId);
    return prisma.progressao.findMany({
      where: { servidorId },
      include: {
        nivelOrigem:  { select: { nivel: true, classe: true, vencimentoBase: true } },
        nivelDestino: { select: { nivel: true, classe: true, vencimentoBase: true } },
        cargo:        { select: { nome: true } },
      },
      orderBy: { dataCompetencia: 'desc' },
    });
  }

  async processarHorizontal(tenantId, { servidorId, tipo = 'HORIZONTAL_ANTIGUIDADE', dataCompetencia, portaria, observacao, pontosCapacitacao }) {
    const srv = await this._findServidor(tenantId, servidorId);
    const vinculo = srv.vinculos[0];
    const aptidao = this._avaliarAptidao(srv);

    if (!aptidao.apto) throw Errors.PROGRESSAO_INTERSTICIO();

    const nivelDestino = await prisma.nivelSalarial.findFirst({
      where: {
        tabelaSalarialId: vinculo.tabelaSalarialId,
        nivel:  vinculo.nivelSalarial.nivel,
        classe: aptidao.proximaClasse,
      },
    });
    if (!nivelDestino) {
      throw Errors.VALIDATION(`Nível ${vinculo.nivelSalarial.nivel} Classe ${aptidao.proximaClasse} não cadastrado na tabela salarial.`);
    }

    return prisma.progressao.create({
      data: {
        servidorId,
        cargoId:             vinculo.cargoId,
        nivelSalarialOriId:  vinculo.nivelSalarialId,
        nivelSalarialDestId: nivelDestino.id,
        tipo,
        dataCompetencia:     dataCompetencia ? new Date(dataCompetencia) : new Date(),
        portaria,
        observacao,
        pontosCapacitacao:   pontosCapacitacao || null,
        statusAprovacao:     'PENDENTE',
      },
      include: { nivelOrigem: true, nivelDestino: true },
    });
  }

  async processarVerticalTitulacao(tenantId, { servidorId, novaEscolaridade, urlComprovante, dataCompetencia, portaria, observacao }) {
    const srv = await this._findServidor(tenantId, servidorId);
    const vinculo = srv.vinculos[0];

    const novoNivel = NIVEL_POR_ESCOLARIDADE[novaEscolaridade];
    if (!novoNivel) throw Errors.VALIDATION('Escolaridade inválida para progressão vertical.');

    const nivelAtual = vinculo.nivelTitulacao || vinculo.nivelSalarial?.nivel || 'I';
    if (novoNivel <= nivelAtual) {
      throw Errors.VALIDATION(`Nível ${novoNivel} não é superior ao nível atual ${nivelAtual}.`);
    }

    const competencia = dataCompetencia ? new Date(dataCompetencia) : new Date();
    const exercicioVigencia = competencia.getFullYear() + 1;

    const nivelDestino = await prisma.nivelSalarial.findFirst({
      where: { tabelaSalarialId: vinculo.tabelaSalarialId, nivel: novoNivel, classe: 'A' },
    });
    if (!nivelDestino) {
      throw Errors.VALIDATION(`Nível ${novoNivel} Classe A não cadastrado na tabela salarial.`);
    }

    const progressao = await prisma.progressao.create({
      data: {
        servidorId,
        cargoId:             vinculo.cargoId,
        nivelSalarialOriId:  vinculo.nivelSalarialId,
        nivelSalarialDestId: nivelDestino.id,
        tipo:                'VERTICAL_TITULACAO',
        nivelAnterior:       nivelAtual,
        nivelNovo:           novoNivel,
        titulacaoApresentada: novaEscolaridade,
        urlComprovante,
        dataCompetencia:     competencia,
        exercicioVigencia,
        portaria,
        observacao: observacao || `Mudança de Nível ${nivelAtual}→${novoNivel} por nova titulação. Vigência: ${exercicioVigencia}.`,
        statusAprovacao: 'PENDENTE',
      },
      include: { nivelOrigem: true, nivelDestino: true },
    });

    return {
      ...progressao,
      aviso: `Conforme Art. 31 §5º, a mudança de nível vigorará a partir de 01/01/${exercicioVigencia}.`,
    };
  }

  async processarEnquadramento(tenantId, { servidorId, tipo = 'ENQUADRAMENTO_INICIAL', nivelDestId, lei, observacao, anosServico }) {
    const srv = await this._findServidor(tenantId, servidorId);
    const vinculo = srv.vinculos[0];

    if (tipo === 'ENQUADRAMENTO_TEMPO_SERVICO') {
      const anos = anosServico || anosDeServico(vinculo.dataAdmissao);
      if (anos < 20) {
        throw Errors.VALIDATION(`Servidor possui ${anos} anos de serviço. São necessários 20 anos para este enquadramento.`);
      }
    }

    if (!nivelDestId) throw Errors.VALIDATION('ID do nível salarial destino é obrigatório.');

    const nivelDestino = await prisma.nivelSalarial.findFirst({
      where: { id: nivelDestId, tabelaSalarialId: vinculo.tabelaSalarialId },
    });
    if (!nivelDestino) throw Errors.NOT_FOUND('Nível Salarial destino');

    return prisma.progressao.create({
      data: {
        servidorId,
        cargoId:             vinculo.cargoId,
        nivelSalarialOriId:  vinculo.nivelSalarialId,
        nivelSalarialDestId: nivelDestId,
        tipo,
        dataCompetencia:     new Date(),
        lei,
        observacao,
        anosServico:         anosServico || anosDeServico(vinculo.dataAdmissao),
        statusAprovacao:     'PENDENTE',
      },
      include: { nivelOrigem: true, nivelDestino: true },
    });
  }

  async aprovar(tenantId, id, userId, { portaria, observacao }) {
    const prog = await this._findProgressao(tenantId, id);
    if (prog.statusAprovacao !== 'PENDENTE') {
      throw Errors.VALIDATION('Apenas progressões pendentes podem ser aprovadas.');
    }

    let dataEfetivacao = new Date();
    if (prog.tipo === 'VERTICAL_TITULACAO' && prog.exercicioVigencia) {
      dataEfetivacao = new Date(prog.exercicioVigencia, 0, 1);
    }

    const vinculo = await prisma.vinculoFuncional.findFirst({
      where: { servidorId: prog.servidorId, atual: true },
    });
    if (!vinculo) throw Errors.NOT_FOUND('Vínculo funcional ativo');

    const updateVinculo = { nivelSalarialId: prog.nivelSalarialDestId };
    if (prog.tipo === 'VERTICAL_TITULACAO') {
      updateVinculo.nivelTitulacao = prog.nivelNovo;
      updateVinculo.titulacaoComprovada = prog.titulacaoApresentada;
    }

    await prisma.$transaction([
      prisma.progressao.update({
        where: { id },
        data: {
          statusAprovacao: 'APROVADO',
          aprovadoPor:     userId,
          aprovadoEm:      new Date(),
          portaria:        portaria || prog.portaria,
          dataEfetivacao,
          observacao:      observacao || prog.observacao,
        },
      }),
      prisma.vinculoFuncional.update({
        where: { id: vinculo.id },
        data:  updateVinculo,
      }),
    ]);

    return prisma.progressao.findUnique({
      where: { id },
      include: { nivelOrigem: true, nivelDestino: true },
    });
  }

  async rejeitar(tenantId, id, userId, { motivo }) {
    const prog = await this._findProgressao(tenantId, id);
    if (prog.statusAprovacao !== 'PENDENTE') {
      throw Errors.VALIDATION('Apenas progressões pendentes podem ser rejeitadas.');
    }

    return prisma.progressao.update({
      where: { id },
      data: {
        statusAprovacao: 'REJEITADO',
        aprovadoPor:     userId,
        aprovadoEm:      new Date(),
        observacao:      motivo,
      },
    });
  }

  async processarLote(tenantId, { tipo = 'HORIZONTAL_ANTIGUIDADE', portaria, lotacaoId, cargoId }) {
    const vinculoFilter = {
      some: {
        atual: true,
        situacaoFuncional: 'ATIVO',
        ...(lotacaoId && { lotacaoId }),
        ...(cargoId   && { cargoId }),
      },
    };

    const servidores = await prisma.servidor.findMany({
      where: { tenantId, vinculos: vinculoFilter },
      include: {
        vinculos: {
          where: { atual: true },
          take: 1,
          include: { nivelSalarial: true },
        },
        progressoes: { orderBy: { dataCompetencia: 'desc' }, take: 1 },
      },
    });

    const resultados = { processados: 0, aptos: 0, ignorados: 0, erros: [] };

    for (const srv of servidores) {
      try {
        const aptidao = this._avaliarAptidao(srv);
        if (!aptidao.apto) { resultados.ignorados++; continue; }

        await this.processarHorizontal(tenantId, {
          servidorId: srv.id, tipo, portaria,
          observacao: `Progressão em lote — ${new Date().toLocaleDateString('pt-BR')}`,
        });

        resultados.aptos++;
        resultados.processados++;
      } catch (e) {
        resultados.erros.push({ servidorId: srv.id, nome: srv.nome, erro: e.message });
      }
    }

    return {
      ...resultados,
      totalAnalisados: servidores.length,
      mensagem: `${resultados.aptos} progressões criadas, ${resultados.ignorados} ignoradas (interstício não atingido).`,
    };
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
        progressoes: { orderBy: { dataCompetencia: 'desc' }, take: 1 },
      },
    });
    if (!srv) throw Errors.NOT_FOUND('Servidor');
    if (!srv.vinculos[0]) throw Errors.NOT_FOUND('Vínculo funcional ativo');
    return srv;
  }

  async _findProgressao(tenantId, id) {
    const prog = await prisma.progressao.findFirst({
      where: { id, servidor: { tenantId } },
      include: { nivelOrigem: true, nivelDestino: true },
    });
    if (!prog) throw Errors.NOT_FOUND('Progressão');
    return prog;
  }
}

module.exports = ProgressaoService;
