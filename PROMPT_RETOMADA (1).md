# PROMPT DE RETOMADA — GovHRPub

Cole este prompt no início de uma nova conversa com Claude para retomar o projeto exatamente de onde parou.

---

## PROMPT

Estou desenvolvendo um sistema de RH para prefeituras municipais chamado **GovHRPub**. Preciso que você continue o desenvolvimento de onde paramos. Vou descrever tudo abaixo.

---

### CONTEXTO DO PROJETO

**GovHRPub** é uma API REST multi-tenant para gestão de recursos humanos do serviço público municipal, com foco no magistério. O sistema segue a legislação municipal de PCCV com regras baseadas na EC 103/2019 e progressão funcional.

---

### STACK TÉCNICA

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 24 |
| Framework | Express 4 |
| ORM | Prisma 5.22 |
| Banco | MySQL 9.6 |
| Auth | JWT (access 8h + refresh 7d) + MFA TOTP |
| Segurança | bcrypt (rounds=12), helmet, CORS, rate limiting |
| Logs | Winston + DailyRotateFile |
| Ambiente | Windows 11, PowerShell, nodemon |

---

### LOCALIZAÇÃO DO PROJETO

```
D:\PROJETOS\RH\govrh\          ← API (backend)
D:\PROJETOS\RH\govrh-web\      ← Frontend (em desenvolvimento)
```

**Estrutura do backend:**
```
govrh/
├── prisma/
│   ├── schema.prisma   ← 48 models, 29 enums
│   ├── seed.js
│   └── migrations/
└── src/
    ├── app.js
    ├── server.js
    ├── config/         ← index.js, logger.js, prisma.js
    ├── middlewares/    ← authenticate.js, errorHandler.js, auditLogger.js, rateLimiter.js
    ├── shared/
    │   ├── errors/AppError.js
    │   └── utils/     ← response.js, pagination.js, matricula.js, date.js
    └── modules/
        ├── auth/           ✅ completo
        ├── tenants/        ✅ completo (rotas corrigidas)
        ├── servidores/     ✅ completo + atualizado (VinculoFuncional)
        ├── cargos/         ✅ completo (registrado como /pccv no app.js)
        ├── folha/          ✅ completo
        ├── ponto/          ✅ completo
        ├── ferias/         ✅ completo
        ├── licencas/       ✅ completo (rotas corrigidas)
        ├── progressao/     ✅ completo
        ├── concurso/       ✅ completo (rotas corrigidas)
        ├── aposentadoria/  ✅ completo (rotas corrigidas)
        ├── disciplinar/    ✅ completo
        ├── assinatura/     ✅ completo
        ├── notificacoes/   ✅ completo (rotas corrigidas)
        └── transparencia/  ✅ completo (registrado como /public no app.js)
```

---

### BANCO DE DADOS

```
DATABASE_URL="mysql://govrh_user:Xj3xxyr4@localhost:3306/govrh_db"
SHADOW_DATABASE_URL="mysql://govrh_user:Xj3xxyr4@localhost:3306/govrh_shadow"
JWT_SECRET=8f3a1e7c2a0f9d6b4c5e1f7a9c2d4e8b6f1a0d9c7e5b3a2f4e8c6d9b1a7f0e
JWT_EXPIRES_IN=8h
JWT_REFRESH_SECRET=1c9e8f4a7d3b2e5a0c6f9d8b1e7a4f2c9b0a5d6e3f8a1b4c7e9d2f5a0b6
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
PORT=3000
API_PREFIX=/api/v1
NODE_ENV=development
```

**Configuração crítica no schema.prisma:**
```prisma
datasource db {
  provider          = "mysql"
  url               = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```

---

### DADOS DO SEED (já no banco)

| Item | Valor |
|---|---|
| Tenant | Prefeitura Municipal de Exemplo |
| CNPJ | 00.000.000/0001-00 |
| Super Admin | admin@govrh.gov.br / Admin@2026! |
| Admin RH | rh@exemplo.gov.br / Rh@2026Pme |
| Servidor demo | Maria da Silva Santos — matrícula 2024000001 |
| Tabela PCCV | PCCV 2024 (13 níveis) |
| Cargos | Professor EB I (PROF-01), Agente Administrativo (AGADM-01) |
| Lotações | SEMED → Departamento de Pessoal |

