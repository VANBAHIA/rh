// src/config/env.js
// Valida e exporta todas as variáveis de ambiente com defaults seguros
// Falha rápido (fail-fast) se variáveis críticas estiverem ausentes

require('dotenv').config();

const required = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Variável de ambiente obrigatória ausente: ${key}`);
  }
  return value;
};

const optional = (key, defaultValue) => process.env[key] ?? defaultValue;

const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '3000')),
  isProduction: optional('NODE_ENV', 'development') === 'production',
  isDevelopment: optional('NODE_ENV', 'development') === 'development',
  isTest: optional('NODE_ENV', 'development') === 'test',

  db: {
    url: required('DATABASE_URL'),
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpiresIn: optional('JWT_ACCESS_EXPIRES_IN', '1h'),
    refreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  security: {
    bcryptRounds: parseInt(optional('BCRYPT_ROUNDS', '12')),
    maxLoginAttempts: parseInt(optional('MAX_LOGIN_ATTEMPTS', '5')),
    lockoutDurationMinutes: parseInt(optional('LOCKOUT_DURATION_MINUTES', '30')),
    rateLimitWindowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000')),
    rateLimitMax: parseInt(optional('RATE_LIMIT_MAX_REQUESTS', '100')),
    rateLimitAuthMax: parseInt(optional('RATE_LIMIT_AUTH_MAX', '10')),
  },

  cors: {
    origins: optional('CORS_ORIGINS', 'http://localhost:3000').split(','),
  },

  upload: {
    dest: optional('UPLOAD_DEST', './uploads'),
    maxFileSizeMB: parseInt(optional('MAX_FILE_SIZE_MB', '10')),
    allowedTypes: optional('ALLOWED_FILE_TYPES', 'pdf,jpg,jpeg,png,docx,xlsx').split(','),
  },

  email: {
    host: optional('SMTP_HOST', ''),
    port: parseInt(optional('SMTP_PORT', '587')),
    secure: optional('SMTP_SECURE', 'false') === 'true',
    user: optional('SMTP_USER', ''),
    pass: optional('SMTP_PASS', ''),
    from: optional('EMAIL_FROM', 'GovHRPub <noreply@sistema.gov.br>'),
  },

  logs: {
    level: optional('LOG_LEVEL', 'info'),
    dir: optional('LOG_DIR', './logs'),
  },

  pagination: {
    defaultPageSize: parseInt(optional('DEFAULT_PAGE_SIZE', '20')),
    maxPageSize: parseInt(optional('MAX_PAGE_SIZE', '100')),
  },
};

module.exports = env;
