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

  async criar(data, usuarioId) {
    // Verifica CPF duplicado no tenant
    const cpfExiste = await this.repo.findByCpf(data.cpf?.replace(/\D/g, ''));
    if (cpfExiste) throw new AppError('CPF já cadastrado neste órgão.', 409);

    // Gera matrícula automática
    const matricula = await this.repo.gerarMatricula();

    const servidor = await this.repo.create({
      ...data,
      cpf: data.cpf.replace(/\D/g, ''),
      matricula,
    });

    // Registra histórico de criação
    await this.repo.createHistorico({
      servidorId: servidor.id,
      tenantId: servidor.tenantId,
      dataAlteracao: new Date(),
      tipoAlteracao: 'ADMISSAO',
      descricao: 'Admissão/Cadastro inicial do servidor',
      cargoNovoId: servidor.cargoId,
      lotacaoNovaId: servidor.lotacaoId,
      nivelSalarialNovoId: servidor.nivelSalarialId,
      vencimentoNovo: servidor.nivelSalarial?.vencimentoBase,
      situacaoNova: 'ATIVO',
      usuarioId,
    });

    return servidor;
  }

  async atualizar(id, data, usuarioId) {
    const atual = await this.buscarPorId(id);

    // Detecta e registra mudanças relevantes no histórico
    const mudancas = this._detectarMudancas(atual, data);

    const servidor = await this.repo.update(id, data);

    if (mudancas.length > 0) {
      for (const mudanca of mudancas) {
        await this.repo.createHistorico({
          servidorId: id,
          tenantId: atual.tenantId,
          dataAlteracao: new Date(),
          usuarioId,
          ...mudanca,
        });
      }
    }

    return servidor;
  }

  async alterarSituacao(id, { situacao, motivo, data, portaria }, usuarioId) {
    const servidor = await this.buscarPorId(id);

    await this.repo.update(id, {
      situacaoFuncional: situacao,
      ...(situacao === 'EXONERADO' && { dataExoneracao: data, motivoExoneracao: motivo }),
    });

    await this.repo.createHistorico({
      servidorId: id,
      tenantId: servidor.tenantId,
      dataAlteracao: data || new Date(),
      tipoAlteracao: 'SITUACAO',
      descricao: `Alteração de situação: ${servidor.situacaoFuncional} → ${situacao}`,
      situacaoAnterior: servidor.situacaoFuncional,
      situacaoNova: situacao,
      portaria,
      observacao: motivo,
      usuarioId,
    });

    return { message: 'Situação funcional atualizada com sucesso.' };
  }

  async registrarProgressao(servidorId, data, usuarioId) {
    const servidor = await this.buscarPorId(servidorId);

    // Valida se a progressão é possível (nível destino existe)
    const nivelDestino = await this.db.nivelSalarial.findUnique({
      where: { id: data.nivelSalarialDestId },
    });
    if (!nivelDestino) throw new AppError('Nível salarial de destino não encontrado.', 404);

    // Valida interstício mínimo para progressão horizontal
    if (['HORIZONTAL_ANTIGUIDADE', 'HORIZONTAL_MERITO', 'HORIZONTAL_CAPACITACAO'].includes(data.tipo)) {
      const ultimaProgressao = await this.db.progressao.findFirst({
        where: { servidorId, statusAprovacao: 'APROVADO' },
        orderBy: { dataEfetivacao: 'desc' },
      });

      if (ultimaProgressao) {
        const mesesDesde = dayjs().diff(dayjs(ultimaProgressao.dataEfetivacao), 'month');
        const intersticio = servidor.nivelSalarial?.intersticio || 24;
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
      cargoId: servidor.cargoId,
      nivelSalarialOriId: servidor.nivelSalarialId,
      ...data,
    });

    // Se aprovação automática (ENQUADRAMENTO), já efetiva
    if (['ENQUADRAMENTO_INICIAL', 'REENQUADRAMENTO_LEI'].includes(data.tipo)) {
      await this._efetivarProgressao(servidor, progressao, nivelDestino, usuarioId);
    }

    return progressao;
  }

  async historico(servidorId) {
    await this.buscarPorId(servidorId); // valida existência
    return this.repo.findHistorico(servidorId);
  }

  async extrato(servidorId) {
    const servidor = await this.buscarPorId(servidorId);
    const progressoes = await this.repo.findProgressoes(servidorId);
    const historico = await this.repo.findHistorico(servidorId);
    return { servidor, progressoes, historico };
  }

  // =============================================================
  // PRIVADOS
  // =============================================================
  async _efetivarProgressao(servidor, progressao, nivelDestino, usuarioId) {
    await this.repo.update(servidor.id, {
      nivelSalarialId: nivelDestino.id,
      ...(progressao.nivelNovo && { nivelTitulacao: progressao.nivelNovo }),
    });

    await this.repo.update(progressao.id, { statusAprovacao: 'APROVADO', aprovadoEm: new Date() });

    await this.repo.createHistorico({
      servidorId: servidor.id,
      tenantId: servidor.tenantId,
      dataAlteracao: new Date(),
      tipoAlteracao: 'PROGRESSAO',
      descricao: `Progressão ${progressao.tipo}: ${servidor.nivelSalarial?.nivel}/${servidor.nivelSalarial?.classe} → ${nivelDestino.nivel}/${nivelDestino.classe}`,
      nivelSalarialAntId: servidor.nivelSalarialId,
      nivelSalarialNovoId: nivelDestino.id,
      vencimentoAnterior: servidor.nivelSalarial?.vencimentoBase,
      vencimentoNovo: nivelDestino.vencimentoBase,
      usuarioId,
    });
  }

  _detectarMudancas(atual, novo) {
    const mudancas = [];

    if (novo.cargoId && novo.cargoId !== atual.cargoId) {
      mudancas.push({
        tipoAlteracao: 'CARGO',
        descricao: 'Alteração de cargo',
        cargoAnteriorId: atual.cargoId,
        cargoNovoId: novo.cargoId,
      });
    }

    if (novo.lotacaoId && novo.lotacaoId !== atual.lotacaoId) {
      mudancas.push({
        tipoAlteracao: 'LOTACAO',
        descricao: 'Alteração de lotação',
        lotacaoAnteriorId: atual.lotacaoId,
        lotacaoNovaId: novo.lotacaoId,
      });
    }

    if (novo.nivelSalarialId && novo.nivelSalarialId !== atual.nivelSalarialId) {
      mudancas.push({
        tipoAlteracao: 'SALARIO',
        descricao: 'Alteração de nível salarial',
        nivelSalarialAntId: atual.nivelSalarialId,
        nivelSalarialNovoId: novo.nivelSalarialId,
        vencimentoAnterior: atual.nivelSalarial?.vencimentoBase,
      });
    }

    return mudancas;
  }
}

module.exports = ServidoresService;