---

### SCHEMA — MODELOS PRINCIPAIS (48 models, 29 enums)

#### Servidor (dados pessoais apenas)
Campos funcionais foram **removidos** do Servidor e movidos para `VinculoFuncional`.
Campos de contato/endereço foram movidos para `ContatoServidor` / `EnderecoServidor`.

**Campos que EXISTEM no Servidor:**
`id, tenantId, matricula, nome, nomeSocial, cpf, rg, rgOrgaoEmissor, rgUf, rgDataEmissao, dataNascimento, naturalidade, nacionalidade, sexo, estadoCivil, corRaca, pne, tipoPne, fotoUrl, numeroCtps, serieCtps, ufCtps, pisPasep, tituloEleitor, matriculaRpps, matriculaInss, inicioMandato, fimMandato, cargo_mandato, createdAt, updatedAt`

**Campos que NÃO EXISTEM mais no Servidor (foram para VinculoFuncional):**
`cargoId, lotacaoId, nivelSalarialId, tabelaSalarialId, regimeJuridico, situacaoFuncional, cargaHorariaSemanal, turno, nivelTitulacao, titulacaoComprovada, dataTitulacao, dataAdmissao, dataPosse, dataExercicio, dataExoneracao, motivoExoneracao, emailPessoal, emailInstitucional, telefonePessoal, celular, cep, logradouro, numero, complemento, bairro, municipio, uf`

#### VinculoFuncional (histórico funcional completo)
```
id, servidorId, tenantId
regimeJuridico, situacaoFuncional
cargoId, tabelaSalarialId, nivelSalarialId, lotacaoId
cargaHoraria, turno
nivelTitulacao, titulacaoComprovada, urlComprovante
dataAdmissao, dataPosse, dataExercicio
dataTermino (previsto — temporários)
dataEncerramento (real — exoneração, aposentadoria)
motivoEncerramento
atual (Boolean) ← TRUE = vínculo vigente
tipoAlteracao (enum TipoAlteracaoVinculo)
portaria, lei, observacao, registradoPor
createdAt, updatedAt
```

**TipoAlteracaoVinculo:** ADMISSAO, REINTEGRACAO, POSSE, EXERCICIO, PROGRESSAO_HORIZONTAL, PROGRESSAO_VERTICAL, ENQUADRAMENTO, TRANSFERENCIA_LOTACAO, MUDANCA_REGIME, MUDANCA_JORNADA, MUDANCA_CARGO, AFASTAMENTO, RETORNO_AFASTAMENTO, SUSPENSAO, CESSAO, APOSENTADORIA, EXONERACAO, FALECIMENTO, RESCISAO

**Regra do reingresso:** servidor temporário demitido que volta como estatutário terá 2 registros VinculoFuncional independentes — cada um com suas datas de admissão/posse/exercício próprias.

#### ContatoServidor
```
id, servidorId
tipo (TipoContato: EMAIL_PESSOAL, EMAIL_INSTITUCIONAL, CELULAR, TELEFONE_FIXO, WHATSAPP)
valor, principal (Boolean), ativo (Boolean)
createdAt, updatedAt
```
Regra: somente um contato pode ter `principal=true` por servidor. O service garante automaticamente.

#### EnderecoServidor
```
id, servidorId
cep, logradouro, numero, complemento, bairro, municipio, uf
principal (Boolean), ativo (Boolean)
createdAt, updatedAt
```
Mesma regra de `principal`.

#### HistoricoFuncional
**REMOVIDO** — substituído integralmente por `VinculoFuncional`.

---

### REGRAS DE NEGÓCIO IMPLEMENTADAS

