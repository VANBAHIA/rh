// src/utils/pagination.js
const env = require('../config/env');

const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const pageSize = Math.min(
    env.pagination.maxPageSize,
    Math.max(1, parseInt(query.pageSize) || env.pagination.defaultPageSize)
  );
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
};

module.exports = { getPagination };
