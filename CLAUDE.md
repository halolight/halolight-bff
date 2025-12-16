# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## 项目概述

HaloLight BFF（Backend for Frontend）网关 - 基于 tRPC 的 API 层，为 HaloLight 前端应用提供类型安全、统一的 API。

## 技术栈

- **框架**：tRPC 11 + Express 5 + TypeScript
- **验证**：Zod
- **序列化**：SuperJSON
- **认证**：JWT (jsonwebtoken)
- **日志**：Pino
- **安全**：Helmet、CORS
- **运行时**：Node.js 20+

## 常用命令

```bash
pnpm dev          # 开发模式（热重载，tsx watch）
pnpm build        # TypeScript 编译
pnpm start        # 生产模式
pnpm lint         # ESLint 代码检查
pnpm format       # Prettier 代码格式化
pnpm type-check   # TypeScript 类型检查
```

## 项目结构

```
src/
├── index.ts              # 入口文件
├── server.ts             # Express 服务器配置（含 tRPC 适配器）
├── trpc.ts               # tRPC 实例和 procedures
├── context.ts            # Context 创建（用户、traceId、服务）
├── schemas/
│   ├── index.ts          # Schema 导出
│   └── common.ts         # 通用 Zod schemas（分页、排序、响应）
├── services/
│   ├── index.ts          # Service 导出
│   ├── httpClient.ts     # 后端服务 HTTP 客户端
│   └── serviceRegistry.ts # 后端服务注册表
├── routers/
│   ├── index.ts          # 根路由（组合所有路由）
│   ├── auth.ts           # 认证（8 个端点）
│   ├── users.ts          # 用户管理（8 个端点）
│   ├── dashboard.ts      # 仪表盘统计（9 个端点）
│   ├── permissions.ts    # 权限管理（7 个端点）
│   ├── roles.ts          # 角色管理（8 个端点）
│   ├── teams.ts          # 团队管理（9 个端点）
│   ├── folders.ts        # 文件夹管理（8 个端点）
│   ├── files.ts          # 文件管理（9 个端点）
│   ├── documents.ts      # 文档管理（10 个端点）
│   ├── calendar.ts       # 日历事件（10 个端点）
│   ├── notifications.ts  # 通知（7 个端点）
│   └── messages.ts       # 消息/聊天（9 个端点）
└── middleware/
    └── auth.ts           # 认证/授权中间件
```

## 核心概念

### tRPC 架构

```typescript
// 1. 定义包含服务的 context
export async function createContext({ req, res }) {
  const user = extractUserFromToken(req);
  const traceId = req.headers['x-trace-id'] || randomUUID();
  return { req, res, user, traceId, services };
}

// 2. 使用 context 初始化 tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

// 3. 创建 procedures
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(authMiddleware);
export const adminProcedure = protectedProcedure.use(adminMiddleware);

// 4. 创建 routers
export const authRouter = router({
  login: publicProcedure
    .input(z.object({ email: z.string(), password: z.string() }))
    .mutation(async ({ input }) => {
      // 实现逻辑
    }),
});
```

### Procedure 类型

- **publicProcedure**：无需认证
- **protectedProcedure**：需要有效的 JWT token
- **adminProcedure**：需要管理员角色

### Router 结构

每个 router 遵循一致的模式：

```typescript
export const exampleRouter = router({
  // Query - 读操作
  list: protectedProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(10) }))
    .query(async ({ input, ctx }) => {
      return {
        code: 200,
        message: 'success',
        data: { list: [], total: 0, page: input.page, limit: input.limit },
      };
    }),

  // Mutation - 写操作
  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return { code: 200, message: '创建成功', data: { id: 'new-id' } };
    }),
});
```

## 可用路由（12 个模块，100+ 端点）

| Router | 端点数 | 描述 |
|--------|--------|------|
| auth | 8 | 登录、注册、令牌刷新、登出、密码管理 |
| users | 8 | 用户增删改查、角色/状态管理 |
| dashboard | 9 | 统计数据、趋势、活动、任务 |
| permissions | 7 | 权限增删改查、树结构、模块 |
| roles | 8 | 角色增删改查、权限分配 |
| teams | 9 | 团队增删改查、成员管理 |
| folders | 8 | 文件夹增删改查、树、移动、面包屑 |
| files | 9 | 文件增删改查、上传、下载、移动、复制 |
| documents | 10 | 文档增删改查、版本、分享 |
| calendar | 10 | 事件增删改查、参与者、RSVP |
| notifications | 7 | 列表、未读数、标记已读、删除 |
| messages | 9 | 对话、消息、发送、已读状态 |

## 认证流程

### JWT Token 结构

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

### Token 使用

```typescript
// 客户端在 Authorization 头中发送 token
Authorization: Bearer <jwt-token>

// 服务器在 context.ts 中提取和验证
const token = req.headers.authorization?.split(' ')[1];
const user = jwt.verify(token, JWT_SECRET);
```

### 权限系统

- `*` - 所有权限（管理员）
- `module:*` - 模块的所有操作（例如：`users:*`）
- `module:action` - 特定操作（例如：`users:view`、`users:create`）

## 服务层

### HTTP 客户端

```typescript
// 为后端服务创建客户端
const client = serviceRegistry.getClient('python');

// 发起请求（自动重试和超时）
const response = await client.get('/api/users', { query: { page: 1 } });
const created = await client.post('/api/users', { name: 'John' });
```

