const prisma = require('../../config/prisma');
const { Errors } = require('../../shared/errors/AppError');
const { gerarMatricula } = require('../../shared/utils/matricula');
const { mesesEntreatas } = require('../../shared/utils/date');

const MESES_ESTAGIO = { ESTATUTARIO: 36, CELETISTA: 3, TEMPORARIO: 3 };

class ConcursoService {

  async listar(tenantId, query = {}, skip = 0, take = 20) {
    const where = { tenantId };
    if (query.status) where.status = query.status;
    if (query.ano)    where.dataAbertura = {
      gte: new Date(`${parseInt(query.ano)}-01-01`),
      lte: new Date(`${parseInt(query.ano)}-12-31`),
    };

    const [dados, total] = await prisma.$transaction([
      prisma.concursoPublico.findMany({
        where, skip, take,
        orderBy: { dataAbertura: 'desc' },
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
    if (query.status)                  where.statusConvocacao = query.status;
    if (query.convocado !== undefined)  where.convocado = query.convocado === 'true';
    if (query.q)                       where.nome     = { contains: query.q };

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
        const existente = await prisma.candidato.findFirst({
          where: { concursoId, cpf: cand.cpf },
        });
        if (existente) {
          await prisma.candidato.update({
            where: { id: existente.id },
            data: { classificacao: cand.classificacao, nota: cand.nota },
          });
        } else {
          await prisma.candidato.create({
            data: { ...cand, concursoId, statusConvocacao: null },
          });
        }
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
        statusConvocacao: 'CONVOCADO',
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
    if (cand.statusConvocacao === 'EMPOSSADO') throw Errors.VALIDATION('Candidato já empossado.');

    const tabelaAtiva = await prisma.tabelaSalarial.findFirst({ where: { tenantId, ativa: true } });
    if (!tabelaAtiva) throw Errors.VALIDATION('Nenhuma tabela salarial ativa cadastrada.');

    const matricula = await gerarMatricula(tenantId);
    const regimeJuridico = 'ESTATUTARIO';
    const mesesEstagio = MESES_ESTAGIO[regimeJuridico] || 36;
    const dataFimEstagio = new Date(dataPosse);
    dataFimEstagio.setMonth(dataFimEstagio.getMonth() + mesesEstagio);

    const servidor = await prisma.$transaction(async (tx) => {
      const srv = await tx.servidor.create({
        data: {
          tenantId,
          matricula,
          nome: cand.nome,
          cpf:  cand.cpf,
          ...dadosPessoais,
        },
      });

      await tx.vinculoFuncional.create({
        data: {
          servidorId:       srv.id,
          tenantId,
          regimeJuridico,
          cargoId:          cand.cargoId,
          tabelaSalarialId: tabelaAtiva.id,
          nivelSalarialId,
          lotacaoId,
          situacaoFuncional: 'ATIVO',
          tipoAlteracao:    'POSSE',
          dataAdmissao:     new Date(dataPosse),
          dataPosse:        new Date(dataPosse),
          dataExercicio:    dataExercicio ? new Date(dataExercicio) : null,
          atual:            true,
        },
      });

      await tx.candidato.update({
        where: { id: candidatoId },
        data:  { statusConvocacao: 'EMPOSSADO', dataPosse: new Date(dataPosse), servidorId: srv.id },
      });

      await tx.estagioProbatorio.create({
        data: {
          servidorId: srv.id,
          dataInicio: new Date(dataPosse),
          dataFim:    dataFimEstagio,
          status:     'EM_CURSO',
        },
      });

      return srv;
    });

    return { servidor: { id: servidor.id, matricula: servidor.matricula, nome: servidor.nome }, candidato: cand };
  }

  async estagiosEmAndamento(tenantId, query = {}, skip = 0, take = 20) {
    const [dados, total] = await prisma.$transaction([
      prisma.estagioProbatorio.findMany({
        where: { status: 'EM_CURSO', servidor: { tenantId } },
        skip, take,
        include: {
          servidor: {
            select: {
              matricula: true,
              nome: true,
              vinculos: {
                where: { atual: true },
                take: 1,
                select: {
                  dataAdmissao: true,
                  cargo:   { select: { nome: true } },
                  lotacao: { select: { nome: true } },
                },
              },
            },
          },
          avaliacoes: { orderBy: { periodo: 'asc' } },
        },
        orderBy: { dataFim: 'asc' },
      }),
      prisma.estagioProbatorio.count({
        where: { status: 'EM_CURSO', servidor: { tenantId } },
      }),
    ]);

    const dadosEnriquecidos = dados.map(e => {
      const mesesDecorridos = mesesEntreatas(e.dataInicio);
      const mesesTotal      = mesesEntreatas(e.dataInicio, e.dataFim);
      return {
        ...e,
        mesesDecorridos,
        percentualConcluido: Math.min(100, Math.round((mesesDecorridos / mesesTotal) * 100)),
      };
    });

    return { dados: dadosEnriquecidos, total };
  }

  async registrarAvaliacao(tenantId, servidorId, { periodo, notaGeral, resultado, avaliadorNome, dataAvaliacao, observacao }) {
    const estagio = await prisma.estagioProbatorio.findFirst({
      where: { servidorId, status: 'EM_CURSO', servidor: { tenantId } },
    });
    if (!estagio) throw Errors.NOT_FOUND('Estágio probatório em andamento');

    const existente = await prisma.avaliacaoEstagio.findFirst({
      where: { estagioProbId: estagio.id, periodo },
    });
    if (existente) throw Errors.ALREADY_EXISTS(`Avaliação do período ${periodo}`);

    return prisma.avaliacaoEstagio.create({
      data: {
        estagioProbId: estagio.id,
        periodo,
        notaGeral:     notaGeral || null,
        resultado:     resultado || 'PENDENTE',
        avaliadorNome: avaliadorNome || null,
        dataAvaliacao: dataAvaliacao ? new Date(dataAvaliacao) : new Date(),
        observacao:    observacao || null,
      },
    });
  }

  async concluirEstagio(tenantId, servidorId, { resultado, observacao }) {
    const estagio = await prisma.estagioProbatorio.findFirst({
      where: { servidorId, status: 'EM_CURSO', servidor: { tenantId } },
    });
    if (!estagio) throw Errors.NOT_FOUND('Estágio probatório em andamento');

    const ops = [
      prisma.estagioProbatorio.update({
        where: { id: estagio.id },
        data:  { status: resultado, observacao },
      }),
    ];

    if (resultado === 'REPROVADO') {
      const vinculo = await prisma.vinculoFuncional.findFirst({
        where: { servidorId, atual: true },
      });
      if (vinculo) {
        ops.push(
          prisma.vinculoFuncional.update({
            where: { id: vinculo.id },
            data:  {
              situacaoFuncional: 'EXONERADO',
              motivoEncerramento: 'Reprovado no estágio probatório.',
              dataEncerramento:   new Date(),
              tipoAlteracao:      'EXONERACAO',
              atual:              false,
            },
          })
        );
      }
    }

    await prisma.$transaction(ops);
    return prisma.estagioProbatorio.findUnique({ where: { id: estagio.id } });
  }
}

module.exports = ConcursoService;
