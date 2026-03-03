# GovHRPub — AI Coding Instructions

> HR Management System for Brazilian Municipal Public Service  
> Stack: Node.js + Express + Prisma + React + TypeScript + Zustand

## Architecture Overview

**Multi-tenant monorepo** with two independent applications:
- **Backend** (`govrh/`): REST API using Express + Prisma ORM
- **Frontend** (`govrh-frontend/`): React SPA using Vite + TypeScript

**Critical principle**: All HTTP requests must include tenant context. The `authenticate` middleware extracts `tenantId` from JWT and injects it into `req.tenantId` — use this for all database queries.

### Data Flow

1. Frontend: Login → `useAuthStore` (Zustand) → tokens stored in localStorage
2. API interceptor (`src/services/api.ts`): Injects Bearer token automatically
3. Backend: Route → `authenticate` middleware → extracts `tenantId` + user → passes to controller
4. Controller: Delegates to Service layer → Service queries Prisma with `tenantId` filter
5. Response: Standardized format with `{ success: boolean, data: T, meta?: {...} }`

---

## Backend Patterns

### Module Structure (Fixed Convention)

Every feature module follows this structure:
```
modules/{feature}/
  ├── {feature}.routes.js      # Express Router + permission checks
  ├── {feature}.controller.js  # HTTP handlers (try-catch wrapping, delegates to service)
  ├── {feature}.service.js     # Business logic + Prisma queries
  ├── {feature}.schemas.js     # Zod validation schemas
  └── repository.js            # (Optional) Complex query abstractions
```

**Route rule-of-gold**: Fixed routes FIRST, then composite fixed routes, then dynamic routes with `:id` last:
```javascript
router.get('/',        ctrl.list);           // Fixed
router.get('/export',  ctrl.export);         // Fixed
router.post('/',       ctrl.create);         // Fixed
router.get('/:id',     ctrl.detail);         // Dynamic
router.put('/:id',     ctrl.update);         // Dynamic
```

### Error Handling

- Use `AppError` for **operational errors** (expected, user-facing):
  ```javascript
  throw new AppError('Servidor não encontrado.', 404, 'NOT_FOUND');
  ```
- Prisma errors auto-converted in `errorHandler.js`:
  - `P2002` → 409 CONFLICT (duplicate key)
  - `P2025` → 404 NOT_FOUND (record not found)
- **Unexpected errors** logged with full stack trace, client gets generic 500

### Response Format

Use helpers from `src/utils/response.js`:
```javascript
success(res, data, 200, { meta: 'value' });  // Paginated queries
paginated(res, data, { page, pageSize, total });
created(res, data);  // 201
noContent(res);      // 204
```

### Middleware Chain (Review `src/app.js`)

- **Security**: helmet, CORS, rate limiting
- **Auth**: `authenticate` → extracts JWT + loads user
- **Authorization**: `authorize('resource', 'action')` → checks RBAC
- **Validation**: `validate(zod_schema)` → validates request body
- **Audit**: `auditLog('entity', 'action')` → logs to database
- **Errors**: Global handler catches all errors (must be registered LAST)

### Database Queries

- Always filter by `tenantId` to enforce isolation:
  ```javascript
  prisma.servidor.findMany({ where: { tenantId, ...filters } })
  ```
- Use Prisma `include:` to eager-load relationships (see `VINCULO_INCLUDE` pattern in `servidores.service.js`)
- Complex queries use `prisma.$transaction()` for atomicity
- Enums are critical business logic (see `schema.prisma`): `SituacaoFuncional`, `TipoProgressao`, `TipoVerba`, etc.

---

## Frontend Patterns

### State Management (Zustand)

Central store in `src/store/authStore.ts`:
- Wraps API calls, handles errors via `extractApiError()`
- Persists to localStorage with `persist` middleware
- Inject tokens into **all subsequent requests** via axios interceptor

### API Communication

- Base instance: `src/services/api.ts` (axios)
- Feature-specific services: `src/services/{feature}.ts` (e.g., `servidores.ts`, `folha.ts`)
- Manual API module `src/services/modules.ts` for dynamic endpoint registration

### Page Structure

Example: `src/pages/servidores/ServidoresPage.tsx`

1. **Custom hooks**: `useDebounce` for search, `useAuthStore`, `useNavigate`
2. **Local state**: Filtering, sorting, pagination metadata
3. **Effects**: Fetch data on mount + when filters change
4. **Render**: Skeleton loaders while loading, Badge components for status, Table with sort icons

### UI Components