### 服务注册表

```typescript
// 通过环境变量配置后端服务
HALOLIGHT_API_PYTHON_URL=http://api-python:8000
HALOLIGHT_API_BUN_URL=http://api-bun:3000
HALOLIGHT_API_NESTJS_URL=http://api-nestjs:3001

// 在 routers 中通过 context 访问
const client = ctx.services.getDefault(); // 使用最高优先级服务
const pythonClient = ctx.services.get('python');
```

## 添加新功能

### 1. 创建新 Router

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
      // 使用 ctx.services 调用后端 API
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
      return { code: 200, message: '产品已创建', data: created };
    }),
});
```

### 2. 在根 Router 中注册

```typescript
// src/routers/index.ts
import { productsRouter } from './products';

export const appRouter = router({
  // ... 现有 routers
  products: productsRouter,
});
```

## 错误处理

### tRPC 错误代码

```typescript
import { TRPCError } from '@trpc/server';

throw new TRPCError({ code: 'UNAUTHORIZED', message: '未认证' });      // 401
throw new TRPCError({ code: 'FORBIDDEN', message: '权限不足' });  // 403
throw new TRPCError({ code: 'BAD_REQUEST', message: '无效输入' });           // 400
throw new TRPCError({ code: 'NOT_FOUND', message: '资源未找到' });        // 404
throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '服务器错误' });  // 500
```

## 响应格式

所有 API 响应遵循一致的格式：

```typescript
interface APIResponse<T> {
  code: number;        // HTTP 状态码
  message: string;     // 人类可读消息
  data: T | null;      // 响应数据
}

// 分页响应
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

## 环境变量

### 必需配置

```bash
JWT_SECRET=your-secret-key        # 生产环境必须修改（32+ 字符）
PORT=3002                          # 服务器端口
```

### 可选配置

```bash
HOST=0.0.0.0                       # 服务器主机
NODE_ENV=development               # 环境
CORS_ORIGIN=*                      # CORS 允许的源
JWT_EXPIRES_IN=7d                  # Token 过期时间
LOG_LEVEL=info                     # 日志级别

# 后端服务
HALOLIGHT_API_PYTHON_URL=http://localhost:8000
HALOLIGHT_API_BUN_URL=http://localhost:3000
HALOLIGHT_API_JAVA_URL=http://localhost:8080
HALOLIGHT_API_NESTJS_URL=http://localhost:3001
HALOLIGHT_API_NODE_URL=http://localhost:3003
HALOLIGHT_API_GO_URL=http://localhost:8081
```

## 数据库集成（未来）

当前使用模拟数据。集成真实数据库：

1. **安装 ORM**（推荐 Prisma）
   ```bash
   pnpm add @prisma/client
   pnpm add -D prisma
   ```

2. **初始化 Prisma**
   ```bash
   pnpx prisma init
   ```

3. **添加到 context**
   ```typescript
   import { PrismaClient } from '@prisma/client';
   const prisma = new PrismaClient();

   export async function createContext({ req, res }) {
     return { req, res, user, prisma, services };
   }
   ```

## 客户端使用

### React 配合 @tanstack/react-query

```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from 'halolight-bff';

const trpc = createTRPCReact<AppRouter>();

function UserList() {
  const { data, isLoading } = trpc.users.list.useQuery({ page: 1 });
  if (isLoading) return <div>加载中...</div>;
  return <div>{data?.data.list.map(user => <div key={user.id}>{user.name}</div>)}</div>;
}
```

### Next.js App Router

```typescript
// 服务器组件
import { createCaller } from '@trpc/server';
import { appRouter } from './routers';

export default async function Page() {
  const caller = createCaller({ req: {}, res: {}, user: null });
  const data = await caller.dashboard.getStats();
  return <div>{JSON.stringify(data)}</div>;
}
```

## 安全最佳实践

1. **始终验证输入** - 使用 Zod schemas
2. **不暴露敏感数据** - 错误消息中不包含敏感信息（生产环境）
3. **使用 HTTPS** - 生产环境必须
4. **实施限流** - 防止滥用
5. **清理用户输入** - 防止注入攻击
6. **使用安全的 JWT 密钥** - 至少 32 字符
7. **启用 CORS** - 仅针对信任的源
8. **定期更新依赖** - 保持最新

## 故障排查

### 常见问题

1. **端口已被占用**：修改 .env 中的 PORT 或终止占用端口的进程
2. **CORS 错误**：更新 .env 中的 CORS_ORIGIN
3. **Token 验证失败**：确保 JWT_SECRET 在各环境中一致
4. **类型错误**：运行 `pnpm type-check` 识别问题
5. **构建失败**：检查未使用的变量（已启用 noUnusedLocals）

## 贡献指南

1. 遵循现有的代码结构
2. 添加适当的 TypeScript 类型
3. 使用 Zod 验证所有输入
4. 使用 TRPCError 进行一致的错误处理
5. 遵循响应格式约定
6. 添加功能时更新文档

## 资源

- [tRPC 文档](https://trpc.io/docs)
- [Zod 文档](https://zod.dev/)
- [Express 文档](https://expressjs.com/)
- [JWT 最佳实践](https://tools.ietf.org/html/rfc8725)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
