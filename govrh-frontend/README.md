# GovHRPub — Frontend

Interface React + Vite + shadcn/ui para o sistema de RH Municipal.

## Stack

- **React 18** + **Vite 6** + **TypeScript**
- **shadcn/ui** + **Tailwind CSS 3**
- **React Router v6** (SPA com rotas protegidas)
- **Zustand** (estado global — auth persisted no localStorage)
- **React Hook Form** + **Zod** (validação de formulários)
- **Axios** (HTTP + interceptors JWT refresh automático)

## Instalação

```powershell
# Na pasta D:\PROJETOS\RH\govrh-frontend (ou ao lado do backend)
npm install
```

## Desenvolvimento

```powershell
# Inicia o dev server em http://localhost:5173
# O proxy /api → http://localhost:3000 já está configurado no vite.config.ts
npm run dev
```

> ⚠️ O backend deve estar rodando em `localhost:3000` antes de iniciar o frontend.

## Estrutura

```
src/
├── components/
│   ├── auth/           ← ProtectedRoute
│   ├── layout/         ← AppLayout, Sidebar, Header
│   └── ui/             ← shadcn/ui components
├── hooks/              ← useToast
├── lib/                ← utils (cn, formatCNPJ, etc.)
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   └── PlaceholderPage.tsx  ← módulos futuros
├── services/
│   └── api.ts          ← axios + interceptors JWT refresh
├── store/
│   └── authStore.ts    ← Zustand auth (persist)
├── App.tsx             ← roteamento completo
└── main.tsx
```

## Credenciais de teste (DEV)

Visíveis automaticamente no card de login em modo desenvolvimento:

| Perfil   | CNPJ                    | E-mail                  | Senha        |
|----------|-------------------------|-------------------------|--------------|
| RH       | 00.000.000/0001-00      | rh@exemplo.gov.br       | Rh@2026Pme   |
| Admin    | 00.000.000/0001-00      | admin@govrh.gov.br      | Admin@2026!  |

## Próximos módulos

- [ ] `/servidores` — listagem, filtros, cadastro, perfil completo
- [ ] `/folha` — processamento, holerite interativo
- [ ] `/progressao` — aptos, simulação, lote
- [ ] `/ferias` — período aquisitivo, workflow
