const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');
const { mesesEntreatas, anosDeServico } = require('../../shared/utils/date');

// Mapeamento de nível por escolaridade (Magistério — Art.31)
const NIVEL_POR_ESCOLARIDADE = {
  MEDIO:        'I',
  SUPERIOR:     'II',
  POS_LATO:     'III',
  MESTRADO:     'IV',
  DOUTORADO:    'V',
};

// Próximo nível na carreira do magistério
const PROXIMO_NIVEL = { I: 'II', II: 'III', III: 'IV', IV: 'V', V: null };

// Próxima classe para Nível I: A→B→C | Níveis II-V: A→B→C→D→E
const PROXIMA_CLASSE = {
  I:   { A: 'B', B: 'C', C: null },
  II:  { A: 'B', B: 'C', C: 'D', D: 'E', E: null },
  III: { A: 'B', B: 'C', C: 'D', D: 'E', E: null },
  IV:  { A: 'B', B: 'C', C: 'D', D: 'E', E: null },
  V:   { A: 'B', B: 'C', C: 'D', D: 'E', E: null },
};

class ProgressaoService {

  // ── Consultas ──────────────────────────────────────────────

  async aptos(tenantId, query = {}, skip = 0, take = 20) {
    // Busca servidores que atingiram o interstício na classe atual
    const where = { tenantId, situacaoFuncional: 'ATIVO' };
    if (query.lotacaoId) where.lotacaoId = query.lotacaoId;
    if (query.cargoId)   where.cargoId   = query.cargoId;

    const servidores = await prisma.servidor.findMany({
      where,
      include: {
        nivelSalarial: true,
        progressoes: { orderBy: { dataCompetencia: 'desc' }, take: 1 },
        cargo: { select: { nome: true, codigo: true } },
        lotacao: { select: { nome: true, sigla: true } },
      },
      skip, take,
    });

    const aptos = [];
    for (const srv of servidores) {
      const avaliacao = await this._avaliarAptidao(srv);
      if (avaliacao.apto) {
        aptos.push({ servidor: { id: srv.id, matricula: srv.matricula, nome: srv.nome, cargo: srv.cargo, lotacao: srv.lotacao }, ...avaliacao });
      }
    }

    const total = await prisma.servidor.count({ where });
    return { dados: aptos, total: aptos.length, totalServidores: total };
  }

