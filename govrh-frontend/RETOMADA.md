# PROMPT DE RETOMADA — GovHRPub Frontend

## Contexto do Projeto

Estou desenvolvendo o **GovHRPub** — sistema de RH municipal para prefeituras, com arquitetura multi-tenant. O backend está 100% completo (Node.js + Express + Prisma + MySQL rodando em `http://localhost:3000/api/v1`). Estamos agora desenvolvendo o **frontend React**.

---

## Stack Frontend

- **React 18** + **Vite 6** + **TypeScript**
- **Tailwind CSS** + `tailwindcss-animate`
- **shadcn/ui** (componentes em `src/components/ui/`)
- **React Router v6** (`react-router-dom`)
- **Zustand** (estado global de autenticação — `src/store/authStore.ts`)
- **React Hook Form** + **Zod** (formulários)
- **Axios** (HTTP client com interceptors JWT automáticos)
- **lucide-react** (ícones)
- **date-fns**, `clsx`, `tailwind-merge`

### Dependências instaladas (package.json)
```
@hookform/resolvers, @radix-ui/react-avatar, @radix-ui/react-dialog,
@radix-ui/react-dropdown-menu, @radix-ui/react-label, @radix-ui/react-scroll-area,
@radix-ui/react-separator, @radix-ui/react-slot, @radix-ui/react-toast,
@radix-ui/react-tooltip, axios, class-variance-authority, clsx, date-fns,
lucide-react, react, react-dom, react-hook-form, react-router-dom,
tailwind-merge, tailwindcss-animate, zod, zustand
```

> ⚠️ **`@radix-ui/react-select` NÃO está no package.json** mas é usado em vários módulos. Se der erro de import, instalar com:
> ```bash
> npm install @radix-ui/react-select
> ```

---

## Design System

**Fontes:** Fraunces (display/títulos) + Sora (corpo) — carregadas via Google Fonts no `index.html`

**Paleta principal:**
- Sidebar fundo: `bg-[#0f1629]` (azul-marinho escuro)
- Itens sidebar: `text-slate-300` / hover `text-white` / ativo `text-white bg-indigo-500/30 border-r-[3px] border-indigo-400`
- Primário (botões gov): classe `variant="gov"` — azul índigo
- Acento: âmbar/dourado para destaques
- Background app: `hsl(220 33% 98%)` (quase branco azulado)

**Classes CSS customizadas** definidas em `src/index.css`:
- `.sidebar`, `.sidebar-item`, `.sidebar-item.active`
- `animate-fade-in` para transições de página
- Variáveis: `--gov-*`, `--sidebar-*`

---

## Estrutura de Arquivos (`src/`)

