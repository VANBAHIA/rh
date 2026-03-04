/**
 * Utilitários de data para o domínio de RH público.
 */

/**
 * Calcula tempo de serviço em meses entre duas datas.
 */
function mesesEntreatas(dataInicio, dataFim = new Date()) {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  return (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth());
}

/**
 * Calcula anos completos de serviço.
 */
function anosDeServico(dataAdmissao, dataRef = new Date()) {
  return Math.floor(mesesEntreatas(dataAdmissao, dataRef) / 12);
}

/**
 * Retorna competência atual no formato YYYY-MM.
 */
function competenciaAtual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Verifica se o servidor atingiu o interstício mínimo (em meses).
 */
function atingiuIntersticio(dataUltimaProgressao, intersticioMeses) {
  const meses = mesesEntreatas(dataUltimaProgressao);
  return meses >= intersticioMeses;
}

module.exports = { mesesEntreatas, anosDeServico, competenciaAtual, atingiuIntersticio };
