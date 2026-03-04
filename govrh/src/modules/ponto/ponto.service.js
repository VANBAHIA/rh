const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');

class PontoService {

  async listarEscalas(tenantId) {
    return prisma.escalaTrabalho.findMany({
      where: { OR: [{ tenantId }, { tenantId: null }] },
      orderBy: { nome: 'asc' },
    });
  }

  async criarEscala(tenantId, dados) {
    const { turno, ...clean } = dados;
    const escalaDados = {
      ...clean,
      tenantId,
      turnos: dados.turnos || [],
      tipo: dados.tipo || 'FIXO',
      cargaHorariaSemanal: dados.cargaHorariaSemanal || 40,
    };
    return prisma.escalaTrabalho.create({ data: escalaDados });
  }

  async atualizarEscala(tenantId, id, dados) {
    const e = await prisma.escalaTrabalho.findUnique({ where: { id } });
    if (!e) throw Errors.NOT_FOUND('Escala');
    if (e.tenantId !== tenantId) {
      if (e.tenantId === null) throw Errors.FORBIDDEN('Escala de sistema não pode ser alterada.');
      throw Errors.NOT_FOUND('Escala');
    }
    const { turno, ...clean } = dados;
    const escalaDados = {
      ...clean,
      turnos: dados.turnos || [],
      tipo: dados.tipo || 'FIXO',
      cargaHorariaSemanal: dados.cargaHorariaSemanal || 40,
    };
    return prisma.escalaTrabalho.update({ where: { id }, data: escalaDados });
  }

  async excluirEscala(tenantId, id) {
    const e = await prisma.escalaTrabalho.findUnique({ where: { id } });
    if (!e) throw Errors.NOT_FOUND('Escala');
    if (e.tenantId !== tenantId) {
      if (e.tenantId === null) throw Errors.FORBIDDEN('Escala de sistema não pode ser excluída.');
      throw Errors.NOT_FOUND('Escala');
    }
    return prisma.escalaTrabalho.delete({ where: { id } });
  }

  async vincularServidorEscala(tenantId, escalaId, { servidorId, dataInicio, dataFim }) {
    const srv = await prisma.servidor.findFirst({ where: { id: servidorId, tenantId } });
    if (!srv) throw Errors.NOT_FOUND('Servidor');

    await prisma.servidorEscala.updateMany({
      where: { servidorId, ativo: true },
      data: { ativo: false, dataFim: new Date() },
    });

    return prisma.servidorEscala.create({
      data: { servidorId, escalaId, dataInicio: new Date(dataInicio), dataFim: dataFim ? new Date(dataFim) : null },
    });
  }

  async espelho(tenantId, servidorId, mes) {
    const srv = await prisma.servidor.findFirst({
      where: {
        tenantId,
        OR: [{ id: servidorId }, { matricula: servidorId }],
      },
      select: { id: true, matricula: true, nome: true },
    });
    if (!srv) throw Errors.NOT_FOUND('Servidor');

    const [ano, mesNum] = mes.split('-').map(Number);
    const dataInicio = new Date(ano, mesNum - 1, 1);
    const dataFim    = new Date(ano, mesNum, 0);

    const registros = await prisma.registroPonto.findMany({
      where: { servidorId: srv.id, data: { gte: dataInicio, lte: dataFim } },
      orderBy: { data: 'asc' },
    });

    const totais = registros.reduce((acc, r) => {
      acc.horasTrabalhadas += Number(r.horasTrabalhadas || 0);
      acc.horasExtras      += Number(r.horasExtras || 0);
      acc.horasFalta       += Number(r.horasFalta || 0);
      acc.faltas           += r.ocorrencia === 'FALTA_INJUSTIFICADA' ? 1 : 0;
      acc.faltasJustif     += r.ocorrencia === 'FALTA_JUSTIFICADA' ? 1 : 0;
      return acc;
    }, { horasTrabalhadas: 0, horasExtras: 0, horasFalta: 0, faltas: 0, faltasJustif: 0 });

    const batidas = registros.map(r => ({
      data:           r.data.toISOString(),
      entrada:        r.entrada        ? r.entrada.toISOString().split('T')[1].substring(0, 5)        : undefined,
      saidaAlmoco:    r.saidaAlmoco    ? r.saidaAlmoco.toISOString().split('T')[1].substring(0, 5)    : undefined,
      retornoAlmoco:  r.retornoAlmoco  ? r.retornoAlmoco.toISOString().split('T')[1].substring(0, 5)  : undefined,
      saida:          r.saida          ? r.saida.toISOString().split('T')[1].substring(0, 5)          : undefined,
      horasTrabalhadas: r.horasTrabalhadas ? Number(r.horasTrabalhadas) : undefined,
      horasDevidas: 0,
      saldo:        r.horasExtras ? Number(r.horasExtras) : 0,
      ocorrencias:  r.ocorrencia ? [r.ocorrencia.replace('FALTA_INJUSTIFICADA', 'FALTA').replace('_', ' ')] : [],
      status:       'APROVADO',
      observacao:   r.justificativa,
    }));

    const saldoBanco = totais.horasExtras - totais.horasFalta;

    return {
      servidorId:       srv.id,
      nome:             srv.nome,
      matricula:        srv.matricula,
      competencia:      mes,
      diasUteis:        0,
      diasTrabalhados:  registros.filter(r => !r.ocorrencia || !r.ocorrencia.includes('FALTA')).length,
      diasFalta:        totais.faltas + totais.faltasJustif,
      horasPrevistas:   0,
      horasTrabalhadas: totais.horasTrabalhadas,
      horasExtra:       totais.horasExtras,
      horasDevidas:     totais.horasFalta,
      saldoBanco,
      batidas,
    };
  }

