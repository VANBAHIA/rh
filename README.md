# GovHRPub API

> Sistema de Gestão de Recursos Humanos para o Serviço Público Municipal

[![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=node.js)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express)](https://expressjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://prisma.io)
[![MySQL](https://img.shields.io/badge/MySQL-9.6-4479A1?logo=mysql)](https://mysql.com)

---

## Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Banco de Dados](#banco-de-dados)
- [Autenticação](#autenticação)
- [Módulos e Endpoints](#módulos-e-endpoints)
- [Regras de Negócio](#regras-de-negócio)
- [Arquitetura](#arquitetura)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Variáveis de Ambiente](#variáveis-de-ambiente)

---

## Visão Geral

O **GovHRPub** é uma API REST **multi-tenant** desenvolvida para gerenciar os recursos humanos de prefeituras e órgãos públicos municipais. O sistema implementa as regras do PCCV (Plano de Cargos, Carreiras e Vencimentos) com suporte completo ao magistério municipal, conforme legislação vigente (EC 103/2019).

### Características principais

- **Multi-tenant** — isolamento completo de dados por órgão (CNPJ)
- **RBAC** — controle de acesso baseado em roles e permissões granulares
- **Auditoria completa** — todos os eventos gravados automaticamente
- **Magistério** — progressão horizontal/vertical conforme PCCV
- **Folha de pagamento** — cálculo automático de IRRF, INSS/RPPS, consignados
- **LAI** — portal de transparência pública sem autenticação
- **MFA** — autenticação multifator via TOTP (Google Authenticator)

---

## Funcionalidades

| Módulo | Descrição |
|---|---|
| 🔐 Autenticação | JWT + refresh token + MFA TOTP + bloqueio por tentativas |
| 🏛️ Tenants | Gestão de órgãos, usuários, roles e permissões |
| 👤 Servidores | Cadastro completo + histórico funcional + documentos |
| 📋 Cargos / PCCV | Grupos ocupacionais, tabelas salariais, matriz Nível × Classe |
| 💰 Folha | Processamento, IRRF/INSS/RPPS, consignados, holerite |
| ⏱️ Ponto | Escalas, espelho mensal, banco de horas, importação REP-P |
| 🏖️ Férias | Períodos aquisitivos, agendamento, workflow de aprovação |
| 📄 Licenças | 11 tipos, workflow, prorrogação, impacto na situação funcional |
| 📈 Progressão | Horizontal (antiguidade/mérito), vertical (titulação), enquadramento |
| 🎓 Concurso | Candidatos, convocação, posse, estágio probatório |
| 🏥 Aposentadoria | Simulador EC 103/2019, pensão por morte |
| ⚖️ Disciplinar | PAD, sindicância, penalidades com impacto funcional |
| ✍️ Assinatura | Fluxo multi-signatário com hash SHA-256 |
| 🔔 Notificações | Sistema de alertas por usuário |
| 🌐 Transparência | Portal público LAI sem autenticação |

---

## Pré-requisitos

- **Node.js** >= 18
- **MySQL** >= 8.0
- **npm** >= 9

---

## Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-org/govrh-api.git
cd govrh-api

# Instale as dependências
npm install

# Copie o arquivo de exemplo e configure
cp .env.example .env
```

---

## Configuração

Edite o arquivo `.env` com suas configurações:

```dotenv
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1

# Banco de Dados
DATABASE_URL="mysql://usuario:senha@localhost:3306/govrh_db"
SHADOW_DATABASE_URL="mysql://usuario:senha@localhost:3306/govrh_shadow"

# JWT
JWT_SECRET=seu_secret_aqui
JWT_EXPIRES_IN=8h
JWT_REFRESH_SECRET=seu_refresh_secret_aqui
JWT_REFRESH_EXPIRES_IN=7d

# Segurança
BCRYPT_ROUNDS=12
CORS_ORIGINS=http://localhost:5173

# Upload
UPLOAD_MAX_SIZE_MB=10
UPLOAD_DEST=./uploads
```

> ⚠️ **Nunca commite o arquivo `.env` com dados reais em repositórios públicos.**

---

## Banco de Dados

### Criação do banco e usuário (MySQL)

```sql
CREATE DATABASE govrh_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE govrh_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'govrh_user'@'localhost' IDENTIFIED BY 'sua_senha';
GRANT ALL PRIVILEGES ON govrh_db.* TO 'govrh_user'@'localhost';
GRANT ALL PRIVILEGES ON govrh_shadow.* TO 'govrh_user'@'localhost';
FLUSH PRIVILEGES;
```

> **Atenção:** o banco `govrh_shadow` é necessário para o Prisma Migrate funcionar quando o usuário não tem permissão `CREATE DATABASE`.

### Aplicar migrations

```bash
npx prisma migrate dev --name init
```

### Gerar Prisma Client

```bash
npx prisma generate
```

### Popular com dados iniciais

```bash
npm run db:seed
```

O seed cria:
- 35 permissões do sistema
- 7 roles padrão (ADMIN_ORGAO, GESTOR_RH, GESTOR_PONTO, CHEFE_SETOR, SERVIDOR, AUDITOR, SUPER_ADMIN)
- 1 tenant de demonstração
- 2 usuários iniciais
- Estrutura PCCV completa com 13 níveis salariais
- 1 servidor de exemplo

**Credenciais iniciais após o seed:**

| Perfil | E-mail | Senha |
|---|---|---|
| Super Admin | admin@govrh.gov.br | Admin@2026! |
| Admin RH | rh@exemplo.gov.br | Rh@2026Pme |

> ⚠️ **Troque as senhas imediatamente após o primeiro login!**

---

## Autenticação

A API usa **JWT** com dois tokens:

| Token | Duração | Uso |
|---|---|---|
| `accessToken` | 8 horas | Bearer header em todas as requisições |
| `refreshToken` | 7 dias | Renovar o accessToken sem novo login |

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "rh@exemplo.gov.br",
  "senha": "Rh@2026Pme",
  "tenantCnpj": "00.000.000/0001-00"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "usuario": { "id": "...", "nome": "...", "email": "..." }
  }
}
```

### Uso do token

```http
GET /api/v1/servidores
Authorization: Bearer eyJhbGci...
```

### Renovar token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{ "refreshToken": "eyJhbGci..." }
```

---

## Módulos e Endpoints

### Base URL: `http://localhost:3000/api/v1`

---

### 🔐 Auth

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/auth/login` | Login com e-mail, senha e CNPJ do órgão |
| POST | `/auth/refresh` | Renovar access token |
| GET | `/auth/me` | Dados do usuário autenticado |
| POST | `/auth/logout` | Invalidar refresh token |
| POST | `/auth/mfa/ativar` | Ativar autenticação de dois fatores |
| POST | `/auth/mfa/verificar` | Verificar código TOTP |
| POST | `/auth/senha/solicitar-reset` | Solicitar reset de senha |
| POST | `/auth/senha/resetar` | Definir nova senha via token |

---

### 👤 Servidores

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/servidores` | Listar (filtros: nome, CPF, cargo, lotação, situação) |
| POST | `/servidores` | Cadastrar servidor |
| GET | `/servidores/:id` | Buscar por ID |
| PUT | `/servidores/:id` | Atualizar dados |
| GET | `/servidores/:id/historico` | Histórico funcional |
| GET | `/servidores/:id/documentos` | Documentos do servidor |
| GET | `/servidores/:id/extrato` | Extrato completo (cargo, salário, progressões) |

---

### 📋 Cargos / PCCV

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/cargos/grupos` | Grupos ocupacionais |
| POST | `/cargos/grupos` | Criar grupo |
| GET | `/cargos` | Listar cargos |
| POST | `/cargos` | Criar cargo |
| GET | `/cargos/:id/servidores` | Servidores do cargo |
| GET | `/cargos/tabelas` | Tabelas salariais (PCCV) |
| POST | `/cargos/tabelas` | Criar tabela salarial |
| GET | `/cargos/tabelas/:id/matriz` | **Matriz visual Nível × Classe** |
| POST | `/cargos/tabelas/:id/niveis` | Adicionar nível/classe na matriz |
| GET | `/cargos/lotacoes` | Lotações (hierarquia) |
| POST | `/cargos/lotacoes` | Criar secretaria/departamento |

---

### 💰 Folha de Pagamento

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/folha/verbas` | Rubricas cadastradas |
| POST | `/folha/verbas` | Criar verba/rubrica |
| GET | `/folha/config` | Configuração (RPPS, IRRF, INSS, margem) |
| PUT | `/folha/config` | Atualizar configuração |
| GET | `/folha/consignados/:servidorId` | Consignados do servidor |
| POST | `/folha/consignados` | Incluir consignado |
| POST | `/folha/processar` | **Processar folha de pagamento** |
| GET | `/folha/:competencia/:tipo` | Buscar folha (ex: `2026-01/MENSAL`) |
| GET | `/folha/:competencia/:tipo/itens` | Itens da folha paginados |
| POST | `/folha/:competencia/:tipo/fechar` | Fechar folha |
| GET | `/folha/holerite/:servidorId/:competencia` | **Holerite individual** |

**Tipos de folha:** `MENSAL`, `DECIMO_TERCEIRO_PRIMEIRA`, `DECIMO_TERCEIRO_SEGUNDA`, `FERIAS`, `RESCISAO`

---

### ⏱️ Ponto e Frequência

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/ponto/escalas` | Escalas de trabalho |
| POST | `/ponto/escalas` | Criar escala |
| POST | `/ponto/escalas/:id/vincular` | Vincular servidor à escala |
| GET | `/ponto/espelho/:servidorId/:mes` | Espelho de ponto (ex: `2026-01`) |
| POST | `/ponto/lancamento` | Lançar registro de ponto |
| POST | `/ponto/importar` | Importar registros em lote (REP-P) |
| PUT | `/ponto/:id/abono` | Abonar registro |
| GET | `/ponto/banco-horas/:servidorId` | Saldo do banco de horas |
| POST | `/ponto/banco-horas/:servidorId/compensar` | Compensar horas |
| GET | `/ponto/pendencias` | Pontos abertos (sem saída marcada) |

---

### 🏖️ Férias

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/ferias/periodos/:servidorId` | Períodos aquisitivos e saldo |
| POST | `/ferias/agendar` | Agendar férias |
| PUT | `/ferias/:id/aprovar` | Aprovar (debita saldo) |
| PUT | `/ferias/:id/cancelar` | Cancelar (estorna saldo se aprovado) |
| GET | `/ferias/vencendo` | Férias vencendo nos próximos N dias |
| GET | `/ferias/programacao/:mes` | Programação do mês (ex: `2026-07`) |

---

### 📄 Licenças

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/licencas` | Listar todas as licenças |
| GET | `/licencas/:servidorId` | Licenças por servidor |
| POST | `/licencas` | Solicitar licença |
| PUT | `/licencas/:id/aprovar` | Aprovar (altera situação funcional) |
| PUT | `/licencas/:id/encerrar` | Encerrar (restaura situação ATIVO) |
| PUT | `/licencas/:id/prorrogar` | Prorrogar licença |
| GET | `/licencas/vencendo` | Licenças vencendo em N dias |

---

### 📈 Progressão Funcional

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/progressao/aptos` | Servidores com interstício atingido |
| GET | `/progressao/simulacao/:servidorId` | Simulação completa (horizontal + vertical) |
| GET | `/progressao/:servidorId` | Histórico de progressões |
| POST | `/progressao/horizontal` | Progressão por antiguidade/mérito/capacitação |
| POST | `/progressao/vertical/titulacao` | Mudança de nível por novo diploma |
| POST | `/progressao/enquadramento` | Enquadramento inicial ou por tempo de serviço |
| PUT | `/progressao/:id/aprovar` | Aprovar (atualiza nível/classe do servidor) |
| PUT | `/progressao/:id/rejeitar` | Rejeitar com motivo |
| POST | `/progressao/processar-lote` | Processar todos os aptos de uma vez |

---

### 🎓 Concurso Público

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/concursos` | Listar concursos |
| POST | `/concursos` | Criar concurso |
| GET | `/concursos/:id/candidatos` | Lista de candidatos classificados |
| POST | `/concursos/:id/candidatos` | Importar candidatos em lote |
| POST | `/concursos/:id/convocacao` | Convocar candidatos |
| POST | `/concursos/:id/posse` | **Registrar posse** (cria servidor automaticamente) |
| GET | `/concursos/estagio/em-andamento` | Estágios probatórios ativos |
| POST | `/concursos/estagio/:servidorId/avaliacao` | Registrar avaliação periódica |
| PUT | `/concursos/estagio/:servidorId/concluir` | Concluir estágio (aprovado/reprovado) |

---

### 🏥 Aposentadoria

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/aposentadoria/simulador/:servidorId` | **Simulador EC 103/2019** |
| POST | `/aposentadoria/pedido` | Registrar pedido de aposentadoria |
| PUT | `/aposentadoria/:id/conceder` | Conceder (altera situação para APOSENTADO) |
| GET | `/aposentadoria/pensionistas` | Pensionistas ativos |
| POST | `/aposentadoria/pensao` | Registrar pensão por morte |
| PUT | `/aposentadoria/pensao/:id/cessar` | Cessar pensão |

---

### ⚖️ Processo Disciplinar

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/disciplinar` | Listar processos (PAD e sindicâncias) |
| POST | `/disciplinar` | Instaurar processo (gera nº automático) |
| GET | `/disciplinar/:id` | Buscar com documentos |
| POST | `/disciplinar/:id/documentos` | Anexar documento ao processo |
| PUT | `/disciplinar/:id/penalidade` | Aplicar penalidade |
| PUT | `/disciplinar/:id/arquivar` | Arquivar processo |

---

### 🌐 Transparência Pública (sem autenticação)

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/transparencia/remuneracao` | Remunerações (LAI) |
| GET | `/transparencia/quadro-pessoal` | Quadro de pessoal por regime/lotação |
| GET | `/transparencia/exportar` | Exportar em JSON ou CSV |

---

## Regras de Negócio

### Magistério — Estrutura da Carreira

A carreira do magistério é **bidimensional**: **Nível** (pessoal, por titulação) × **Classe** (progressão por antiguidade).

| Nível | Escolaridade exigida | Classes disponíveis |
|---|---|---|
| I | Médio Normal | A, B, C |
| II | Licenciatura Plena | A, B, C, D, E |
| III | Pós-Graduação Lato Sensu (360h) | A, B, C, D, E |
| IV | Mestrado | A, B, C, D, E |
| V | Doutorado | A, B, C, D, E |

**Progressão Horizontal (Classe):**
- Interstício mínimo: 24 meses na classe atual
- Tipos: `HORIZONTAL_ANTIGUIDADE`, `HORIZONTAL_MERITO`, `HORIZONTAL_CAPACITACAO`

**Progressão Vertical (Nível — Art. 31 §5º):**
- Servidor apresenta novo diploma/certificado
- Mudança de nível é aprovada, mas **vigora apenas no exercício seguinte**
- O nível é pessoal e não se altera com progressão horizontal

**Enquadramento Especial (Art. 32 §1º):**
- Servidor com 20+ anos no magistério é enquadrado na **Classe C** diretamente

### Folha de Pagamento

| Desconto | Regime | Cálculo |
|---|---|---|
| RPPS | Estatutário | Alíquota configurável por tenant (padrão 14%) |
| INSS | CLT / Temporário | Tabela progressiva por faixas (2024) |
| IRRF | Todos | Tabela progressiva com deduções por dependente (R$ 189,59/dep.) |
| Consignado | Todos | Validação de margem consignável (padrão 35%) |

### Aposentadoria (EC 103/2019)

| Modalidade | Requisitos |
|---|---|
| Voluntária (Estatutário) | 62 anos + 35 anos de contribuição |
| Especial Professor | 57 anos + 30 anos em sala de aula |
| Compulsória | 75 anos (todos os regimes) |

---

## Arquitetura

```
src/
├── app.js              # Express + middlewares globais
├── server.js           # Bootstrap + graceful shutdown
├── config/
│   ├── index.js        # Configuração centralizada via .env
│   ├── logger.js       # Winston + rotação de logs
│   └── prisma.js       # PrismaClient singleton
├── middlewares/
│   ├── authenticate.js # JWT decode + inject tenantId + RBAC authorize()
│   ├── errorHandler.js # Handler global + erros Prisma P2002/P2025
│   ├── rateLimiter.js  # 100 req/15min geral, 10 req/15min auth
│   └── auditLogger.js  # Intercepta responses → grava audit_logs
├── shared/
│   ├── errors/
│   │   └── AppError.js # Classe base + 25+ erros pré-definidos
│   └── utils/
│       ├── response.js     # ok(), created(), paginate(), noContent()
│       ├── pagination.js   # parsePagination(query)
│       ├── matricula.js    # gerarMatricula(tenantId)
│       └── date.js         # mesesEntreDatas(), anosDeServico()
└── modules/
    └── [modulo]/
        ├── [modulo].routes.js      # Definição de rotas e middlewares
        ├── [modulo].controller.js  # Parse req/res, chama service
        └── [modulo].service.js     # Regras de negócio + Prisma queries
```

### Padrão de resposta

```json
{
  "success": true,
  "data": { ... }
}
```

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Padrão de erro

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Servidor não encontrado."
  }
}
```

---

## Scripts Disponíveis

```bash
# Iniciar em desenvolvimento (nodemon)
npm run dev

# Iniciar em produção
npm start

# Migrations
npx prisma migrate dev --name nome_da_migration

# Regenerar Prisma Client
npx prisma generate

# Seed inicial
npm run db:seed

# Visualizar banco (Prisma Studio)
npx prisma studio

# Verificar schema
npx prisma validate
```

---

## Variáveis de Ambiente

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `NODE_ENV` | Sim | `development` | Ambiente de execução |
| `PORT` | Não | `3000` | Porta da API |
| `API_PREFIX` | Não | `/api/v1` | Prefixo das rotas |
| `DATABASE_URL` | Sim | — | String de conexão MySQL |
| `SHADOW_DATABASE_URL` | Sim | — | Banco shadow para Prisma Migrate |
| `JWT_SECRET` | Sim | — | Chave secreta do access token |
| `JWT_EXPIRES_IN` | Não | `8h` | Expiração do access token |
| `JWT_REFRESH_SECRET` | Sim | — | Chave secreta do refresh token |
| `JWT_REFRESH_EXPIRES_IN` | Não | `7d` | Expiração do refresh token |
| `BCRYPT_ROUNDS` | Não | `12` | Rounds do hash de senha |
| `CORS_ORIGINS` | Não | `*` | Origins permitidas (separadas por vírgula) |
| `RATE_LIMIT_WINDOW_MS` | Não | `900000` | Janela do rate limit (ms) |
| `RATE_LIMIT_MAX` | Não | `100` | Máx. requisições por janela |
| `RATE_LIMIT_AUTH_MAX` | Não | `10` | Máx. tentativas de login por janela |
| `UPLOAD_MAX_SIZE_MB` | Não | `10` | Tamanho máximo de upload |
| `UPLOAD_DEST` | Não | `./uploads` | Diretório de uploads |
| `LOG_LEVEL` | Não | `info` | Nível de log (error/warn/info/debug) |
| `LOG_DIR` | Não | `./logs` | Diretório dos logs |

---

## Licença

Este projeto é de uso interno. Todos os direitos reservados.
