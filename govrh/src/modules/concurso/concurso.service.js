const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');
const { gerarMatricula } = require('../../shared/utils/matricula');
const { mesesEntreatas } = require('../../shared/utils/date');

// Meses de estágio probatório por regime
const MESES_ESTAGIO = { ESTATUTARIO: 36, CELETISTA: 3, TEMPORARIO: 3 };

class ConcursoService {

  async listar(tenantId, query = {}, skip = 0, take = 20) {
    const where = { tenantId };
    if (query.status) where.status = query.status;
    if (query.ano)    where.ano    = parseInt(query.ano);

    const [dados, total] = await prisma.$transaction([
      prisma.concursoPublico.findMany({
        where, skip, take,
        orderBy: { ano: 'desc' },
        include: { _count: { select: { candidatos: true } } },
      }),
      prisma.concursoPublico.count({ where }),
    ]);
    return { dados, total };
  }

  async criar(tenantId, dados) {
    return prisma.concursoPublico.create({ data: { ...dados, tenantId } });
  }

  async buscar(tenantId, id) {
    const c = await prisma.concursoPublico.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { candidatos: true } } },
    });
    if (!c) throw Errors.NOT_FOUND('Concurso Público');
    return c;
  }

  async atualizar(tenantId, id, dados) {
    await this.buscar(tenantId, id);
    return prisma.concursoPublico.update({ where: { id }, data: dados });
  }

  async candidatos(tenantId, concursoId, query = {}, skip = 0, take = 20) {
    await this.buscar(tenantId, concursoId);
    const where = { concursoId };
    if (query.status)      where.status      = query.status;
    if (query.convocado !== undefined) where.convocado = query.convocado === 'true';
    if (query.q) where.nome = { contains: query.q };

    const [dados, total] = await prisma.$transaction([
      prisma.candidato.findMany({
        where, skip, take,
        orderBy: { classificacao: 'asc' },
        include: { cargo: { select: { nome: true } } },
      }),
      prisma.candidato.count({ where }),
    ]);
    return { dados, total };
  }

  async importarCandidatos(tenantId, concursoId, { candidatos }) {
    await this.buscar(tenantId, concursoId);

    const resultados = { importados: 0, erros: [] };
    for (const cand of candidatos) {
      try {
        await prisma.candidato.upsert({
          where: { concursoId_cpf: { concursoId, cpf: cand.cpf } },
          create: { ...cand, concursoId, tenantId, status: 'CLASSIFICADO' },
          update: { classificacao: cand.classificacao, nota: cand.nota },
        });
        resultados.importados++;
      } catch (e) {
        resultados.erros.push({ cpf: cand.cpf, erro: e.message });
      }
    }

    return resultados;
  }

  async buscarCandidato(tenantId, concursoId, candId) {
    const cand = await prisma.candidato.findFirst({
      where: { id: candId, concursoId, concurso: { tenantId } },
      include: { concurso: true, cargo: true },
    });
    if (!cand) throw Errors.NOT_FOUND('Candidato');
    return cand;
  }

  async convocar(tenantId, concursoId, { candidatoIds, dataConvocacao, observacao }) {
    await this.buscar(tenantId, concursoId);

    await prisma.candidato.updateMany({
      where: { id: { in: candidatoIds }, concursoId },
      data: {
        convocado: true,
        dataConvocacao: new Date(dataConvocacao),
        status: 'CONVOCADO',
        observacao,
      },
    });

    return { convocados: candidatoIds.length, dataConvocacao };
  }

  async registrarPosse(tenantId, concursoId, { candidatoId, dataPosse, dataExercicio, nivelSalarialId, lotacaoId, dadosPessoais }) {
    const cand = await prisma.candidato.findFirst({
      where: { id: candidatoId, concursoId, concurso: { tenantId } },
      include: { concurso: true, cargo: true },
    });
    if (!cand) throw Errors.NOT_FOUND('Candidato');
    if (cand.status === 'EMPOSSADO') throw Errors.VALIDATION('Candidato já empossado.');

    // Busca tabela salarial ativa
    const tabelaAtiva = await prisma.tabelaSalarial.findFirst({ where: { tenantId, ativa: true } });
    if (!tabelaAtiva) throw Errors.VALIDATION('Nenhuma tabela salarial ativa cadastrada.');

    const matricula = await gerarMatricula(tenantId);

    // Cria o servidor a partir do candidato
    const servidor = await prisma.$transaction(async (tx) => {
      const srv = await tx.servidor.create({
        data: {
          tenantId,
          matricula,
          nome: cand.nome,
          cpf: cand.cpf,
          ...dadosPessoais,
          cargoId: cand.cargoId,
          tabelaSalarialId: tabelaAtiva.id,
          nivelSalarialId,
          lotacaoId,
          regimeJuridico: cand.concurso.regimeJuridico || 'ESTATUTARIO',
          situacaoFuncional: 'ATIVO',
          dataAdmissao: new Date(dataPosse),
          dataPosse: new Date(dataPosse),
          dataExercicio: dataExercicio ? new Date(dataExercicio) : null,
        },
      });

      // Atualiza candidato como empossado
      await tx.candidato.update({
        where: { id: candidatoId },
        data: { status: 'EMPOSSADO', dataPosse: new Date(dataPosse), servidorId: srv.id },
      });

      // Cria estágio probatório
      const mesesEstagio = MESES_ESTAGIO[srv.regimeJuridico] || 36;
      const dataFimEstagio = new Date(dataPosse);
      dataFimEstagio.setMonth(dataFimEstagio.getMonth() + mesesEstagio);

      await tx.estagioProbatorio.create({
        data: {
          servidorId: srv.id,
          tenantId,
          dataInicio: new Date(dataPosse),
          dataFimPrevisto: dataFimEstagio,
          status: 'EM_ANDAMENTO',
        },
      });

      // Histórico
      await tx.historicoFuncional.create({
        data: {
          servidorId: srv.id,
          tenantId,
          dataAlteracao: new Date(dataPosse),
          tipoAlteracao: 'ADMISSAO',
          descricao: `Posse e ingresso via Concurso Público ${cand.concurso.numero || cand.concurso.descricao}`,
          cargoNovoId: cand.cargoId,
          lotacaoNovaId: lotacaoId,
          nivelSalarialNovoId: nivelSalarialId,
          situacaoNova: 'ATIVO',
        },
      });

      return srv;
    });

    return { servidor: { id: servidor.id, matricula: servidor.matricula, nome: servidor.nome }, candidato: cand };
  }

  async estagiosEmAndamento(tenantId, query = {}, skip = 0, take = 20) {
    const where = { tenantId, status: 'EM_ANDAMENTO' };

    const [dados, total] = await prisma.$transaction([
      prisma.estagioProbatorio.findMany({
        where, skip, take,
        include: {
          servidor: {
            select: { matricula: true, nome: true, dataAdmissao: true,
              cargo: { select: { nome: true } }, lotacao: { select: { nome: true } } },
          },
          avaliacoes: { orderBy: { periodo: 'asc' } },
        },
        orderBy: { dataFimPrevisto: 'asc' },
      }),
      prisma.estagioProbatorio.count({ where }),
    ]);

    // Adiciona meses decorridos e % de conclusão
    const dadosEnriquecidos = dados.map(e => {
      const mesesDecorridos = mesesEntreatas(e.dataInicio);
      const mesesTotal = mesesEntreatas(e.dataInicio, e.dataFimPrevisto);
      return {
        ...e,
        mesesDecorridos,
        percentualConcluido: Math.min(100, Math.round((mesesDecorridos / mesesTotal) * 100)),
      };
    });

    return { dados: dadosEnriquecidos, total };
  }

  async registrarAvaliacao(tenantId, servidorId, { periodo, nota, parecer, avaliadorId, dataAvaliacao }) {
    const estagio = await prisma.estagioProbatorio.findFirst({
      where: { servidorId, tenantId, status: 'EM_ANDAMENTO' },
    });
    if (!estagio) throw Errors.NOT_FOUND('Estágio probatório em andamento');

    // Verifica se período já foi avaliado
    const existente = await prisma.avaliacaoEstagio.findFirst({
      where: { estagioProbatorioId: estagio.id, periodo },
    });
    if (existente) throw Errors.ALREADY_EXISTS(`Avaliação do período ${periodo}`);

    return prisma.avaliacaoEstagio.create({
      data: {
        estagioProbatorioId: estagio.id,
        periodo,
        nota,
        parecer,
        avaliadorId,
        dataAvaliacao: dataAvaliacao ? new Date(dataAvaliacao) : new Date(),
        aprovado: nota >= 6, // Nota mínima configurável
      },
    });
  }

  async concluirEstagio(tenantId, servidorId, { resultado, portaria, observacao }) {
    const estagio = await prisma.estagioProbatorio.findFirst({
      where: { servidorId, tenantId, status: 'EM_ANDAMENTO' },
    });
    if (!estagio) throw Errors.NOT_FOUND('Estágio probatório em andamento');

    await prisma.$transaction([
      prisma.estagioProbatorio.update({
        where: { id: estagio.id },
        data: { status: resultado, dataFimReal: new Date(), portaria, observacao },
      }),
      // Se reprovado, exonera o servidor
      ...(resultado === 'REPROVADO' ? [
        prisma.servidor.update({
          where: { id: servidorId },
          data: { situacaoFuncional: 'EXONERADO', motivoExoneracao: 'Reprovado no estágio probatório.' },
        }),
      ] : []),
    ]);

    return prisma.estagioProbatorio.findUnique({ where: { id: estagio.id } });
  }
}

module.exports = ConcursoService;