  async lancar(tenantId, dados) {
    // Resolve servidor — aceita UUID ou matrícula
    const srv = await prisma.servidor.findFirst({
      where: {
        tenantId,
        OR: [{ id: dados.servidorId }, { matricula: dados.servidorId }],
      },
    });
    if (!srv) throw Errors.NOT_FOUND('Servidor');

    // ✅ FIX: sempre usa o UUID real daqui para frente
    const servidorIdReal = srv.id;

    const data    = new Date(dados.data);
    const entrada = dados.entrada ? new Date(dados.entrada) : null;
    const saida   = dados.saida   ? new Date(dados.saida)   : null;

    let horasTrabalhadas = 0;
    let horasExtras      = 0;
    let horasFalta       = 0;

    if (entrada && saida) {
      const intervaloMin = dados.intervaloMin || 60;
      const totalMin     = (saida - entrada) / 60000 - intervaloMin;
      horasTrabalhadas   = parseFloat((totalMin / 60).toFixed(2));

      const escalaVinc = await prisma.servidorEscala.findFirst({
        where: { servidorId: servidorIdReal, ativo: true },
        include: { escala: true },
      });
      if (escalaVinc) {
        const esperadas = Number(escalaVinc.escala.horasDiarias);
        const diff      = horasTrabalhadas - esperadas;
        if (diff > 0)      horasExtras = parseFloat(diff.toFixed(2));
        else if (diff < 0) horasFalta  = parseFloat(Math.abs(diff).toFixed(2));
      }
    }

    // ✅ FIX: sem ...dados no create — campos explícitos para não vazar matrícula ou campos inválidos
    return prisma.registroPonto.upsert({
      where: {
        servidorId_data: { servidorId: servidorIdReal, data },
      },
      create: {
        servidorId:    servidorIdReal,
        data,
        entrada,
        saida,
        saidaAlmoco:   dados.saidaAlmoco   ? new Date(dados.saidaAlmoco)   : null,
        retornoAlmoco: dados.retornoAlmoco  ? new Date(dados.retornoAlmoco) : null,
        horasTrabalhadas,
        horasExtras,
        horasFalta,
        origem:        dados.origem || 'MANUAL',
        ocorrencia:    dados.ocorrencia || null,
        justificativa: dados.justificativa || null,
      },
      update: {
        entrada,
        saida,
        saidaAlmoco:   dados.saidaAlmoco   ? new Date(dados.saidaAlmoco)   : undefined,
        retornoAlmoco: dados.retornoAlmoco  ? new Date(dados.retornoAlmoco) : undefined,
        horasTrabalhadas,
        horasExtras,
        horasFalta,
        ocorrencia:    dados.ocorrencia || null,
      },
    });
  }

  // Registra uma batida simples conforme horário atual
  async bater(tenantId, { servidorId, data, hora }) {
    const srv = await prisma.servidor.findFirst({
      where: {
        tenantId,
        OR: [{ id: servidorId }, { matricula: servidorId }],
      },
    });
    if (!srv) throw Errors.NOT_FOUND('Servidor');

    const dt = new Date(data);
    if (isNaN(dt)) throw Errors.APP_ERROR('Data inválida');
    const ts = new Date(`${data}T${hora}`);
    if (isNaN(ts)) throw Errors.APP_ERROR('Hora inválida');

    // Busca registro existente usando UUID real
    const registro = await prisma.registroPonto.findFirst({
      where: { servidorId: srv.id, data: dt },
    });

    const campos = {};
    let tipoInserido = null;

    if (!registro || !registro.entrada) {
      campos.entrada = ts;
      tipoInserido   = 'entrada';
    } else if (!registro.saida) {
      campos.saida   = ts;
      campos.entrada = registro.entrada;
      tipoInserido   = 'saida';
    } else if (!registro.saidaAlmoco) {
      campos.saidaAlmoco = ts;
      campos.entrada     = registro.entrada;
      campos.saida       = registro.saida;
      tipoInserido       = 'saidaAlmoco';
    } else if (!registro.retornoAlmoco) {
      campos.retornoAlmoco = ts;
      campos.entrada       = registro.entrada;
      campos.saida         = registro.saida;
      campos.saidaAlmoco   = registro.saidaAlmoco;
      tipoInserido         = 'retornoAlmoco';
    } else {
      return { registro, tipo: null };
    }

    // ✅ Passa sempre o UUID real para lancar()
    const resultado = await this.lancar(tenantId, { servidorId: srv.id, data, ...campos });
    return { registro: resultado, tipo: tipoInserido };
  }

