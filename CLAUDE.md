# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

HaloLight BFF (Backend for Frontend) Gateway - A tRPC-based API layer that provides type-safe, unified API for HaloLight frontend applications.

## Technology Stack

- **Framework**: tRPC 11 + Express 5 + TypeScript
- **Validation**: Zod
- **Serialization**: SuperJSON
- **Authentication**: JWT (jsonwebtoken)
- **Logging**: Pino
- **Security**: Helmet, CORS
- **Runtime**: Node.js 20+

## Common Commands

```bash
pnpm dev          # Development mode with hot reload (tsx watch)
pnpm build        # TypeScript compilation
pnpm start        # Production mode
pnpm lint         # ESLint code checking
pnpm format       # Prettier code formatting
pnpm type-check   # TypeScript type checking
```

## Project Structure

```
src/
├── index.ts              # Entry point
├── server.ts             # Express server setup with tRPC adapter
├── trpc.ts               # tRPC instance and procedures
├── context.ts            # Context creation (user, traceId, services)
├── schemas/
│   ├── index.ts          # Schema exports
│   └── common.ts         # Common Zod schemas (pagination, sorting, response)
├── services/
│   ├── index.ts          # Service exports
│   ├── httpClient.ts     # HTTP client for backend services
│   └── serviceRegistry.ts # Backend service registry
├── routers/
│   ├── index.ts          # Root router combining all routers
│   ├── auth.ts           # Authentication (8 endpoints)
│   ├── users.ts          # User management (8 endpoints)
│   ├── dashboard.ts      # Dashboard statistics (9 endpoints)
│   ├── permissions.ts    # Permission management (7 endpoints)
│   ├── roles.ts          # Role management (8 endpoints)
│   ├── teams.ts          # Team management (9 endpoints)
│   ├── folders.ts        # Folder management (8 endpoints)
│   ├── files.ts          # File management (9 endpoints)
│   ├── documents.ts      # Document management (10 endpoints)
│   ├── calendar.ts       # Calendar events (10 endpoints)
│   ├── notifications.ts  # Notifications (7 endpoints)
│   └── messages.ts       # Messaging/chat (9 endpoints)
└── middleware/
    └── auth.ts           # Authentication/authorization middleware
```

## Core Concepts

### tRPC Architecture

```typescript
// 1. Define context with services
export async function createContext({ req, res }) {
  const user = extractUserFromToken(req);
  const traceId = req.headers['x-trace-id'] || randomUUID();
  return { req, res, user, traceId, services };
}

// 2. Initialize tRPC with context
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

// 3. Create procedures
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(authMiddleware);
export const adminProcedure = protectedProcedure.use(adminMiddleware);

// 4. Create routers
export const authRouter = router({
  login: publicProcedure
    .input(z.object({ email: z.string(), password: z.string() }))
    .mutation(async ({ input }) => {
      // Implementation
    }),
});
```

### Procedure Types

- **publicProcedure**: No authentication required
- **protectedProcedure**: Requires valid JWT token
- **adminProcedure**: Requires admin role

### Router Structure

Each router follows a consistent pattern:

```typescript
export const exampleRouter = router({
  // Query - Read operation
  list: protectedProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(10) }))
    .query(async ({ input, ctx }) => {
      return {
        code: 200,
        message: 'success',
        data: { list: [], total: 0, page: input.page, limit: input.limit },
      };
    }),

  // Mutation - Write operation
  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return { code: 200, message: 'Created successfully', data: { id: 'new-id' } };
    }),
});
```

## Available Routers (12 modules, 100+ endpoints)

| Router | Endpoints | Description |
|--------|-----------|-------------|
| auth | 8 | Login, register, token refresh, logout, password management |
| users | 8 | User CRUD, role/status management |
| dashboard | 9 | Statistics, trends, activities, tasks |
| permissions | 7 | Permission CRUD, tree structure, modules |
| roles | 8 | Role CRUD, permission assignment |
| teams | 9 | Team CRUD, member management |
| folders | 8 | Folder CRUD, tree, move, breadcrumb |
| files | 9 | File CRUD, upload, download, move, copy |
| documents | 10 | Document CRUD, versions, sharing |
| calendar | 10 | Event CRUD, attendees, RSVP |
| notifications | 7 | List, unread count, mark read, delete |
| messages | 9 | Conversations, messages, send, read status |

## Authentication Flow

### JWT Token Structure

```typescript
interface JWTPayload {
  id: string;
  name: string;
  email: string;
  role: {
    id: string;
    name: string;
    label: string;
    permissions: string[];
  };
}
```

### Token Usage

```typescript
// Client sends token in Authorization header
Authorization: Bearer <jwt-token>

// Server extracts and verifies in context.ts
const token = req.headers.authorization?.split(' ')[1];
const user = jwt.verify(token, JWT_SECRET);
```

### Permission System

- `*` - All permissions (admin)
- `module:*` - All operations on module (e.g., `users:*`)
- `module:action` - Specific action (e.g., `users:view`, `users:create`)

## Service Layer

### HTTP Client

```typescript
// Create client for backend service
const client = serviceRegistry.getClient('python');

// Make requests with automatic retry and timeout
const response = await client.get('/api/users', { query: { page: 1 } });
const created = await client.post('/api/users', { name: 'John' });
```

