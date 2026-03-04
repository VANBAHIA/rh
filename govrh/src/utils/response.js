// src/utils/response.js
// Helpers para respostas padronizadas da API

const success = (res, data, statusCode = 200, meta = null) => {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
};

const created = (res, data) => success(res, data, 201);

const paginated = (res, data, { page, pageSize, total }) => {
  return success(res, data, 200, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    hasNext: page * pageSize < total,
    hasPrev: page > 1,
  });
};

const noContent = (res) => res.status(204).send();

module.exports = { success, created, paginated, noContent };