```
src/
├── App.tsx                          # Roteamento principal (102 linhas)
├── main.tsx
├── index.css
│
├── store/
│   └── authStore.ts                 # Zustand — token JWT, usuario, tenant (101l)
│
├── services/
│   ├── api.ts                       # Axios instance + interceptors + extractApiError (154l)
│   ├── servidores.ts                # CRUD servidores (39l)
│   ├── folha.ts                     # Folha de pagamento (22l)
│   ├── progressao.ts                # Progressão funcional (30l)
│   ├── ponto.ts                     # Ponto e escalas (43l)
│   └── modules.ts                   # cargosApi, feriasApi, licencasApi, concursoApi,
│                                    # aposentadoriaApi, disciplinarApi, assinaturaApi,
│                                    # notificacoesApi, transparenciaApi (112l)
│
├── types/
│   ├── servidor.ts                  # Enums + interfaces servidor (223l)
│   ├── folha.ts                     # Types folha/holerite (76l)
│   ├── progressao.ts                # Types progressão (91l)
│   ├── ponto.ts                     # Types ponto/escalas (66l)
│   └── modules.ts                   # Types para todos os outros módulos (284l)
│
├── lib/
│   └── utils.ts                     # cn(), formatCPF(), formatCNPJ(), formatCurrency(), formatDate()
│
├── hooks/
│   └── useToast.ts                  # Hook de toast (93l)
│
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx       # Guarda de rota JWT
│   ├── layout/
│   │   ├── AppLayout.tsx            # Sidebar + Header + <Outlet>
│   │   ├── Sidebar.tsx              # Nav lateral colapsável (140l)
│   │   └── Header.tsx               # Barra superior com busca global (77l)
│   ├── servidores/
│   │   └── SituacaoBadge.tsx        # Badge colorido por situação funcional (47l)
│   └── ui/                          # shadcn/ui components:
│       ├── avatar.tsx, badge.tsx, button.tsx, dialog.tsx
│       ├── input.tsx, label.tsx, scroll-area.tsx, select.tsx
│       ├── separator.tsx, skeleton.tsx, toast.tsx, toaster.tsx, tooltip.tsx
│
└── pages/
    ├── LoginPage.tsx                 # Login com CNPJ tenant + email + senha (338l)
    ├── DashboardPage.tsx             # KPIs e resumo (149l)
    ├── PlaceholderPage.tsx           # Módulo em desenvolvimento (21l)
    │
    ├── servidores/
    │   ├── ServidoresPage.tsx        # Lista paginada, filtros, busca, sort (495l)
    │   ├── ServidorDetalhe.tsx       # Perfil com 3 abas + histórico (423l)
    │   ├── NovoServidorPage.tsx      # Formulário criação + Zod (336l)
    │   └── EditarServidorPage.tsx    # Formulário edição (514l)
    │
    ├── folha/
    │   ├── FolhaPage.tsx             # Lista competências + modal processar (354l)
    │   ├── HoleritePage.tsx          # Contracheque imprimível (243l)
    │   └── HoleritesPorFolhaPage.tsx # Holerites de uma competência (173l)
    │
    ├── progressao/
    │   └── ProgressaoPage.tsx        # Aptos (seleção lote) + histórico (568l)
    │
    ├── cargos/
    │   └── CargosPage.tsx            # Lista cargos + matriz salarial PCCV (230l)
    │
    ├── ponto/
    │   └── PontoPage.tsx             # Registro diário, justificativas, resumo (529l)
    │
    ├── ferias/
    │   └── FeriasPage.tsx            # Períodos aquisitivos, aprovação (246l)
    │
    ├── licencas/
    │   └── LicencasPage.tsx          # Todos tipos, prorrogação, fluxo (268l)
    │
    ├── concurso/
    │   └── ConcursoPage.tsx          # Concursos, candidatos, posse (182l)
    │
    ├── aposentadoria/
    │   └── AposentadoriaPage.tsx     # Aptos, simulador, registro (230l)
    │
    ├── disciplinar/
    │   └── DisciplinarPage.tsx       # PAD/sindicância, penalidades (269l)
    │
    ├── assinatura/
    │   └── AssinaturaPage.tsx        # Documentos pendentes, assinar (169l)
    │
    ├── notificacoes/
    │   └── NotificacoesPage.tsx      # Lidas/não lidas, marcar todas (156l)
    │
    ├── transparencia/
    │   └── TransparenciaPage.tsx     # Portal público, remunerações (202l)
    │
    └── configuracoes/
        └── ConfiguracoesPage.tsx     # Tenant, perfil, segurança, SMTP (533l)
```

---

## Rotas (App.tsx)

```
/login                               → LoginPage (pública)
/dashboard                           → DashboardPage
/servidores                          → ServidoresPage
/servidores/novo                     → NovoServidorPage
/servidores/:id                      → ServidorDetalhe
/servidores/:id/editar               → EditarServidorPage
/folha                               → FolhaPage
/folha/:folhaId/holerites            → HoleritesPorFolhaPage
/folha/holerite/:servidorId/:comp    → HoleritePage
/progressao                          → ProgressaoPage
/cargos                              → CargosPage
/ponto                               → PontoPage
/ferias                              → FeriasPage
/licencas                            → LicencasPage
/concurso                            → ConcursoPage
/aposentadoria                       → AposentadoriaPage
/disciplinar                         → DisciplinarPage
/assinatura                          → AssinaturaPage
/notificacoes                        → NotificacoesPage
/transparencia                       → TransparenciaPage
/configuracoes                       → ConfiguracoesPage
```