**Magistério (PCCV municipal):**
- Carreira bidimensional: **Nível** (I-V por titulação) × **Classe** (A-E por antiguidade)
- Nível I: Médio Normal | II: Licenciatura | III: Pós Lato (360h) | IV: Mestrado | V: Doutorado
- Progressão horizontal: interstício de 24 meses entre classes
- Progressão vertical: vigora no exercício SEGUINTE (Art. 31 §5º)
- Enquadramento especial: 20+ anos → Classe C direto (Art. 32 §1º)
- Nível I: classes A-C apenas | Níveis II-V: classes A-E

**Folha:** RPPS 14%, INSS/IRRF progressivos 2024, margem consignável 35%

**Aposentadoria EC 103/2019:** Voluntária 62+35 | Especial professor 57+30 | Compulsória 75

---

### API — MAPEAMENTO COMPLETO DE ENDPOINTS

> ⚠️ **Prefixos reais do `app.js`:**
> - `cargos/` → **`/pccv`**
> - `transparencia/` → **`/public`**
> - `tenants/` → **`/admin/tenants`**

**Base URL:** `http://localhost:3000/api/v1`

#### 🔐 Auth → `/auth`
```
POST  /auth/login
POST  /auth/refresh
POST  /auth/logout
GET   /auth/me
PUT   /auth/change-password
POST  /auth/forgot-password
POST  /auth/reset-password
POST  /auth/mfa/enable
POST  /auth/mfa/verify
POST  /auth/mfa/disable
```

#### 🏛️ Tenants → `/admin/tenants`
```
GET    /admin/tenants
POST   /admin/tenants
GET    /admin/tenants/roles                     ← ANTES de /:id
POST   /admin/tenants/roles
POST   /admin/tenants/permissions
GET    /admin/tenants/:id
PUT    /admin/tenants/:id
PATCH  /admin/tenants/:id/status
GET    /admin/tenants/:id/usuarios
POST   /admin/tenants/:id/usuarios
PUT    /admin/tenants/:id/usuarios/:uid
PATCH  /admin/tenants/:id/usuarios/:uid/roles
```

#### 👤 Servidores → `/servidores`
```
GET    /servidores                          Listar (filtros: q, situacao, regime, lotacaoId, cargoId)
POST   /servidores                          Criar (body: dados pessoais + vinculo{} + contatos[] + enderecos[])
GET    /servidores/exportar                 Exportar XLSX
GET    /servidores/:id                      Buscar (retorna vinculos[], contatos[], enderecos[])
PUT    /servidores/:id                      Atualizar dados pessoais
DELETE /servidores/:id                      Desativar (encerra vínculo atual)

GET    /servidores/:id/historico            Histórico completo de vínculos
POST   /servidores/:id/vinculos             Criar novo vínculo (reingresso, reintegração)
PATCH  /servidores/:id/vinculos/atual       Atualizar vínculo atual (gera novo registro + desativa anterior)

GET    /servidores/:id/contatos             Listar contatos
POST   /servidores/:id/contatos             Adicionar contato
PUT    /servidores/:id/contatos/:contatoId  Atualizar contato
DELETE /servidores/:id/contatos/:contatoId  Desativar contato

GET    /servidores/:id/enderecos            Listar endereços
POST   /servidores/:id/enderecos            Adicionar endereço
PUT    /servidores/:id/enderecos/:enderecoId  Atualizar endereço
DELETE /servidores/:id/enderecos/:enderecoId  Desativar endereço

GET    /servidores/:id/documentos           Listar documentos
POST   /servidores/:id/documentos           Anexar documento
GET    /servidores/:id/progressoes          Progressões do servidor
GET    /servidores/:id/extrato              Extrato completo
```

#### 📋 Cargos / PCCV → `/pccv`
```
GET/POST     /pccv/grupos
PUT/DELETE   /pccv/grupos/:id
GET          /pccv/tabelas
POST         /pccv/tabelas
GET/PUT      /pccv/tabelas/:id
GET          /pccv/tabelas/:id/matriz
GET/POST     /pccv/tabelas/:tabelaId/niveis
PUT/DELETE   /pccv/tabelas/:tabelaId/niveis/:id
GET/POST     /pccv/lotacoes
PUT/DELETE   /pccv/lotacoes/:id
GET/POST     /pccv
GET/PUT/DELETE /pccv/:id
GET          /pccv/:id/servidores
```

