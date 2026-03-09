const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');
const { gerarMatricula } = require('../../shared/utils/matricula');
const { anosDeServico } = require('../../shared/utils/date');

const VINCULO_ATUAL_WHERE = { atual: true };

const VINCULO_INCLUDE = {
  cargo:          { include: { grupoOcupacional: true } },
  lotacao:        true,
  tabelaSalarial: true,
  nivelSalarial:  true,
};

const SERVIDOR_COMPLETO_INCLUDE = {
  vinculos:      { orderBy: { dataAdmissao: 'desc' }, include: VINCULO_INCLUDE },
  contatos:      { where: { ativo: true }, orderBy: [{ principal: 'desc' }, { createdAt: 'asc' }] },
  enderecos:     { where: { ativo: true }, orderBy: [{ principal: 'desc' }, { createdAt: 'asc' }] },
  dadosBancarios: true,
  dependentes:   { where: { ativo: true } },
};

async function _garantirUmPrincipal(model, servidorId, novoId) {
  await prisma[model].updateMany({
    where: { servidorId, principal: true, id: { not: novoId } },
    data:  { principal: false },
  });
}

class ServidorService {

  // ── Biometria facial ─────────────────────────────────────────
  async registrarBiometriaFacial(tenantId, servidorId, { embedding, modelo = "face-api.js", cadastradoPor }) {
    await this.buscarPorId(tenantId, servidorId);
    // Remove biometria anterior se existir
    await prisma.biometriaFacial.deleteMany({ where: { servidorId, tenantId } });
    // Cria nova biometria
    return prisma.biometriaFacial.create({
      data: {
        servidorId,
        tenantId,
        embedding,
        modelo,
        cadastradoPor,
        ativo: true,
      },
    });
  }

  async listar(tenantId, filtros, skip, take) {
    const vinculoWhere = { atual: true };
    if (filtros.situacao)  vinculoWhere.situacaoFuncional = filtros.situacao;
    if (filtros.regime)    vinculoWhere.regimeJuridico    = filtros.regime;
    if (filtros.lotacaoId) vinculoWhere.lotacaoId         = filtros.lotacaoId;
    if (filtros.cargoId)   vinculoWhere.cargoId           = filtros.cargoId;

    const where = { tenantId, vinculos: { some: vinculoWhere } };
    if (filtros.search) {
      where.OR = [
        { nome:      { contains: filtros.search } },
        { matricula: { contains: filtros.search } },
        { cpf:       { contains: filtros.search } },
      ];
    }

    const [servidores, total] = await prisma.$transaction([
      prisma.servidor.findMany({
        where, skip, take, orderBy: { nome: 'asc' },
        select: {
          id: true, matricula: true, nome: true, cpf: true, fotoUrl: true,
          vinculos: {
            where: VINCULO_ATUAL_WHERE, take: 1,
            select: {
              regimeJuridico: true, situacaoFuncional: true, dataAdmissao: true,
              nivelTitulacao: true, cargaHoraria: true, turno: true,
              cargo:         { select: { nome: true, codigo: true } },
              lotacao:       { select: { nome: true, sigla: true } },
              nivelSalarial: { select: { nivel: true, classe: true, vencimentoBase: true } },
            },
          },
          contatos: { where: { principal: true, ativo: true }, take: 1,
            select: { tipo: true, valor: true } },
          biometria: { select: { id: true, atualizadaEm: true } },
        },
      }),
      prisma.servidor.count({ where }),
    ]);
    return {
      servidores: servidores.map(s => ({
        ...s,
        biometriaFacial: s.biometria ? { cadastrada: true, atualizadaEm: s.biometria.atualizadaEm } : null,
        biometria: undefined,
      })),
      total,
    };
  }