---

## API e Autenticação

- **Base URL:** `http://localhost:3000/api/v1`
- **Auth:** JWT Bearer Token — armazenado no Zustand (`authStore`)
- **Interceptor automático:** toda requisição adiciona `Authorization: Bearer <token>`
- **Refresh automático:** em caso de 401, tenta `POST /auth/refresh` e repete a requisição

### extractApiError (CORRIGIDA — bug resolvido)
```ts
export function extractApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (typeof data?.message === 'string') return data.message
    if (Array.isArray(data?.message)) return data.message.join(', ')
    if (typeof data?.error === 'string') return data.error
    if (error.response?.status === 401) return 'Credenciais inválidas.'
    if (error.response?.status === 429) return 'Muitas tentativas. Aguarde alguns minutos.'
    if (error.response?.status === 500) return 'Erro interno do servidor.'
    if (!error.response) return 'Sem conexão com o servidor.'
  }
  if (error instanceof Error) return error.message
  return 'Erro inesperado.'
}
```

---

## Credenciais de Teste

| Perfil | E-mail | Senha |
|--------|--------|-------|
| RH | rh@exemplo.gov.br | Rh@2026Pme |
| Admin | admin@govrh.gov.br | Admin@2026! |
| Tenant CNPJ | 00.000.000/0001-00 | — |

---

## Estado Atual — O que funciona

✅ Login + autenticação JWT  
✅ Layout (sidebar colapsável, header com busca global)  
✅ **Servidores** — lista, detalhe (3 abas), criar, editar  
✅ **Folha de Pagamento** — processar, listar, holerite imprimível  
✅ **Progressão** — aptos, lote, histórico  
✅ **Cargos & PCCV** — lista + matriz salarial  
✅ **Ponto** — registro diário, justificativas  
✅ **Férias** — períodos, aprovação  
✅ **Licenças** — todos os tipos, prorrogação  
✅ **Concursos** — lista, candidatos, posse  
✅ **Aposentadoria** — aptos, simulador  
✅ **Disciplinar** — PAD, penalidades  
✅ **Assinatura Digital** — documentos, assinar  
✅ **Notificações** — lidas/não lidas  
✅ **Transparência** — portal público  
✅ **Configurações** — tenant, perfil, segurança, SMTP  

---

## Bugs já corrigidos (não reintroduzir)

1. **`extractApiError` retornando objeto** → `typeof data?.message === 'string'` obrigatório
2. **Sidebar invisível** → usar classes Tailwind literais (`text-slate-300`, `bg-[#0f1629]`), não variáveis CSS via `hsl(var(--sidebar-text))`
3. **`@radix-ui/react-select` faltando** → instalado separadamente

---

## Convenções de código

- **Toasts de erro:** sempre `toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })`
- **Loading states:** Skeleton rows enquanto carrega, empty state com ícone quando vazio
- **Animação de entrada:** `className="... animate-fade-in"` em todo `<div>` raiz de página
- **Formatação:** `formatCurrency()`, `formatDate()`, `formatCPF()` de `@/lib/utils`
- **Padrão de fetch:**
```ts
const fetchDados = useCallback(async () => {
  setLoading(true)
  try {
    const { data: res } = await algumaApi.listar()
    setDados(res.data)
  } catch (err) {
    toast({ variant: 'destructive', title: 'Erro', description: extractApiError(err) })
  } finally {
    setLoading(false)
  }
}, [deps])
useEffect(() => { fetchDados() }, [fetchDados])
```

---

## Localização dos arquivos no container

```
Frontend: /home/claude/govrh-frontend/
Último ZIP gerado: /mnt/user-data/outputs/govrh-frontend-v4.zip
```

---

## Próximos passos sugeridos

- Refinamento visual de módulos que retornam 404 (verificar rotas backend)
- Testes de integração completa com backend
- Página de edição de servidor (`EditarServidorPage`) — revisar se está completa
- Dashboard com dados reais (KPIs via API)
- Melhorias de UX: loading global, error boundaries, feedback offline
