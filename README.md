# HaloLight BFF Gateway

> Backend for Frontend (BFF) gateway layer built with tRPC, providing a unified, type-safe API for HaloLight frontend applications.

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![tRPC](https://img.shields.io/badge/tRPC-11.0+-blueviolet.svg)](https://trpc.io/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

## Overview

HaloLight BFF is a tRPC-based Backend for Frontend service that acts as an API gateway between frontend applications and backend services. It provides:

- **Type-safe APIs**: Full TypeScript type inference from server to client
- **Unified Interface**: Single API layer aggregating multiple backend services
- **Authentication**: JWT-based authentication and authorization
- **12 Business Modules**: 100+ endpoints covering all common business scenarios
- **Service Registry**: Support for multiple backend services (Python, Bun, Java, NestJS, Node, Go)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend Applications                        │
│        (Next.js, Vue, Angular, React, Nuxt, etc.)               │
└─────────────────────────────┬───────────────────────────────────┘
                              │ tRPC Client (Type-safe)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   HaloLight BFF Gateway (tRPC)                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  Auth   │ │  Users  │ │Dashboard│ │  Roles  │ │  Teams  │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Folders │ │  Files  │ │  Docs   │ │Calendar │ │Messages │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP Client (with retry & timeout)
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
      ┌──────────┐      ┌──────────┐      ┌──────────┐
      │  Python  │      │   Bun    │      │  NestJS  │
      │   API    │      │   API    │      │   API    │
      └──────────┘      └──────────┘      └──────────┘
```

## Features

### Business Modules (12 Routers, 100+ Endpoints)

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **auth** | 8 | Login, register, token refresh, logout, password management |
| **users** | 8 | User CRUD, role/status management, pagination |
| **dashboard** | 9 | Statistics, trends, activities, tasks, system overview |
| **permissions** | 7 | Permission CRUD, tree structure, module listing |
| **roles** | 8 | Role CRUD, permission assignment |
| **teams** | 9 | Team CRUD, member management, role updates |
| **folders** | 8 | Folder CRUD, tree structure, move, breadcrumb |
| **files** | 9 | File CRUD, upload, download, move, copy, batch delete |
| **documents** | 10 | Document CRUD, version history, sharing, restore |
| **calendar** | 10 | Event CRUD, attendees, RSVP |
| **notifications** | 7 | List, unread count, mark read, delete |
| **messages** | 9 | Conversations, messages, send, read status |

### Infrastructure

- **HTTP Client**: Unified client with retry, timeout, and Zod response validation
- **Service Registry**: Multi-backend support with priority-based routing
- **Context Enhancement**: TraceId tracking, service client injection
- **Common Schemas**: Reusable Zod schemas for pagination, sorting, responses

### Security

- JWT-based authentication with role-based access control (RBAC)
- Permission-based authorization (`*`, `module:*`, `module:action`)
- Helmet.js security headers
- CORS configuration
- Request validation with Zod

## Prerequisites

- **Node.js**: >= 20.0.0
- **pnpm**: >= 8.0.0
- **TypeScript**: >= 5.9.0

## Installation

```bash
# Clone the repository
git clone https://github.com/halolight/halolight-bff.git
cd halolight-bff

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start development server
pnpm dev
```

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3002
HOST=0.0.0.0
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=*

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=info

# Backend Services (optional - for API aggregation)
HALOLIGHT_API_PYTHON_URL=http://localhost:8000
HALOLIGHT_API_BUN_URL=http://localhost:3000
HALOLIGHT_API_JAVA_URL=http://localhost:8080
HALOLIGHT_API_NESTJS_URL=http://localhost:3001
HALOLIGHT_API_NODE_URL=http://localhost:3003
HALOLIGHT_API_GO_URL=http://localhost:8081
```

## Usage

### Development

```bash
pnpm dev          # Start with hot reload
```

Server will be available at `http://localhost:3002`

### Production

```bash
pnpm build        # Build TypeScript
pnpm start        # Start production server
```

### Other Commands

```bash
pnpm lint         # Lint code
pnpm format       # Format code
pnpm type-check   # Type check
```

## API Examples

### Authentication

```typescript
// Login
const result = await trpc.auth.login.mutate({
  email: 'user@example.com',
  password: 'password123',
});
// Returns: { code: 200, message: 'Login successful', data: { user, token, expiresIn } }

// Get current user
const user = await trpc.auth.getCurrentUser.query();

// Refresh token
const newToken = await trpc.auth.refreshToken.mutate();
```

### Users

```typescript
// List users with pagination
const users = await trpc.users.list.query({
  page: 1,
  limit: 10,
  search: 'john',
  role: 'admin',
  status: 'active',
});

// Create user (admin only)
const newUser = await trpc.users.create.mutate({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'securePassword123',
  role: 'editor',
});
```

### Documents

```typescript
// List documents
const docs = await trpc.documents.list.query({
  folderId: 'folder-1',
  status: 'published',
  tags: ['important'],
});

// Create document
const doc = await trpc.documents.create.mutate({
  title: 'Project Spec',
  content: '# Project Overview\n\n...',
  folderId: 'folder-docs',
  status: 'draft',
  tags: ['project', 'spec'],
});

// Get version history
const versions = await trpc.documents.getVersions.query({ documentId: 'doc-1' });

// Restore to previous version
await trpc.documents.restoreVersion.mutate({ documentId: 'doc-1', version: 2 });
```

### Calendar

```typescript
// List events in date range
const events = await trpc.calendar.list.query({
  start: '2024-01-01T00:00:00Z',
  end: '2024-01-31T23:59:59Z',
});

// Create event
const event = await trpc.calendar.create.mutate({
  title: 'Team Meeting',
  start: '2024-01-15T10:00:00Z',
  end: '2024-01-15T11:00:00Z',
  location: 'Conference Room A',
  recurrence: 'weekly',
});

// RSVP
await trpc.calendar.updateAttendeeStatus.mutate({
  eventId: 'event-1',
  status: 'accepted',
});
```

## Client Integration

### Next.js / React

```typescript
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from 'halolight-bff';

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3002/trpc',
      headers() {
        const token = localStorage.getItem('token');
        return { authorization: token ? `Bearer ${token}` : '' };
      },
    }),
  ],
  transformer: superjson,
});
```

### React Query Integration

```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from 'halolight-bff';

export const trpc = createTRPCReact<AppRouter>();

// In component
function UserList() {
  const { data, isLoading } = trpc.users.list.useQuery({ page: 1 });

  if (isLoading) return <div>Loading...</div>;
  return (
    <ul>
      {data?.data.list.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## Project Structure

```
src/
├── index.ts              # Entry point
├── server.ts             # Express server setup
├── trpc.ts               # tRPC instance and procedures
├── context.ts            # Context creation (user, traceId, services)
├── schemas/
│   ├── index.ts          # Schema exports
│   └── common.ts         # Common Zod schemas
├── services/
│   ├── index.ts          # Service exports
│   ├── httpClient.ts     # HTTP client for backend services
│   └── serviceRegistry.ts # Backend service registry
├── routers/
│   ├── index.ts          # Root router
│   ├── auth.ts           # Authentication
│   ├── users.ts          # User management
│   ├── dashboard.ts      # Dashboard statistics
│   ├── permissions.ts    # Permission management
│   ├── roles.ts          # Role management
│   ├── teams.ts          # Team management
│   ├── folders.ts        # Folder management
│   ├── files.ts          # File management
│   ├── documents.ts      # Document management
│   ├── calendar.ts       # Calendar events
│   ├── notifications.ts  # Notifications
│   └── messages.ts       # Messaging
└── middleware/
    └── auth.ts           # Auth middleware
```

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod
COPY . .
RUN pnpm build
EXPOSE 3002
CMD ["node", "dist/index.js"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  bff:
    build: .
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - HALOLIGHT_API_PYTHON_URL=http://api-python:8000
    depends_on:
      - api-python
```

## Roadmap

- [x] Core routers (auth, users, dashboard)
- [x] Permission and role management
- [x] Team management
- [x] File and document management
- [x] Calendar and notifications
- [x] Messaging system
- [x] HTTP client with retry/timeout
- [x] Service registry for multi-backend
- [ ] Database integration (Prisma)
- [ ] WebSocket support for real-time
- [ ] Redis caching layer
- [ ] Rate limiting
- [ ] Comprehensive test suite
- [ ] OpenAPI documentation

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Links

- [Documentation](https://docs.halolight.h7ml.cn)
- [GitHub Repository](https://github.com/halolight/halolight-bff)
- [tRPC Documentation](https://trpc.io)
- [Issue Tracker](https://github.com/halolight/halolight-bff/issues)

---

Built with TypeScript, tRPC, and Express by the HaloLight Team
