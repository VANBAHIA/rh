// src/modules/servidores/service.js
const dayjs = require('dayjs');
const ServidoresRepository = require('./repository');
const AppError = require('../../utils/AppError');

class ServidoresService {
  constructor(db) {
    this.repo = new ServidoresRepository(db);
    this.db = db;
  }

  async listar(filtros, query) {
    return this.repo.findAll({ filtros, query });
  }

  async buscarPorId(id) {
    const servidor = await this.repo.findById(id);
    if (!servidor) throw new AppError('Servidor não encontrado.', 404);
    return servidor;
  }

  async criar(data, tenantId, usuarioId) {
    const {
      regimeJuridico, cargoId, tabelaSalarialId, nivelSalarialId, lotacaoId,
      dataAdmissao, dataPosse, dataExercicio, dataTermino,
      cargaHorariaSemanal, turno, nivelTitulacao, titulacaoComprovada,
      portaria, lei, observacao,
      emailPessoal, emailInstitucional, celular,
      ...dadosPessoais
    } = data;

    const cpfLimpo = dadosPessoais.cpf?.replace(/\D/g, '');
    const cpfExiste = await this.repo.findByCpf(cpfLimpo);
    if (cpfExiste) throw new AppError('CPF já cadastrado neste órgão.', 409);

    const matricula = await this.repo.gerarMatricula();
    const servidor  = await this.repo.create({ ...dadosPessoais, cpf: cpfLimpo, matricula, tenantId });

    const vinculo = await this.repo.createVinculo({
      servidorId: servidor.id, tenantId, regimeJuridico, cargoId,
      tabelaSalarialId, nivelSalarialId, lotacaoId, dataAdmissao,
      dataPosse: dataPosse || null, dataExercicio: dataExercicio || null,
      dataTermino: dataTermino || null, cargaHoraria: cargaHorariaSemanal || 40,
      turno: turno || 'INTEGRAL', nivelTitulacao: nivelTitulacao || null,
      titulacaoComprovada: titulacaoComprovada || null, portaria: portaria || null,
      lei: lei || null, observacao: observacao || null,
      situacaoFuncional: 'ATIVO', tipoAlteracao: 'ADMISSAO',
      atual: true, registradoPor: usuarioId,
    });

    const contatos = [];
    if (emailPessoal)        contatos.push({ tipo: 'EMAIL_PESSOAL',       valor: emailPessoal,        principal: true });
    if (emailInstitucional)  contatos.push({ tipo: 'EMAIL_INSTITUCIONAL', valor: emailInstitucional });
    if (celular)             contatos.push({ tipo: 'CELULAR',             valor: celular });

    if (contatos.length > 0) {
      await this.db.contatoServidor.createMany({
        data: contatos.map((c) => ({ ...c, servidorId: servidor.id })),
      });
    }

    return { ...servidor, vinculoAtual: vinculo };
  }

  async atualizar(id, data, usuarioId) {
    const {
      regimeJuridico, cargoId, tabelaSalarialId, nivelSalarialId, lotacaoId,
      dataAdmissao, dataPosse, dataExercicio, dataTermino,
      cargaHorariaSemanal, turno, nivelTitulacao, titulacaoComprovada,
      portaria, lei, observacao: obsVinculo,
      ...dadosPessoais
    } = data;

    const dadosFuncionais = {
      regimeJuridico, cargoId, tabelaSalarialId, nivelSalarialId, lotacaoId,
      dataAdmissao, dataPosse, dataExercicio, dataTermino,
      cargaHoraria: cargaHorariaSemanal, turno, nivelTitulacao,
      titulacaoComprovada, portaria, lei, observacao: obsVinculo,
    };

    const temDadosPessoais   = Object.values(dadosPessoais).some((v) => v !== undefined);
    const temDadosFuncionais = Object.values(dadosFuncionais).some((v) => v !== undefined);

    let servidor;
    if (temDadosPessoais) {
      const payload = Object.fromEntries(Object.entries(dadosPessoais).filter(([, v]) => v !== undefined));
      servidor = await this.repo.update(id, payload);
    } else {
      servidor = await this.buscarPorId(id);
    }

    if (temDadosFuncionais) {
      const vinculoAtual = await this.repo.findVinculoAtual(id);
      if (!vinculoAtual) throw new AppError('Vínculo funcional ativo não encontrado.', 404);
      const payload = Object.fromEntries(Object.entries(dadosFuncionais).filter(([, v]) => v !== undefined));
      await this.repo.updateVinculo(vinculoAtual.id, { ...payload, registradoPor: usuarioId });
    }

    return this.buscarPorId(id);
  }