### Service Registry

```typescript
// Configure backend services via environment variables
HALOLIGHT_API_PYTHON_URL=http://api-python:8000
HALOLIGHT_API_BUN_URL=http://api-bun:3000
HALOLIGHT_API_NESTJS_URL=http://api-nestjs:3001

// Access in routers via context
const client = ctx.services.getDefault(); // Uses highest priority service
const pythonClient = ctx.services.get('python');
```

## Adding New Features

### 1. Create New Router

```typescript
// src/routers/products.ts
import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const productsRouter = router({
  list: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(10),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const { page = 1, limit = 10, search } = input || {};
      // Use ctx.services to call backend API
      const client = ctx.services.getDefault();
      const response = await client.get('/api/products', { query: { page, limit, search } });
      return { code: 200, message: 'success', data: response };
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      price: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const client = ctx.services.getDefault();
      const created = await client.post('/api/products', input);
      return { code: 200, message: 'Product created', data: created };
    }),
});
```

### 2. Register in Root Router

```typescript
// src/routers/index.ts
import { productsRouter } from './products';

export const appRouter = router({
  // ... existing routers
  products: productsRouter,
});
```

## Error Handling

### tRPC Error Codes

```typescript
import { TRPCError } from '@trpc/server';

throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });      // 401
throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });  // 403
throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid input' });           // 400
throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found' });        // 404
throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Server error' });  // 500
```

## Response Format

All API responses follow a consistent format:

```typescript
interface APIResponse<T> {
  code: number;        // HTTP status code
  message: string;     // Human-readable message
  data: T | null;      // Response data
}

// Paginated response
interface PaginatedResponse<T> {
  code: number;
  message: string;
  data: {
    list: T[];
    total: number;
    page: number;
    limit: number;
    totalPages?: number;
  };
}
```

## Environment Variables

### Required

```bash
JWT_SECRET=your-secret-key        # Must be changed in production (32+ chars)
PORT=3002                          # Server port
```

### Optional

```bash
HOST=0.0.0.0                       # Server host
NODE_ENV=development               # Environment
CORS_ORIGIN=*                      # CORS allowed origins
JWT_EXPIRES_IN=7d                  # Token expiration
LOG_LEVEL=info                     # Logging level

# Backend Services
HALOLIGHT_API_PYTHON_URL=http://localhost:8000
HALOLIGHT_API_BUN_URL=http://localhost:3000
HALOLIGHT_API_JAVA_URL=http://localhost:8080
HALOLIGHT_API_NESTJS_URL=http://localhost:3001
HALOLIGHT_API_NODE_URL=http://localhost:3003
HALOLIGHT_API_GO_URL=http://localhost:8081
```

## Database Integration (Future)

Currently using mock data. To integrate real database:

1. **Install ORM** (Prisma recommended)
   ```bash
   pnpm add @prisma/client
   pnpm add -D prisma
   ```

2. **Initialize Prisma**
   ```bash
   pnpx prisma init
   ```

3. **Add to context**
   ```typescript
   import { PrismaClient } from '@prisma/client';
   const prisma = new PrismaClient();

   export async function createContext({ req, res }) {
     return { req, res, user, prisma, services };
   }
   ```

## Client Usage

### React with @tanstack/react-query

```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from 'halolight-bff';

const trpc = createTRPCReact<AppRouter>();

function UserList() {
  const { data, isLoading } = trpc.users.list.useQuery({ page: 1 });
  if (isLoading) return <div>Loading...</div>;
  return <div>{data?.data.list.map(user => <div key={user.id}>{user.name}</div>)}</div>;
}
```

### Next.js App Router

```typescript
// Server Component
import { createCaller } from '@trpc/server';
import { appRouter } from './routers';

export default async function Page() {
  const caller = createCaller({ req: {}, res: {}, user: null });
  const data = await caller.dashboard.getStats();
  return <div>{JSON.stringify(data)}</div>;
}
```

## Security Best Practices

1. **Always validate input** with Zod schemas
2. **Never expose sensitive data** in error messages (production)
3. **Use HTTPS** in production
4. **Implement rate limiting** to prevent abuse
5. **Sanitize user input** to prevent injection attacks
6. **Use secure JWT secrets** (at least 32 characters)
7. **Enable CORS** only for trusted origins
8. **Keep dependencies updated** regularly

## Troubleshooting

### Common Issues

1. **Port already in use**: Change PORT in .env or kill the process
2. **CORS errors**: Update CORS_ORIGIN in .env
3. **Token verification fails**: Ensure JWT_SECRET matches between environments
4. **Type errors**: Run `pnpm type-check` to identify issues
5. **Build fails**: Check for unused variables (noUnusedLocals is enabled)

## Contributing

1. Follow the existing code structure
2. Add proper TypeScript types
3. Validate all inputs with Zod
4. Use consistent error handling with TRPCError
5. Follow the response format convention
6. Update documentation when adding features

## Resources

- [tRPC Documentation](https://trpc.io/docs)
- [Zod Documentation](https://zod.dev/)
- [Express Documentation](https://expressjs.com/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