  async criar(tenantId, dados) {
    const { vinculo, contatos = [], enderecos = [], ...pessoaisRaw } = dados;

    const CAMPOS_DATA_SERVIDOR = ['dataNascimento', 'rgDataEmissao', 'inicioMandato', 'fimMandato'];
    const CAMPOS_DATA_VINCULO  = ['dataAdmissao', 'dataPosse', 'dataExercicio', 'dataTermino'];

    const pessoais = Object.fromEntries(
      Object.entries(pessoaisRaw)
        .filter(([, v]) => v !== '' && v !== null && v !== undefined)
        .map(([k, v]) => [k, CAMPOS_DATA_SERVIDOR.includes(k) ? new Date(v) : v])
    );

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const totalAtivos = await prisma.servidor.count({
      where: { tenantId, vinculos: { some: { atual: true, situacaoFuncional: 'ATIVO' } } },
    });
    if (totalAtivos >= tenant.limiteServidores) throw Errors.TENANT_LIMIT();

    const existente = await prisma.servidor.findFirst({ where: { tenantId, cpf: pessoais.cpf } });
    if (existente) throw Errors.ALREADY_EXISTS('CPF');

    const matricula = await gerarMatricula(tenantId);

    const vinculoData = vinculo
      ? Object.fromEntries(
          Object.entries(vinculo)
            .filter(([, v]) => v !== '' && v !== null && v !== undefined)
            .map(([k, v]) => [k, CAMPOS_DATA_VINCULO.includes(k) ? new Date(v) : v])
        )
      : null;

    const servidor = await prisma.$transaction(async (tx) => {
      const sv = await tx.servidor.create({ data: { ...pessoais, tenantId, matricula } });

      if (vinculoData) {
        await tx.vinculoFuncional.create({
          data: { servidorId: sv.id, tenantId, atual: true, tipoAlteracao: 'ADMISSAO', ...vinculoData },
        });
      }

      if (contatos.length > 0) {
        const temPrincipal = contatos.some(c => c.principal);
        await tx.contatoServidor.createMany({
          data: contatos.map((c, i) => ({
            servidorId: sv.id, ...c,
            principal: temPrincipal ? !!c.principal : i === 0,
          })),
        });
      }

      if (enderecos.length > 0) {
        const temPrincipal = enderecos.some(e => e.principal);
        await tx.enderecoServidor.createMany({
          data: enderecos.map((e, i) => ({
            servidorId: sv.id, ...e,
            principal: temPrincipal ? !!e.principal : i === 0,
          })),
        });
      }

      return sv;
    });

    return this.buscarPorId(tenantId, servidor.id);
  }

  async buscarPorId(tenantId, id) {
    const servidor = await prisma.servidor.findFirst({
      where: { id, tenantId },
      include: {
        ...SERVIDOR_COMPLETO_INCLUDE,
        biometria: true,
      },
    });
    if (!servidor) throw Errors.NOT_FOUND('Servidor');
    return servidor;
  }

  async atualizar(tenantId, id, dados) {
    await this.buscarPorId(tenantId, id);
    const { vinculo, contatos, enderecos, ...pessoaisRaw } = dados;
    const CAMPOS_DATA = ['dataNascimento', 'rgDataEmissao', 'inicioMandato', 'fimMandato'];
    const pessoais = Object.fromEntries(
      Object.entries(pessoaisRaw)
        .filter(([, v]) => v !== '' && v !== null && v !== undefined)
        .map(([k, v]) => [k, CAMPOS_DATA.includes(k) ? new Date(v) : v])
    );
    return prisma.servidor.update({ where: { id }, data: pessoais });
  }

  async desativar(tenantId, id, { motivo, dataEncerramento, tipoAlteracao = 'EXONERACAO' }) {
    await this.buscarPorId(tenantId, id);
    const vinculoAtual = await prisma.vinculoFuncional.findFirst({
      where: { servidorId: id, atual: true },
    });
    if (!vinculoAtual) throw Errors.NOT_FOUND('Vínculo ativo');

    await prisma.vinculoFuncional.update({
      where: { id: vinculoAtual.id },
      data: {
        atual:              false,
        situacaoFuncional:  tipoAlteracao === 'APOSENTADORIA' ? 'APOSENTADO' : 'EXONERADO',
        dataEncerramento:   dataEncerramento ? new Date(dataEncerramento) : new Date(),
        motivoEncerramento: motivo,
        tipoAlteracao,
      },
    });
  }

  async excluir(tenantId, id) {
    await this.buscarPorId(tenantId, id);

    const [folhas, progressoes, ferias, licencas, processos, estagio] = await Promise.all([
      prisma.itemFolha.count({ where: { servidorId: id } }),
      prisma.progressao.count({ where: { servidorId: id } }),
      prisma.ferias.count({ where: { servidorId: id } }),
      prisma.licenca.count({ where: { servidorId: id } }),
      prisma.processoDisciplinar.count({ where: { servidorId: id } }),
      prisma.estagioProbatorio.count({ where: { servidorId: id } }),
    ]);

    const bloqueios = [];
    if (folhas     > 0) bloqueios.push(`${folhas} item(ns) de folha de pagamento`);
    if (progressoes > 0) bloqueios.push(`${progressoes} progressão(ões)`);
    if (ferias     > 0) bloqueios.push(`${ferias} registro(s) de férias`);
    if (licencas   > 0) bloqueios.push(`${licencas} licença(s)`);
    if (processos  > 0) bloqueios.push(`${processos} processo(s) disciplinar(es)`);
    if (estagio    > 0) bloqueios.push('estágio probatório');

    if (bloqueios.length > 0) {
      const err = new Error(`Não é possível excluir: o servidor possui ${bloqueios.join(', ')}.`);
      err.statusCode = 409;
      throw err;
    }

    await prisma.$transaction(async (tx) => {
      await tx.vinculoFuncional.deleteMany({ where: { servidorId: id } });
      await tx.contatoServidor.deleteMany({ where: { servidorId: id } });
      await tx.enderecoServidor.deleteMany({ where: { servidorId: id } });
      await tx.documentoServidor.deleteMany({ where: { servidorId: id } });
      await tx.dependente.deleteMany({ where: { servidorId: id } });
      await tx.dadosBancarios.deleteMany({ where: { servidorId: id } });
      await tx.consignado.deleteMany({ where: { servidorId: id } });
      await tx.servidor.delete({ where: { id } });
    });
  }

