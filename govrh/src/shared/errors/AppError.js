class AppError extends Error {
  constructor(message, statusCode = 400, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const Errors = {
  UNAUTHORIZED:           () => new AppError('Não autenticado.', 401, 'UNAUTHORIZED'),
  FORBIDDEN:              () => new AppError('Sem permissão.', 403, 'FORBIDDEN'),
  INVALID_CREDENTIALS:    () => new AppError('E-mail ou senha inválidos.', 401, 'INVALID_CREDENTIALS'),
  ACCOUNT_LOCKED:         (until) => new AppError(`Conta bloqueada até ${until}.`, 423, 'ACCOUNT_LOCKED'),
  TOKEN_EXPIRED:          () => new AppError('Token expirado.', 401, 'TOKEN_EXPIRED'),
  TOKEN_INVALID:          () => new AppError('Token inválido.', 401, 'TOKEN_INVALID'),
  MFA_REQUIRED:           () => new AppError('MFA necessário.', 403, 'MFA_REQUIRED'),
  MFA_INVALID:            () => new AppError('Código MFA inválido.', 401, 'MFA_INVALID'),
  NOT_FOUND:              (r) => new AppError(`${r} não encontrado(a).`, 404, 'NOT_FOUND'),
  ALREADY_EXISTS:         (r) => new AppError(`${r} já existe.`, 409, 'ALREADY_EXISTS'),
  VALIDATION:             (m) => new AppError(m, 422, 'VALIDATION_ERROR'),
  TENANT_NOT_FOUND:       () => new AppError('Órgão não encontrado.', 404, 'TENANT_NOT_FOUND'),
  TENANT_INACTIVE:        () => new AppError('Órgão inativo.', 403, 'TENANT_INACTIVE'),
  TENANT_LIMIT:           () => new AppError('Limite de servidores atingido.', 402, 'TENANT_LIMIT'),
  SERVIDOR_INATIVO:       () => new AppError('Servidor inativo ou exonerado.', 409, 'SERVIDOR_INATIVO'),
  FOLHA_FECHADA:          () => new AppError('Folha já fechada.', 409, 'FOLHA_FECHADA'),
  FERIAS_INSUFICIENTE:    () => new AppError('Saldo de férias insuficiente.', 409, 'FERIAS_INSUFICIENTE'),
  PROGRESSAO_INTERSTICIO: () => new AppError('Interstício mínimo não atingido.', 409, 'PROGRESSAO_INTERSTICIO'),
  MARGEM_CONSIGNAVEL:     () => new AppError('Margem consignável insuficiente.', 409, 'MARGEM_CONSIGNAVEL'),
};

module.exports = { AppError, Errors };
