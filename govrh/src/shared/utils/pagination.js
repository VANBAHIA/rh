/**
 * Extrai e valida parâmetros de paginação da query string.
 * Uso: const { skip, take, page, limit } = parsePagination(req.query);
 */
function parsePagination(query, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;
  return { skip, take: limit, page, limit };
}

module.exports = { parsePagination };