  // ── VÍNCULOS ────────────────────────────────────────────────
  async criarVinculo(tenantId, servidorId, dados) {
    await this.buscarPorId(tenantId, servidorId);
    await prisma.vinculoFuncional.updateMany({
      where: { servidorId, atual: true },
      data:  { atual: false },
    });
    return prisma.vinculoFuncional.create({
      data: { servidorId, tenantId, atual: true, ...dados },
      include: VINCULO_INCLUDE,
    });
  }

  async atualizarVinculo(tenantId, servidorId, dados) {
    const vinculoAtual = await prisma.vinculoFuncional.findFirst({
      where: { servidorId, atual: true, tenantId },
    });
    if (!vinculoAtual) throw Errors.NOT_FOUND('Vínculo ativo');

    const { tipoAlteracao, ...resto } = dados;

    return prisma.$transaction(async (tx) => {
      await tx.vinculoFuncional.update({
        where: { id: vinculoAtual.id },
        data:  { atual: false, dataEncerramento: new Date() },
      });
      return tx.vinculoFuncional.create({
        data: {
          servidorId, tenantId, atual: true,
          tipoAlteracao: tipoAlteracao || 'MUDANCA_CARGO',
          regimeJuridico:      vinculoAtual.regimeJuridico,
          situacaoFuncional:   vinculoAtual.situacaoFuncional,
          cargoId:             vinculoAtual.cargoId,
          tabelaSalarialId:    vinculoAtual.tabelaSalarialId,
          nivelSalarialId:     vinculoAtual.nivelSalarialId,
          lotacaoId:           vinculoAtual.lotacaoId,
          cargaHoraria:        vinculoAtual.cargaHoraria,
          turno:               vinculoAtual.turno,
          nivelTitulacao:      vinculoAtual.nivelTitulacao,
          titulacaoComprovada: vinculoAtual.titulacaoComprovada,
          dataAdmissao:        vinculoAtual.dataAdmissao,
          dataPosse:           vinculoAtual.dataPosse,
          dataExercicio:       vinculoAtual.dataExercicio,
          ...resto,
        },
        include: VINCULO_INCLUDE,
      });
    });
  }

  async corrigirVinculo(tenantId, servidorId, vinculoId, dados) {
    await this.buscarPorId(tenantId, servidorId);

    const vinculo = await prisma.vinculoFuncional.findFirst({
      where: { id: vinculoId, servidorId, tenantId },
    });
    if (!vinculo) throw Errors.NOT_FOUND('Vínculo');

    const folhas = await prisma.itemFolha.count({ where: { servidorId } });
    if (folhas > 0) {
      const err = new Error('Não é possível corrigir o vínculo: já existem folhas de pagamento geradas para este servidor.');
      err.statusCode = 409;
      throw err;
    }

    const CAMPOS_DATA = ['dataAdmissao', 'dataPosse', 'dataExercicio', 'dataTermino', 'dataEncerramento'];
    const dataLimpa = Object.fromEntries(
      Object.entries(dados)
        .filter(([, v]) => v !== '' && v !== null && v !== undefined)
        .map(([k, v]) => [k, CAMPOS_DATA.includes(k) ? new Date(v) : v])
    );

    return prisma.vinculoFuncional.update({
      where: { id: vinculoId },
      data: dataLimpa,
      include: VINCULO_INCLUDE,
    });
  }

  async historico(tenantId, servidorId) {
    await this.buscarPorId(tenantId, servidorId);
    return prisma.vinculoFuncional.findMany({
      where: { servidorId },
      orderBy: { dataAdmissao: 'desc' },
      include: {
        cargo:         { select: { nome: true, codigo: true } },
        lotacao:       { select: { nome: true, sigla: true } },
        tabelaSalarial: { select: { nome: true } },
        nivelSalarial: { select: { nivel: true, classe: true, vencimentoBase: true } },
      },
    });
  }

