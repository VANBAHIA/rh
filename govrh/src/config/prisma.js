const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query} | ${e.duration}ms`);
  });
}

prisma.$on('error', (e) => logger.error(`Prisma: ${e.message}`));

process.on('beforeExit', async () => prisma.$disconnect());

module.exports = prisma;
