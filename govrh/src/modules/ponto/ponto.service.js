const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');

// ── Helper: converte "HH:mm" em minutos desde meia-noite ─────────
function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

class PontoService {

  async listarEscalas(tenantId) {
    return prisma.escalaTrabalho.findMany({
      where: { tenantId },
      orderBy: { nome: 'asc' },
      include: {
        _count: { select: { servidores: true } },
      },
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
    if (e.tenantId !== tenantId) throw Errors.NOT_FOUND('Escala');
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
    if (e.tenantId !== tenantId) throw Errors.NOT_FOUND('Escala');
    return prisma.escalaTrabalho.delete({ where: { id } });
  }

  async vincularServidorEscala(tenantId, escalaId, { servidorId, dataInicio, dataFim }) {
    const srv = await prisma.servidor.findFirst({ where: { id: servidorId, tenantId } });
    if (!srv) throw Errors.NOT_FOUND('Servidor');

    await prisma.servidorEscala.updateMany({
      where: { servidorId, ativa: true },
      data: { ativa: false, dataFim: new Date() },
    });

    return prisma.servidorEscala.create({
      data: { servidorId, escalaId, dataInicio: new Date(dataInicio), dataFim: dataFim ? new Date(dataFim) : null },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // VALIDAR BATIDA
  // Chamado pelo terminal ANTES de registrar o ponto.
  // Retorna:
  //   { permitido: false, motivo, mensagem }  → servidor sem escala no dia
  //   { permitido: true, tipoBatida, aviso? } → pode registrar (com ou sem aviso)
  // ─────────────────────────────────────────────────────────────
  async validarBatida(tenantId, { servidorId, data, hora }) {
    // 1. Resolve servidor
    const srv = await prisma.servidor.findFirst({
      where: {
        tenantId,
        OR: [{ id: servidorId }, { matricula: servidorId }],
      },
      select: { id: true, nome: true, matricula: true },
    });
    if (!srv) throw Errors.NOT_FOUND('Servidor');

    // 2. Busca escala ativa do servidor
    const vinculo = await prisma.servidorEscala.findFirst({
      where: { servidorId: srv.id, ativa: true },  // campo correto: ativa
      include: { escala: true },
    });

    if (!vinculo || !vinculo.escala) {
      return {
        permitido: false,
        motivo: 'SEM_ESCALA',
        mensagem:
          'Você não possui uma escala de trabalho ativa. ' +
          'Por favor, entre em contato com sua chefia imediata para regularizar sua situação.',
      };
    }

    // 3. Verifica se o turno do dia existe na escala
    const diaSemana = new Date(data + 'T12:00:00').getDay(); // 0=Dom … 6=Sáb
    const turnos    = Array.isArray(vinculo.escala.turnos) ? vinculo.escala.turnos : [];
    const turno     = turnos.find(t => t.diaSemana === diaSemana);

    if (!turno || turno.folga) {
      const diasNomes = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
      return {
        permitido: false,
        motivo: 'DIA_NAO_ESCALADO',
        mensagem:
          `Você não está escalado para trabalhar nesta ${diasNomes[diaSemana]}. ` +
          'Caso precise registrar presença, procure sua chefia imediata para solicitar o ajuste manual.',
      };
    }

    // 4. Identifica qual batida é (baseado no registro existente do dia)
    // @db.Date no Prisma armazena como meia-noite UTC → usar range amplo para cobrir qualquer timezone
    const dataInicioDia = new Date(data + 'T00:00:00.000Z'); // início do dia UTC
    const dataFimDia    = new Date(data + 'T23:59:59.999Z'); // fim do dia UTC

    console.log('[validarBatida] servidorId recebido:', servidorId);
    console.log('[validarBatida] srv.id resolvido:', srv.id);
    console.log('[validarBatida] data param:', data);
    console.log('[validarBatida] range busca:', dataInicioDia.toISOString(), '→', dataFimDia.toISOString());

    const registroExistente = await prisma.registroPonto.findFirst({
      where: {
        servidorId: srv.id,
        data: { gte: dataInicioDia, lte: dataFimDia },
      },
      orderBy: { createdAt: 'desc' }, // pega o mais recente do dia se houver duplicata
    });

    console.log('[validarBatida] registroExistente:', registroExistente
      ? {
          id:            registroExistente.id,
          data:          registroExistente.data,
          entrada:       registroExistente.entrada,
          saidaAlmoco:   registroExistente.saidaAlmoco,
          retornoAlmoco: registroExistente.retornoAlmoco,
          saida:         registroExistente.saida,
        }
      : null
    );

    // Determina a próxima batida esperada com base no que já foi registrado
    // Regra: segue a sequência entrada → saidaAlmoco → retornoAlmoco → saida
    // Se o turno não tem almoço, pula direto de entrada para saida

    // Jornada encerrada — servidor já registrou a saída do dia
    if (registroExistente && registroExistente.saida) {
      const saidaHora = registroExistente.saida.toISOString().split('T')[1].substring(0, 5);
      return {
        permitido: false,
        motivo:    'JORNADA_ENCERRADA',
        mensagem:
          `Sua jornada de trabalho já foi encerrada hoje. ` +
          `A saída foi registrada às ${saidaHora}. ` +
          'Se precisar de algum ajuste, solicite à sua chefia imediata a correção manual do ponto.',
      };
    }

    let tipoBatida;

    if (!registroExistente || !registroExistente.entrada) {
      tipoBatida = 'entrada';
    } else if (!registroExistente.saidaAlmoco && turno.almoco) {
      tipoBatida = 'saidaAlmoco';
    } else if (registroExistente.saidaAlmoco && !registroExistente.retornoAlmoco && turno.almoco) {
      tipoBatida = 'retornoAlmoco';
    } else {
      tipoBatida = 'saida';
    }

    console.log('[validarBatida] turno.almoco:', turno.almoco);
    console.log('[validarBatida] tipoBatida determinado:', tipoBatida);

    // 5. Calcula diferença em minutos entre hora atual e horário esperado
    const agoraMin = toMin(hora);

    const horariosEsperados = {
      entrada:       turno.entrada,
      saidaAlmoco:   turno.almoco?.inicio,
      retornoAlmoco: turno.almoco?.fim,
      saida:         turno.saida,
    };

    const esperadoStr = horariosEsperados[tipoBatida];

    // Avisos configurados na escala (fallback para 10 min)
    const avisos = (vinculo.escala.avisosBatida && typeof vinculo.escala.avisosBatida === 'object')
      ? vinculo.escala.avisosBatida
      : { entrada: 10, saidaAlmoco: 10, retornoAlmoco: 10, saida: 10 };

    const limiarMin = avisos[tipoBatida] ?? 10;

    let aviso = null;

    if (esperadoStr) {
      const esperadoMin = toMin(esperadoStr);
      const diffMin     = agoraMin - esperadoMin; // positivo = atraso, negativo = antecipado

      const tipoLabel = {
        entrada:       'entrada',
        saidaAlmoco:   'saída para o almoço',
        retornoAlmoco: 'retorno do almoço',
        saida:         'saída',
      }[tipoBatida];

      if (diffMin > limiarMin) {
        // Atrasado além do limiar
        aviso = {
          tipo: 'ATRASO',
          minutos: diffMin,
          mensagem:
            `Seu ponto de ${tipoLabel} está sendo registrado com ${diffMin} minuto${diffMin !== 1 ? 's' : ''} de atraso ` +
            `em relação ao horário previsto (${esperadoStr}). ` +
            'Se houver alguma inconsistência, solicite à sua chefia imediata o ajuste manual do ponto.',
        };
      } else if (diffMin < -limiarMin) {
        // Antecipado além do limiar
        const antMin = Math.abs(diffMin);
        aviso = {
          tipo: 'ANTECIPADO',
          minutos: antMin,
          mensagem:
            `Seu ponto de ${tipoLabel} está sendo registrado com ${antMin} minuto${antMin !== 1 ? 's' : ''} de antecedência ` +
            `em relação ao horário previsto (${esperadoStr}). ` +
            'Se houver alguma inconsistência, solicite à sua chefia imediata o ajuste manual do ponto.',
        };
      }
    }

    return {
      permitido:  true,
      tipoBatida,
      horarioEsperado: esperadoStr || null,
      aviso, // null se dentro do limiar
    };
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
      data:             r.data.toISOString(),
      entrada:          r.entrada        ? r.entrada.toISOString().split('T')[1].substring(0, 5)        : undefined,
      saidaAlmoco:      r.saidaAlmoco    ? r.saidaAlmoco.toISOString().split('T')[1].substring(0, 5)    : undefined,
      retornoAlmoco:    r.retornoAlmoco  ? r.retornoAlmoco.toISOString().split('T')[1].substring(0, 5)  : undefined,
      saida:            r.saida          ? r.saida.toISOString().split('T')[1].substring(0, 5)          : undefined,
      horasTrabalhadas: r.horasTrabalhadas ? Number(r.horasTrabalhadas) : undefined,
      horasDevidas:     0,
      saldo:            r.horasExtras ? Number(r.horasExtras) : 0,
      ocorrencias:      r.ocorrencia ? [r.ocorrencia.replace('FALTA_INJUSTIFICADA', 'FALTA').replace('_', ' ')] : [],
      status:           'APROVADO',
      observacao:       r.justificativa,
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
    const srv = await prisma.servidor.findFirst({
      where: {
        tenantId,
        OR: [{ id: dados.servidorId }, { matricula: dados.servidorId }],
      },
    });
    if (!srv) throw Errors.NOT_FOUND('Servidor');

    const servidorIdReal = srv.id;

    // Normaliza data para meia-noite UTC — mesmo formato que o Prisma usa em @db.Date
    const dataStr = typeof dados.data === 'string' ? dados.data.split('T')[0] : new Date(dados.data).toISOString().split('T')[0];
    const data    = new Date(dataStr + 'T00:00:00.000Z');

    const entrada       = dados.entrada       ? new Date(dados.entrada)       : null;
    const saida         = dados.saida         ? new Date(dados.saida)         : null;
    const saidaAlmoco   = dados.saidaAlmoco   ? new Date(dados.saidaAlmoco)   : null;
    const retornoAlmoco = dados.retornoAlmoco ? new Date(dados.retornoAlmoco) : null;

    let horasTrabalhadas = 0;
    let horasExtras      = 0;
    let horasFalta       = 0;

    if (entrada && saida) {
      const intervaloMin = dados.intervaloMin || 60;
      const totalMin     = (saida - entrada) / 60000 - intervaloMin;
      horasTrabalhadas   = parseFloat((totalMin / 60).toFixed(2));

      const escalaVinc = await prisma.servidorEscala.findFirst({
        where: { servidorId: servidorIdReal, ativa: true },
        include: { escala: true },
      });
      if (escalaVinc) {
        const esperadas = Number(escalaVinc.escala.horasDiarias);
        const diff      = horasTrabalhadas - esperadas;
        if (diff > 0)      horasExtras = parseFloat(diff.toFixed(2));
        else if (diff < 0) horasFalta  = parseFloat(Math.abs(diff).toFixed(2));
      }
    }

    console.log('[lancar] upsert data UTC:', data.toISOString(), '| tipo:', dados.saidaAlmoco ? 'saidaAlmoco' : dados.retornoAlmoco ? 'retornoAlmoco' : dados.saida ? 'saida' : 'entrada');

    return prisma.registroPonto.upsert({
      where: {
        servidorId_data: { servidorId: servidorIdReal, data },
      },
      create: {
        servidorId: servidorIdReal,
        data,
        entrada,
        saida,
        saidaAlmoco,
        retornoAlmoco,
        horasTrabalhadas,
        horasExtras,
        horasFalta,
        origem:        dados.origem || 'MANUAL',
        ocorrencia:    dados.ocorrencia || null,
        justificativa: dados.justificativa || null,
      },
      update: {
        // Só atualiza campos que vieram no payload — nunca apaga dados existentes com null
        ...(entrada       !== null && { entrada }),
        ...(saida         !== null && { saida }),
        ...(saidaAlmoco   !== null && { saidaAlmoco }),
        ...(retornoAlmoco !== null && { retornoAlmoco }),
        horasTrabalhadas,
        horasExtras,
        horasFalta,
        ocorrencia: dados.ocorrencia || null,
      },
    });
  }

  async bater(tenantId, { servidorId, data, hora }) {
    const srv = await prisma.servidor.findFirst({
      where: {
        tenantId,
        OR: [{ id: servidorId }, { matricula: servidorId }],
      },
    });
    if (!srv) throw Errors.NOT_FOUND('Servidor');

    const ts = new Date(`${data}T${hora}`);
    if (isNaN(ts)) throw Errors.APP_ERROR('Hora inválida');

    // Busca pelo valor exato da data em UTC — mesmo formato do lancar()
    const dataUTC = new Date(data + 'T00:00:00.000Z');
    const registro = await prisma.registroPonto.findFirst({
      where: { servidorId: srv.id, data: dataUTC },
    });

    console.log('[bater] buscando registro para', srv.id, 'data UTC:', dataUTC.toISOString(), '| encontrou:', registro ? registro.id : null);

    const campos = {};
    let tipoInserido = null;

    // Sequência correta: entrada → saidaAlmoco → retornoAlmoco → saida
    if (!registro || !registro.entrada) {
      campos.entrada = ts;
      tipoInserido   = 'entrada';
    } else if (!registro.saidaAlmoco) {
      campos.saidaAlmoco = ts;
      campos.entrada     = registro.entrada;
      tipoInserido       = 'saidaAlmoco';
    } else if (!registro.retornoAlmoco) {
      campos.retornoAlmoco = ts;
      campos.entrada       = registro.entrada;
      campos.saidaAlmoco   = registro.saidaAlmoco;
      tipoInserido         = 'retornoAlmoco';
    } else if (!registro.saida) {
      campos.saida   = ts;
      campos.entrada = registro.entrada;
      if (registro.saidaAlmoco)   campos.saidaAlmoco   = registro.saidaAlmoco;
      if (registro.retornoAlmoco) campos.retornoAlmoco = registro.retornoAlmoco;
      tipoInserido   = 'saida';
    } else {
      return { registro, tipo: null };
    }

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