- **Radix UI** primitives (Dialog, Select, Dropdown, Toast)
- **Tailwind CSS** for styling + `tailwind.config.js` (customized palette with `gov-*` colors)
- **Lucide React** icons
- Components in `src/components/ui/` (Button, Input, Skeleton, etc.)
- Toast notifications: `useToast()` hook + `Toaster` root component

### Routing

- **React Router v6**: Routes defined in `App.tsx`
- **Protected routes**: Wrap with `<ProtectedRoute />` — checks auth state
- **Lazy loading**: Import pages as needed (no bundling overhead)

---

## Development Workflows

### Backend

```bash
# Development
npm run dev              # Nodemon watches src/ + restarts on changes

# Database
npm run db:migrate      # Create new migration
npm run db:seed         # Run seed scripts
npm run db:studio       # Open Prisma Studio GUI

# Testing
npm run test            # Jest (run-in-band)
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report

# Code quality
npm run lint            # ESLint check
npm run lint:fix        # Auto-fix
```

### Frontend

```bash
# Development
npm run dev             # Vite dev server (http://localhost:5173)

# Build
npm run build           # TypeScript check + Vite build → dist/
npm run preview         # Preview production build locally

# Linting
npm run lint            # ESLint (max-warnings: 0)
```

### Debugging

- **Backend logs**: Winston logger → `logs/` directory + console
- **Frontend**: Browser DevTools + React Router DevTools extension
- **Database**: `npm run db:studio` opens Prisma visual client
- **API calls**: Network tab in DevTools or Postman

---

## Key Files & Conventions

| Path | Purpose |
|------|---------|
| `govrh/src/config/` | ENV validation, logger, Prisma client setup |
| `govrh/src/middlewares/` | Auth, RBAC, audit, error handling |
| `govrh/prisma/schema.prisma` | Database schema + enums (source of truth for domains) |
| `govrh-frontend/src/services/` | API clients (typed + error handling) |
| `govrh-frontend/src/store/` | Zustand stores (state + side effects) |
| `govrh-frontend/src/types/` | TypeScript interfaces (keep in sync with backend) |
| `README.md` | Portuguese-language system architecture + HR business rules |

---

## Code Style & Naming

- **Language**: Portuguese for business domain (servidor, vinculo, folha)
- **Classes**: PascalCase (e.g., `ServidorController`, `ServidorService`)
- **Variables**: camelCase (e.g., `tenantId`, `vinculos`)
- **Constants**: UPPER_CASE (e.g., `VINCULO_ATUAL_WHERE`, `JWT_EXPIRES_IN`)
- **Enums**: PascalCase, values UPPER_SNAKE_CASE (e.g., `enum RegimeJuridico { ESTATUTARIO, CELETISTA }`)
- **Files**: kebab-case (e.g., `servidores.routes.js`, `auth-store.ts`)

---

## Multi-Tenancy & Isolation

- **Enforcement**: Every query must filter by `tenantId`
- **Auth middleware**: Injects `req.tenantId` from JWT claim
- **No cross-tenant leaks**: Audit middleware logs `tenantId` with every action
- **Tenant-specific roles**: RBAC matrix stored in database, queried per-request

---

## Common Tasks

### Adding a New Endpoint

1. Add route to `modules/{feature}/{feature}.routes.js` (+ auth/validation middleware)
2. Implement handler in `.controller.js` (delegate to service)
3. Implement logic in `.service.js` (Prisma queries with `tenantId`)
4. Add schema to `.schemas.js` (Zod validation)
5. Frontend: Add API method to `services/{feature}.ts`
6. Frontend: Update types in `types/{feature}.ts`

### Making an API Call from Frontend

```typescript
// 1. Add to src/services/{feature}.ts
export const servidoresApi = {
  list: (params) => api.get('/servidores', { params }),
  create: (data) => api.post('/servidores', data),
}

// 2. In component
const [data, setData] = useState(null)
useEffect(() => {
  servidoresApi.list({ page: 1 }).then(res => setData(res.data.data))
}, [])
```

### Database Migration

```bash
# Create new migration
npm run db:migrate
# → Creates timestamped file in prisma/migrations/
# → Edit .sql file or Prisma schema, then run again

# To seed
npm run db:seed  # runs seed.js (or seed-verbas-sistema.js)
```

---

## Testing Notes

- **Backend**: Jest with supertest for HTTP (run with `--runInBand`)
- **Frontend**: Not yet integrated (placeholder structure)
- **Pattern**: Controllers pass tenantId to services; services isolated from HTTP

---

**Last Updated**: March 2026 | V1.0
