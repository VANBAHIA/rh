/**
 * Helpers para padronizar respostas da API.
 * Envelope: { success, data, meta?, message? }
 */

const ok = (res, data, meta = null) => {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(200).json(body);
};

const created = (res, data) =>
  res.status(201).json({ success: true, data });

const noContent = (res) =>
  res.status(204).send();

const paginate = (res, data, total, page, limit) =>
  res.status(200).json({
    success: true,
    data,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit),
    },
  });

module.exports = { ok, created, noContent, paginate };