  async _avaliarAptidao(srv) {
    const nivel  = srv.nivelSalarial?.nivel  || 'I';
    const classe = srv.nivelSalarial?.classe || 'A';
    const intersticio = srv.nivelSalarial?.intersticio || 24; // meses

    // Verifica próxima classe disponível
    const proximaClasse = (PROXIMA_CLASSE[nivel] || {})[classe];
    if (!proximaClasse) {
      return { apto: false, motivo: 'Servidor já está na classe final do nível.' };
    }

    // Data da última progressão ou data de admissão
    const ultimaProgressao = srv.progressoes?.[0];
    const dataRef = ultimaProgressao
      ? new Date(ultimaProgressao.dataCompetencia)
      : new Date(srv.dataAdmissao);

    const mesesDecorridos = mesesEntreatas(dataRef);

    if (mesesDecorridos < intersticio) {
      return {
        apto: false,
        motivo: `Interstício não atingido. Faltam ${intersticio - mesesDecorridos} meses.`,
        mesesDecorridos,
        intersticioNecessario: intersticio,
      };
    }

    // Verifica progressão pendente já registrada
    const pendente = await prisma.progressao.findFirst({
      where: { servidorId: srv.id, statusAprovacao: 'PENDENTE', tipo: { in: ['HORIZONTAL_ANTIGUIDADE', 'HORIZONTAL_MERITO', 'HORIZONTAL_CAPACITACAO'] } },
    });
    if (pendente) {
      return { apto: false, motivo: 'Já existe progressão horizontal pendente de aprovação.' };
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
    const aptidao = await this._avaliarAptidao(srv);

    // Busca próximo nível salarial (classe seguinte na mesma tabela)
    const proximoNivel = aptidao.proximaClasse
      ? await prisma.nivelSalarial.findFirst({
          where: {
            tabelaSalarialId: srv.tabelaSalarialId,
            nivel: srv.nivelSalarial.nivel,
            classe: aptidao.proximaClasse,
          },
        })
      : null;

    // Simula também mudança de nível por titulação
    const proximoNivelTitulacao = PROXIMO_NIVEL[srv.nivelTitulacao || srv.nivelSalarial?.nivel];

    return {
      servidor: { id: srv.id, matricula: srv.matricula, nome: srv.nome },
      situacaoAtual: {
        nivel: srv.nivelSalarial?.nivel,
        classe: srv.nivelSalarial?.classe,
        vencimentoBase: srv.nivelSalarial?.vencimentoBase,
        nivelTitulacao: srv.nivelTitulacao,
      },
      progressaoHorizontal: {
        ...aptidao,
        vencimentoApos: proximoNivel?.vencimentoBase || null,
        ganho: proximoNivel
          ? Number(proximoNivel.vencimentoBase) - Number(srv.nivelSalarial?.vencimentoBase || 0)
          : null,
      },
      progressaoVertical: {
        possivelMudancaNivel: !!proximoNivelTitulacao,
        proximoNivel: proximoNivelTitulacao,
        instrucao: proximoNivelTitulacao
          ? `Apresentar diploma/certificado correspondente ao Nível ${proximoNivelTitulacao} para alterar o nível pessoal.`
          : 'Servidor está no nível máximo de titulação.',
      },
      anosDeServico: anosDeServico(srv.dataAdmissao),
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

  // ── Progressão Horizontal ──────────────────────────────────

  async processarHorizontal(tenantId, { servidorId, tipo = 'HORIZONTAL_ANTIGUIDADE', dataCompetencia, portaria, observacao, pontosCapacitacao }) {
    const srv = await this._findServidor(tenantId, servidorId);
    const aptidao = await this._avaliarAptidao(srv);

    if (!aptidao.apto) throw Errors.PROGRESSAO_INTERSTICIO();

    // Busca nível destino (próxima classe)
    const nivelDestino = await prisma.nivelSalarial.findFirst({
      where: {
        tabelaSalarialId: srv.tabelaSalarialId,
        nivel: srv.nivelSalarial.nivel,
        classe: aptidao.proximaClasse,
      },
    });
    if (!nivelDestino) {
      throw Errors.VALIDATION(`Nível ${srv.nivelSalarial.nivel} Classe ${aptidao.proximaClasse} não cadastrado na tabela salarial.`);
    }

    const progressao = await prisma.progressao.create({
      data: {
        servidorId,
        cargoId: srv.cargoId,
        nivelSalarialOriId: srv.nivelSalarialId,
        nivelSalarialDestId: nivelDestino.id,
        tipo,
        dataCompetencia: dataCompetencia ? new Date(dataCompetencia) : new Date(),
        portaria,
        observacao,
        pontosCapacitacao: pontosCapacitacao || null,
        statusAprovacao: 'PENDENTE',
      },
      include: {
        nivelOrigem:  true,
        nivelDestino: true,
      },
    });

    return progressao;
  }

  // ── Progressão Vertical por Titulação ─────────────────────
  // Art. 31 §5º — Magistério: mudança automática após estágio probatório,
  // vigora no exercício seguinte ao da apresentação do comprovante

  async processarVerticalTitulacao(tenantId, { servidorId, novaEscolaridade, urlComprovante, dataCompetencia, portaria, observacao }) {
    const srv = await this._findServidor(tenantId, servidorId);

    // Determina novo nível com base na escolaridade apresentada
    const novoNivel = NIVEL_POR_ESCOLARIDADE[novaEscolaridade];
    if (!novoNivel) throw Errors.VALIDATION('Escolaridade inválida para progressão vertical.');

    const nivelAtual = srv.nivelTitulacao || srv.nivelSalarial?.nivel || 'I';
    if (novoNivel <= nivelAtual) {
      throw Errors.VALIDATION(`Nível ${novoNivel} não é superior ao nível atual ${nivelAtual}.`);
    }

    // Art. 31 §5º: vigora no exercício SEGUINTE
    const competencia = dataCompetencia ? new Date(dataCompetencia) : new Date();
    const exercicioVigencia = competencia.getFullYear() + 1;

    // Nível destino: novo nível, classe inicial 'A'
    const nivelDestino = await prisma.nivelSalarial.findFirst({
      where: {
        tabelaSalarialId: srv.tabelaSalarialId,
        nivel: novoNivel,
        classe: 'A',
      },
    });
    if (!nivelDestino) {
      throw Errors.VALIDATION(`Nível ${novoNivel} Classe A não cadastrado na tabela salarial. Cadastre-o primeiro em PCCV.`);
    }

    const progressao = await prisma.progressao.create({
      data: {
        servidorId,
        cargoId: srv.cargoId,
        nivelSalarialOriId: srv.nivelSalarialId,
        nivelSalarialDestId: nivelDestino.id,
        tipo: 'VERTICAL_TITULACAO',
        nivelAnterior: nivelAtual,
        nivelNovo: novoNivel,
        titulacaoApresentada: novaEscolaridade,
        urlComprovante,
        dataCompetencia: competencia,
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

  // ── Enquadramento ──────────────────────────────────────────

  async processarEnquadramento(tenantId, { servidorId, tipo = 'ENQUADRAMENTO_INICIAL', nivelDestId, lei, observacao, anosServico }) {
    const srv = await this._findServidor(tenantId, servidorId);

    // Para ENQUADRAMENTO_TEMPO_SERVICO (Art.32 §1º — 20+ anos → Classe C)
    if (tipo === 'ENQUADRAMENTO_TEMPO_SERVICO') {
      const anos = anosServico || anosDeServico(srv.dataAdmissao);
      if (anos < 20) {
        throw Errors.VALIDATION(`Servidor possui ${anos} anos de serviço. São necessários 20 anos para este enquadramento.`);
      }
    }

    if (!nivelDestId) throw Errors.VALIDATION('ID do nível salarial destino é obrigatório.');

    const nivelDestino = await prisma.nivelSalarial.findFirst({
      where: { id: nivelDestId, tabelaSalarialId: srv.tabelaSalarialId },
    });
    if (!nivelDestino) throw Errors.NOT_FOUND('Nível Salarial destino');

    const progressao = await prisma.progressao.create({
      data: {
        servidorId,
        cargoId: srv.cargoId,
        nivelSalarialOriId: srv.nivelSalarialId,
        nivelSalarialDestId: nivelDestId,
        tipo,
        dataCompetencia: new Date(),
        lei,
        observacao,
        anosServico: anosServico || anosDeServico(srv.dataAdmissao),
        statusAprovacao: 'PENDENTE',
      },
      include: { nivelOrigem: true, nivelDestino: true },
    });

    return progressao;
  }

  // ── Aprovação / Rejeição ───────────────────────────────────

  async aprovar(tenantId, id, userId, { portaria, observacao }) {
    const prog = await this._findProgressao(tenantId, id);
    if (prog.statusAprovacao !== 'PENDENTE') {
      throw Errors.VALIDATION('Apenas progressões pendentes podem ser aprovadas.');
    }

    // Define data de efetivação conforme o tipo
    let dataEfetivacao = new Date();
    if (prog.tipo === 'VERTICAL_TITULACAO' && prog.exercicioVigencia) {
      // Art. 31 §5º: vigora no exercício seguinte
      dataEfetivacao = new Date(prog.exercicioVigencia, 0, 1); // 01/01/exercícioVigencia
    }

    await prisma.$transaction([
      // Atualiza a progressão
      prisma.progressao.update({
        where: { id },
        data: {
          statusAprovacao: 'APROVADO',
          aprovadoPor: userId,
          aprovadoEm: new Date(),
          portaria: portaria || prog.portaria,
          dataEfetivacao,
          observacao: observacao || prog.observacao,
        },
      }),

      // Atualiza o servidor: nível salarial + nível de titulação (se vertical)
      prisma.servidor.update({
        where: { id: prog.servidorId },
        data: {
          nivelSalarialId: prog.nivelSalarialDestId,
          ...(prog.tipo === 'VERTICAL_TITULACAO' ? {
            nivelTitulacao: prog.nivelNovo,
            titulacaoComprovada: prog.titulacaoApresentada,
            dataTitulacao: new Date(),
          } : {}),
        },
      }),

      // Registra no histórico funcional
      prisma.historicoFuncional.create({
        data: {
          servidorId: prog.servidorId,
          tenantId,
          dataAlteracao: dataEfetivacao,
          tipoAlteracao: 'PROGRESSAO',
          descricao: `Progressão ${prog.tipo} aprovada. ${prog.nivelOrigem?.nivel}${prog.nivelOrigem?.classe} → ${prog.nivelDestino?.nivel}${prog.nivelDestino?.classe}`,
          nivelSalarialAnteriorId: prog.nivelSalarialOriId,
          nivelSalarialNovoId: prog.nivelSalarialDestId,
          observacao: portaria ? `Portaria: ${portaria}` : null,
        },
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
        aprovadoPor: userId,
        aprovadoEm: new Date(),
        observacao: motivo,
      },
    });
  }

  // ── Processamento em Lote ──────────────────────────────────

  async processarLote(tenantId, { tipo = 'HORIZONTAL_ANTIGUIDADE', portaria, lotacaoId, cargoId }) {
    const where = { tenantId, situacaoFuncional: 'ATIVO' };
    if (lotacaoId) where.lotacaoId = lotacaoId;
    if (cargoId)   where.cargoId   = cargoId;

    const servidores = await prisma.servidor.findMany({
      where,
      include: {
        nivelSalarial: true,
        progressoes: { orderBy: { dataCompetencia: 'desc' }, take: 1 },
      },
    });

    const resultados = { processados: 0, aptos: 0, ignorados: 0, erros: [] };

    for (const srv of servidores) {
      try {
        const aptidao = await this._avaliarAptidao(srv);
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

  // ── Helpers ────────────────────────────────────────────────

  async _findServidor(tenantId, servidorId) {
    const srv = await prisma.servidor.findFirst({
      where: { id: servidorId, tenantId },
      include: {
        nivelSalarial: true,
        progressoes: { orderBy: { dataCompetencia: 'desc' }, take: 1 },
      },
    });
    if (!srv) throw Errors.NOT_FOUND('Servidor');
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