#### 💰 Folha → `/folha`
```
GET/POST     /folha/verbas
PUT          /folha/verbas/:id
GET/PUT      /folha/config
GET          /folha/consignados/:servidorId
POST         /folha/consignados
PUT/DELETE   /folha/consignados/:id
GET          /folha
POST         /folha/processar
GET          /folha/:competencia/:tipo
GET          /folha/:competencia/:tipo/itens
POST         /folha/:competencia/:tipo/fechar
POST         /folha/:competencia/:tipo/reabrir
GET          /folha/holerite/:servidorId/:competencia
```

#### ⏱️ Ponto → `/ponto`
```
GET/POST     /ponto/escalas
PUT          /ponto/escalas/:id
POST         /ponto/escalas/:id/vincular
GET          /ponto/espelho/:servidorId/:mes
POST         /ponto/lancamento
POST         /ponto/importar
PUT          /ponto/:id/abono
PUT          /ponto/:id/ocorrencia
GET          /ponto/banco-horas/:servidorId
POST         /ponto/banco-horas/:servidorId/compensar
GET          /ponto/resumo-mensal/:mes
GET          /ponto/pendencias
```

#### 🏖️ Férias → `/ferias`
```
GET/POST     /ferias/periodos/:servidorId
POST         /ferias/agendar
GET          /ferias/vencendo
GET          /ferias/programacao/:mes
GET          /ferias/:id
PUT          /ferias/:id/aprovar
PUT          /ferias/:id/cancelar
```

#### 📄 Licenças → `/licencas`
```
GET/POST     /licencas
GET          /licencas/vencendo             ← ANTES de /:servidorId
GET          /licencas/detalhe/:id          ← ANTES de /:servidorId
GET          /licencas/:servidorId
PUT          /licencas/:id
PUT          /licencas/:id/aprovar
PUT          /licencas/:id/encerrar
PUT          /licencas/:id/prorrogar
```

#### 📈 Progressão → `/progressao`
```
GET          /progressao/aptos
GET          /progressao/simulacao/:servidorId
POST         /progressao/horizontal
POST         /progressao/vertical/titulacao
POST         /progressao/enquadramento
POST         /progressao/processar-lote
GET          /progressao/:servidorId
PUT          /progressao/:id/aprovar
PUT          /progressao/:id/rejeitar
```

#### 🎓 Concursos → `/concursos`
```
GET/POST     /concursos
GET          /concursos/estagio/em-andamento  ← ANTES de /:id
POST         /concursos/estagio/:servidorId/avaliacao
PUT          /concursos/estagio/:servidorId/concluir
GET/PUT      /concursos/:id
GET/POST     /concursos/:id/candidatos
GET          /concursos/:id/candidatos/:candId
POST         /concursos/:id/convocacao
POST         /concursos/:id/posse
```

#### 🏥 Aposentadoria → `/aposentadoria`
```
GET          /aposentadoria
POST         /aposentadoria/pedido
GET          /aposentadoria/simulador/:servidorId  ← ANTES de /:id
GET          /aposentadoria/pensionistas            ← ANTES de /:id
POST         /aposentadoria/pensao                 ← ANTES de /:id
PUT          /aposentadoria/pensao/:id/cessar
GET          /aposentadoria/:id
PUT          /aposentadoria/:id/conceder
PUT          /aposentadoria/:id/indeferir
```

#### ⚖️ Disciplinar → `/disciplinar`
```
GET/POST     /disciplinar
GET/PUT      /disciplinar/:id
POST         /disciplinar/:id/documentos
DELETE       /disciplinar/:id/documentos/:docId
PUT          /disciplinar/:id/penalidade
PUT          /disciplinar/:id/arquivar
PUT          /disciplinar/:id/encerrar
```