  // ── CONTATOS ────────────────────────────────────────────────
  async listarContatos(tenantId, servidorId) {
    await this.buscarPorId(tenantId, servidorId);
    return prisma.contatoServidor.findMany({
      where: { servidorId },
      orderBy: [{ principal: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async criarContato(tenantId, servidorId, dados) {
    await this.buscarPorId(tenantId, servidorId);
    const contato = await prisma.contatoServidor.create({ data: { servidorId, ...dados } });
    if (dados.principal) await _garantirUmPrincipal('contatoServidor', servidorId, contato.id);
    return contato;
  }

  async atualizarContato(tenantId, servidorId, contatoId, dados) {
    await this.buscarPorId(tenantId, servidorId);
    const contato = await prisma.contatoServidor.update({ where: { id: contatoId }, data: dados });
    if (dados.principal) await _garantirUmPrincipal('contatoServidor', servidorId, contatoId);
    return contato;
  }

  async removerContato(tenantId, servidorId, contatoId) {
    await this.buscarPorId(tenantId, servidorId);
    await prisma.contatoServidor.update({ where: { id: contatoId }, data: { ativo: false } });
  }

  // ── ENDEREÇOS ───────────────────────────────────────────────
  async listarEnderecos(tenantId, servidorId) {
    await this.buscarPorId(tenantId, servidorId);
    return prisma.enderecoServidor.findMany({
      where: { servidorId },
      orderBy: [{ principal: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async criarEndereco(tenantId, servidorId, dados) {
    await this.buscarPorId(tenantId, servidorId);
    const endereco = await prisma.enderecoServidor.create({ data: { servidorId, ...dados } });
    if (dados.principal) await _garantirUmPrincipal('enderecoServidor', servidorId, endereco.id);
    return endereco;
  }

  async atualizarEndereco(tenantId, servidorId, enderecoId, dados) {
    await this.buscarPorId(tenantId, servidorId);
    const endereco = await prisma.enderecoServidor.update({ where: { id: enderecoId }, data: dados });
    if (dados.principal) await _garantirUmPrincipal('enderecoServidor', servidorId, enderecoId);
    return endereco;
  }

  async removerEndereco(tenantId, servidorId, enderecoId) {
    await this.buscarPorId(tenantId, servidorId);
    await prisma.enderecoServidor.update({ where: { id: enderecoId }, data: { ativo: false } });
  }

  // ── DOCUMENTOS ──────────────────────────────────────────────
  async documentos(tenantId, servidorId) {
    await this.buscarPorId(tenantId, servidorId);
    return prisma.documentoServidor.findMany({
      where: { servidorId, ativo: true }, orderBy: { createdAt: 'desc' },
    });
  }

  async uploadDocumento(tenantId, servidorId, dados) {
    await this.buscarPorId(tenantId, servidorId);
    return prisma.documentoServidor.create({ data: { servidorId, ...dados } });
  }

  // ── PROGRESSÕES ─────────────────────────────────────────────
  async progressoes(tenantId, servidorId) {
    await this.buscarPorId(tenantId, servidorId);
    return prisma.progressao.findMany({
      where: { servidorId },
      include: { nivelOrigem: true, nivelDestino: true, cargo: true },
      orderBy: { dataCompetencia: 'desc' },
    });
  }

  // ── EXTRATO ─────────────────────────────────────────────────
  async extrato(tenantId, servidorId) {
    const servidor = await this.buscarPorId(tenantId, servidorId);
    const vinculoAtual = servidor.vinculos.find(v => v.atual);

    const [progressoes, ferias, licencas] = await prisma.$transaction([
      prisma.progressao.findMany({
        where: { servidorId },
        include: { nivelOrigem: true, nivelDestino: true },
        orderBy: { dataCompetencia: 'desc' },
      }),
      prisma.ferias.findMany({ where: { servidorId }, include: { periodoAquisitivo: true } }),
      prisma.licenca.findMany({ where: { servidorId }, orderBy: { dataInicio: 'desc' } }),
    ]);

    return {
      servidor,
      vinculoAtual,
      historicoVinculos: servidor.vinculos,
      progressoes, ferias, licencas,
      anosServico: vinculoAtual ? anosDeServico(vinculoAtual.dataAdmissao) : null,
    };
  }

  async exportarXlsx(tenantId, filtros) {
    return Buffer.from('');
  }
}

module.exports = ServidorService;