  async alterarSituacao(id, { situacao, motivo, data, portaria }, usuarioId) {
    await this.buscarPorId(id);
    const vinculoAtual = await this.repo.findVinculoAtual(id);
    if (!vinculoAtual) throw new AppError('Vínculo funcional ativo não encontrado.', 404);

    const atualizacaoVinculo = { situacaoFuncional: situacao, registradoPor: usuarioId };

    if (['EXONERADO', 'APOSENTADO', 'FALECIDO', 'RESCISAO'].includes(situacao)) {
      atualizacaoVinculo.dataEncerramento   = data ? new Date(data) : new Date();
      atualizacaoVinculo.motivoEncerramento = motivo || null;
      atualizacaoVinculo.portaria           = portaria || null;
      atualizacaoVinculo.atual              = false;
      atualizacaoVinculo.tipoAlteracao      = _mapSituacaoParaTipoAlteracao(situacao);
    }

    await this.repo.updateVinculo(vinculoAtual.id, atualizacaoVinculo);
    return { message: 'Situação funcional atualizada com sucesso.' };
  }

  async registrarProgressao(servidorId, data, usuarioId) {
    await this.buscarPorId(servidorId);

    const vinculoAtual = await this.repo.findVinculoAtual(servidorId);
    if (!vinculoAtual) throw new AppError('Vínculo funcional ativo não encontrado.', 404);

    const nivelDestino = await this.db.nivelSalarial.findUnique({ where: { id: data.nivelSalarialDestId } });
    if (!nivelDestino) throw new AppError('Nível salarial de destino não encontrado.', 404);

    if (['HORIZONTAL_ANTIGUIDADE', 'HORIZONTAL_MERITO', 'HORIZONTAL_CAPACITACAO'].includes(data.tipo)) {
      const ultimaProgressao = await this.db.progressao.findFirst({
        where: { servidorId, statusAprovacao: 'APROVADO' },
        orderBy: { dataEfetivacao: 'desc' },
      });
      if (ultimaProgressao) {
        const mesesDesde  = dayjs().diff(dayjs(ultimaProgressao.dataEfetivacao), 'month');
        const intersticio = vinculoAtual.nivelSalarial?.intersticio || 24;
        if (mesesDesde < intersticio) {
          throw new AppError(
            `Interstício mínimo de ${intersticio} meses não atingido. Faltam ${intersticio - mesesDesde} meses.`,
            400
          );
        }
      }
    }

    const progressao = await this.repo.createProgressao({
      servidorId,
      cargoId: vinculoAtual.cargoId,
      nivelSalarialOriId: vinculoAtual.nivelSalarialId,
      ...data,
    });

    if (['ENQUADRAMENTO_INICIAL', 'REENQUADRAMENTO_LEI'].includes(data.tipo)) {
      await this._efetivarProgressao(servidorId, vinculoAtual, progressao, nivelDestino, usuarioId);
    }

    return progressao;
  }

  async historico(servidorId) {
    await this.buscarPorId(servidorId);
    return this.repo.findHistorico(servidorId);
  }

  async extrato(servidorId) {
    const servidor    = await this.buscarPorId(servidorId);
    const progressoes = await this.repo.findProgressoes(servidorId);
    const historico   = await this.repo.findHistorico(servidorId);
    return { servidor, progressoes, historico };
  }

  // ── Escala de trabalho ──────────────────────────────────────────────────────

  async obterEscala(servidorId) {
    await this.buscarPorId(servidorId);
    const escala = await this.db.servidorEscala.findFirst({
      where:   { servidorId, ativa: true },
      include: { escala: true },
      orderBy: { dataInicio: 'desc' },
    });
    return escala ?? null;
  }