#### ✍️ Assinatura → `/assinatura`
```
GET          /assinatura/pendentes
GET/POST     /assinatura
GET          /assinatura/:id
POST         /assinatura/:id/assinar
POST         /assinatura/:id/recusar
```

#### 🔔 Notificações → `/notificacoes`
```
GET          /notificacoes
GET          /notificacoes/nao-lidas
PUT          /notificacoes/marcar-todas-lidas  ← ANTES de /:id
PUT          /notificacoes/:id/lida
DELETE       /notificacoes/:id
```

#### 🌐 Transparência → `/public` (sem JWT)
```
GET          /public/remuneracao
GET          /public/remuneracao/export
GET          /public/quadro-pessoal
```

---

### ARQUITETURA E PADRÕES

```
routes.js → controller.js → service.js → prisma
```

- **Multitenancy:** `tenantId` em `req.tenantId` via middleware `authenticate`
- **RBAC:** `authorize('recurso', 'acao')` nas rotas
- **Auditoria:** `auditLog(recurso, acao)` grava em `audit_logs`
- **Erros:** `AppError` / `Errors.*`
- **Respostas:** `ok()`, `created()`, `paginate()`, `noContent()`
- **Paginação:** `parsePagination(req.query)` → `{ skip, take, page, limit }`

**Padrão de resposta:**
```json
{ "success": true, "data": { ... } }
{ "success": true, "data": [...], "pagination": { "page":1, "limit":20, "total":150, "pages":8 } }
{ "success": false, "error": { "code": "NOT_FOUND", "message": "..." } }
```

**Body para POST /servidores (novo formato com vínculos):**
```json
{
  "nome": "João Silva",
  "cpf": "000.000.000-00",
  "dataNascimento": "1985-03-15",
  "sexo": "MASCULINO",
  "estadoCivil": "CASADO",
  "escolaridade": "SUPERIOR_COMPLETO",
  "vinculo": {
    "regimeJuridico": "ESTATUTARIO",
    "cargoId": "...",
    "tabelaSalarialId": "...",
    "nivelSalarialId": "...",
    "lotacaoId": "...",
    "dataAdmissao": "2024-01-15",
    "tipoAlteracao": "ADMISSAO"
  },
  "contatos": [
    { "tipo": "EMAIL_PESSOAL", "valor": "joao@email.com", "principal": true },
    { "tipo": "CELULAR", "valor": "(11) 99999-0000" }
  ],
  "enderecos": [
    { "logradouro": "Rua das Flores", "numero": "123", "bairro": "Centro",
      "municipio": "Exemplo", "uf": "SP", "cep": "00000-000", "principal": true }
  ]
}
```

**PATCH /servidores/:id/vinculos/atual — atualiza vínculo (cria novo + desativa anterior):**
```json
{
  "tipoAlteracao": "TRANSFERENCIA_LOTACAO",
  "lotacaoId": "novo-lotacao-uuid",
  "portaria": "Port. 123/2026",
  "observacao": "Transferência a pedido"
}
```

---

### ESTADO ATUAL

✅ **Backend 100% funcional** — schema migrado, service/controller/routes de servidores atualizados.

⚠️ **Pendente de migration:**
```powershell
cd D:\PROJETOS\RH\govrh
npx prisma migrate dev --name vinculo_funcional_historico
npx prisma generate
```

🔲 **Frontend** — em desenvolvimento:
- Stack: **[PREENCHA]**
- UI: **[PREENCHA]**
- Módulos prontos: **[PREENCHA]**

---

### COMANDOS ÚTEIS

```powershell
cd D:\PROJETOS\RH\govrh
npm run dev                                         # Iniciar API
npx prisma migrate dev --name nome_da_migration     # Nova migration
npx prisma generate                                 # Regenerar client
npx prisma studio                                   # Visualizar banco
npm run db:seed                                     # Rodar seed

# Teste de login
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"rh@exemplo.gov.br","senha":"Rh@2026Pme","tenantCnpj":"00.000.000/0001-00"}'
```

---

**Continue o desenvolvimento a partir daqui.**