  async importar(tenantId, { servidorId, registros }) {
    const srv = await prisma.servidor.findFirst({ where: { id: servidorId, tenantId } });
    if (!srv) throw Errors.NOT_FOUND('Servidor');

    const resultados = [];
    for (const reg of registros) {
      try {
        const r = await this.lancar(tenantId, { ...reg, servidorId: srv.id, origem: 'REP_P' });
        resultados.push({ data: reg.data, status: 'ok', id: r.id });
      } catch (e) {
        resultados.push({ data: reg.data, status: 'erro', mensagem: e.message });
      }
    }
    return {
      total:      registros.length,
      importados: resultados.filter(r => r.status === 'ok').length,
      resultados,
    };
  }

  async abonar(tenantId, id, { justificativa }, userId) {
    const reg = await prisma.registroPonto.findFirst({
      where: { id },
      include: { servidor: true },
    });
    if (!reg || reg.servidor.tenantId !== tenantId) throw Errors.NOT_FOUND('Registro de ponto');

    return prisma.registroPonto.update({
      where: { id },
      data: { abonado: true, justificativa, abonadoEm: new Date() },
    });
  }

  async registrarOcorrencia(tenantId, id, { ocorrencia, justificativa }) {
    const reg = await prisma.registroPonto.findFirst({
      where: { id },
      include: { servidor: true },
    });
    if (!reg || reg.servidor.tenantId !== tenantId) throw Errors.NOT_FOUND('Registro de ponto');
    return prisma.registroPonto.update({ where: { id }, data: { ocorrencia, justificativa } });
  }

  async bancohoras(tenantId, servidorId) {
    const srv = await prisma.servidor.findFirst({ where: { id: servidorId, tenantId } });
    if (!srv) throw Errors.NOT_FOUND('Servidor');

    const movimentos = await prisma.bancoHoras.findMany({
      where: { servidorId },
      orderBy: { data: 'desc' },
      take: 50,
    });

    const saldoAtual = movimentos.length > 0 ? Number(movimentos[0].saldo) : 0;
    return { servidorId, saldoAtual, movimentos };
  }

  async compensar(tenantId, servidorId, { horas, data, descricao }) {
    const srv = await prisma.servidor.findFirst({ where: { id: servidorId, tenantId } });
    if (!srv) throw Errors.NOT_FOUND('Servidor');

    const { saldoAtual } = await this.bancohoras(tenantId, servidorId);
    if (horas > saldoAtual) throw Errors.VALIDATION(`Saldo de banco de horas insuficiente. Disponível: ${saldoAtual}h`);

    const novoSaldo = parseFloat((saldoAtual - horas).toFixed(2));
    return prisma.bancoHoras.create({
      data: {
        servidorId,
        data:      new Date(data),
        tipo:      'DEBITO',
        horas,
        saldo:     novoSaldo,
        descricao: descricao || 'Compensação de horas',
      },
    });
  }

  async resumoMensal(tenantId, mes, query = {}, skip = 0, take = 20) {
    const [ano, mesNum] = mes.split('-').map(Number);
    const dataInicio = new Date(ano, mesNum - 1, 1);
    const dataFim    = new Date(ano, mesNum, 0);

    const where = { servidor: { tenantId } };
    if (query.lotacaoId) where.servidor = { ...where.servidor, lotacaoId: query.lotacaoId };

    const registros = await prisma.registroPonto.groupBy({
      by: ['servidorId'],
      where: { ...where, data: { gte: dataInicio, lte: dataFim } },
      _sum:   { horasTrabalhadas: true, horasExtras: true, horasFalta: true },
      _count: { id: true },
      skip, take,
    });

    return { dados: registros, total: registros.length };
  }

  async pendencias(tenantId, query = {}) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return prisma.registroPonto.findMany({
      where: {
        servidor:   { tenantId },
        data:       { gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1), lte: hoje },
        entrada:    { not: null },
        saida:      null,
        ocorrencia: null,
      },
      include: {
        servidor: { select: { matricula: true, nome: true } },
      },
      orderBy: { data: 'desc' },
    });
  }
}

module.exports = PontoService;
