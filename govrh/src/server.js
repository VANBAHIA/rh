require('dotenv').config();
const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const prisma = require('./config/prisma');

async function bootstrap() {
  // Testa conexão com o banco antes de subir
  try {
    await prisma.$connect();
    logger.info('Banco de dados conectado.');
  } catch (err) {
    logger.error('Falha ao conectar ao banco de dados:', err.message);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    logger.info(`GovHRPub API rodando em http://localhost:${config.port}${config.apiPrefix}`);
    logger.info(`Ambiente: ${config.env}`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`Sinal ${signal} recebido. Encerrando servidor...`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Servidor encerrado.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // Erros não tratados — loga e encerra
  process.on('uncaughtException', (err) => {
    logger.error('uncaughtException:', err);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('unhandledRejection:', reason);
    process.exit(1);
  });
}

bootstrap();
