require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const config = require('./config');
const logger = require('./config/logger');
const errorHandler = require('./middlewares/errorHandler');
const { generalLimiter } = require('./middlewares/rateLimiter');

// Importa routers de cada módulo
const authRoutes          = require('./modules/auth/auth.routes');
const tenantRoutes        = require('./modules/tenants/tenants.routes');
const servidorRoutes      = require('./modules/servidores/servidores.routes');
const cargoRoutes         = require('./modules/cargos/cargos.routes');
const folhaRoutes         = require('./modules/folha/folha.routes');
const pontoRoutes         = require('./modules/ponto/ponto.routes');
const feriasRoutes        = require('./modules/ferias/ferias.routes');
const licencasRoutes      = require('./modules/licencas/licencas.routes');
const progressaoRoutes    = require('./modules/progressao/progressao.routes');
const concursoRoutes      = require('./modules/concurso/concurso.routes');
const aposentadoriaRoutes = require('./modules/aposentadoria/aposentadoria.routes');
const disciplinarRoutes   = require('./modules/disciplinar/disciplinar.routes');
const assinaturaRoutes    = require('./modules/assinatura/assinatura.routes');
const transparenciaRoutes = require('./modules/transparencia/transparencia.routes');
const notificacoesRoutes  = require('./modules/notificacoes/notificacoes.routes');
const dashboardRoutes     = require('./modules/dashboard/dashboard.routes');
const facialRoutes        = require('./modules/facial/facial.routes');
const escalaRoutes        = require('./modules/escalas/escala.routes');


const app = express();

// -------------------------------------------------------
// Segurança e infra
// -------------------------------------------------------
app.use(helmet());
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Rate limit geral em todas as rotas /api
app.use(config.apiPrefix, generalLimiter);

// -------------------------------------------------------
// Health check (sem autenticação)
// -------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// -------------------------------------------------------
// Rotas da API
// -------------------------------------------------------
const api = config.apiPrefix;

app.use(`${api}/auth`,          authRoutes);
app.use(`${api}/admin/tenants`, tenantRoutes);
app.use(`${api}/servidores`,    servidorRoutes);
app.use(`${api}/pccv`,          cargoRoutes);
app.use(`${api}/folha`,         folhaRoutes);
app.use(`${api}/ponto`,         pontoRoutes);
app.use(`${api}/ferias`,        feriasRoutes);
app.use(`${api}/licencas`,      licencasRoutes);
app.use(`${api}/progressao`,    progressaoRoutes);
app.use(`${api}/concursos`,     concursoRoutes);
app.use(`${api}/aposentadoria`, aposentadoriaRoutes);
app.use(`${api}/disciplinar`,   disciplinarRoutes);
app.use(`${api}/assinatura`,    assinaturaRoutes);
app.use(`${api}/notificacoes`,  notificacoesRoutes);
app.use(`${api}/dashboard`,     dashboardRoutes);
app.use(`${api}/facial`,         facialRoutes);
app.use(`${api}/escalas`,        escalaRoutes);

// Rota pública de transparência (sem JWT)
app.use(`${api}/public`,        transparenciaRoutes);

// -------------------------------------------------------
// 404 para rotas não mapeadas
// -------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Rota ${req.method} ${req.url} não encontrada.` },
  });
});

// -------------------------------------------------------
// Handler global de erros (SEMPRE por último)
// -------------------------------------------------------
app.use(errorHandler);

module.exports = app;