  async vincularEscala(servidorId, { escalaId, dataInicio, motivoAlteracao }, usuarioId) {
    await this.buscarPorId(servidorId);

    // Valida que a escala destino existe
    const escalaDestino = await this.db.escalaTrabalho.findUnique({ where: { id: escalaId } });
    if (!escalaDestino) throw new AppError('Escala de trabalho não encontrada.', 404);

    // Não permitir vincular a mesma escala já ativa
    const escalaAtual = await this.db.servidorEscala.findFirst({
      where: { servidorId, ativa: true },
    });
    if (escalaAtual && escalaAtual.escalaId === escalaId) {
      throw new AppError(
        `O servidor já está vinculado à escala "${escalaDestino.nome ?? escalaDestino.tipo}". Selecione uma escala diferente.`,
        400
      );
    }

    // Encerra escala atual com dataFim = dia anterior ao novo início
    if (escalaAtual) {
      await this.db.servidorEscala.update({
        where: { id: escalaAtual.id },
        data:  { ativa: false, dataFim: dayjs(dataInicio).subtract(1, 'day').toDate() },
      });
    }

    // Cria novo vínculo
    return this.db.servidorEscala.create({
      data: {
        servidorId,
        escalaId,
        dataInicio:      new Date(dataInicio),
        ativa:           true,
        motivoAlteracao: motivoAlteracao ?? null,
        registradoPor:   usuarioId ?? null,
      },
      include: { escala: true },
    });
  }

  async historicoEscala(servidorId, { page = 1, limit = 5 } = {}) {
    await this.buscarPorId(servidorId);

    const skip  = (page - 1) * limit;
    const where = { servidorId };

    const [registros, total] = await Promise.all([
      this.db.servidorEscala.findMany({
        where,
        include: { escala: { select: { id: true, nome: true, tipo: true, cargaHoraria: true } } },
        orderBy: { dataInicio: 'desc' },
        skip,
        take: limit,
      }),
      this.db.servidorEscala.count({ where }),
    ]);

    return {
      data: registros,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Dados bancários ─────────────────────────────────────────────────────────

  async buscarDadosBancarios(servidorId) {
    await this.buscarPorId(servidorId);
    return this.repo.findDadosBancarios(servidorId);
  }

  async adicionarDadosBancarios(servidorId, data, usuarioId) {
    await this.buscarPorId(servidorId);
    const [, novaConta] = await this.repo.createDadosBancarios(servidorId, data);
    return novaConta;
  }

  async ativarConta(servidorId, contaId, usuarioId) {
    await this.buscarPorId(servidorId);
    const conta = await this.db.dadosBancarios.findFirst({ where: { id: contaId, servidorId } });
    if (!conta) throw new AppError('Conta não encontrada.', 404);
    const [, contaAtiva] = await this.repo.ativarConta(servidorId, contaId);
    return contaAtiva;
  }

  // ── Privados ────────────────────────────────────────────────────────────────

  async _efetivarProgressao(servidorId, vinculoAtual, progressao, nivelDestino, usuarioId) {
    await this.repo.updateVinculo(vinculoAtual.id, {
      nivelSalarialId: nivelDestino.id,
      registradoPor:   usuarioId,
      ...(progressao.nivelNovo ? { nivelTitulacao: progressao.nivelNovo } : {}),
    });
    await this.repo.updateProgressao(progressao.id, {
      statusAprovacao: 'APROVADO',
      aprovadoEm:      new Date(),
    });
  }
}

function _mapSituacaoParaTipoAlteracao(situacao) {
  const mapa = {
    EXONERADO: 'EXONERACAO', APOSENTADO: 'APOSENTADORIA',
    FALECIDO:  'FALECIMENTO', RESCISAO:  'RESCISAO',
    AFASTADO:  'AFASTAMENTO', CEDIDO:    'CESSAO',
    SUSPENSO:  'SUSPENSAO',
  };
  return mapa[situacao] || 'MUDANCA_REGIME';
}

module.exports = ServidoresService;