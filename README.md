# HaloLight BFF 网关

> 基于 tRPC 构建的前端后端网关 (BFF) 层，为 HaloLight 前端应用提供统一的类型安全 API。

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![tRPC](https://img.shields.io/badge/tRPC-11.0+-blueviolet.svg)](https://trpc.io/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

## 概述

HaloLight BFF 是基于 tRPC 的前端后端服务，作为前端应用和后端服务之间的 API 网关。它提供：

- **类型安全 API**：从服务器到客户端的完整 TypeScript 类型推导
- **统一接口**：单一 API 层聚合多个后端服务
- **身份认证**：基于 JWT 的认证和授权
- **12 个业务模块**：100+ 端点覆盖所有常见业务场景
- **服务注册**：支持多个后端服务（Python、Bun、Java、NestJS、Node、Go）

## 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端应用程序                               │
│        (Next.js, Vue, Angular, React, Nuxt 等)                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │ tRPC 客户端（类型安全）
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   HaloLight BFF 网关 (tRPC)                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  认证   │ │  用户   │ │仪表盘   │ │  角色   │ │  团队   │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │文件夹   │ │  文件   │ │  文档   │ │  日历   │ │  消息   │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP 客户端（带重试和超时）
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
      ┌──────────┐      ┌──────────┐      ┌──────────┐
      │  Python  │      │   Bun    │      │  NestJS  │
      │   API    │      │   API    │      │   API    │
      └──────────┘      └──────────┘      └──────────┘
```

## 功能特性

### 业务模块（12 个路由，100+ 端点）

| 模块 | 端点数 | 描述 |
|------|--------|------|
| **auth** | 8 | 登录、注册、令牌刷新、登出、密码管理 |
| **users** | 8 | 用户增删改查、角色/状态管理、分页 |
| **dashboard** | 9 | 统计数据、趋势、活动、任务、系统概览 |
| **permissions** | 7 | 权限增删改查、树结构、模块列表 |
| **roles** | 8 | 角色增删改查、权限分配 |
| **teams** | 9 | 团队增删改查、成员管理、角色更新 |
| **folders** | 8 | 文件夹增删改查、树结构、移动、面包屑 |
| **files** | 9 | 文件增删改查、上传、下载、移动、复制、批量删除 |
| **documents** | 10 | 文档增删改查、版本历史、分享、恢复 |
| **calendar** | 10 | 事件增删改查、参与者、RSVP |
| **notifications** | 7 | 列表、未读数、标记已读、删除 |
| **messages** | 9 | 对话、消息、发送、已读状态 |

### 基础设施

- **HTTP 客户端**：统一客户端，支持重试、超时和 Zod 响应验证
- **服务注册表**：多后端支持，基于优先级的路由
- **Context 增强**：TraceId 追踪、服务客户端注入
- **通用 Schemas**：可复用的 Zod schemas（分页、排序、响应）

### 安全性

- 基于 JWT 的认证和角色访问控制 (RBAC)
- 基于权限的授权 (`*`、`module:*`、`module:action`)
- Helmet.js 安全头
- CORS 配置
- Zod 请求验证

## 前置要求

- **Node.js**: >= 20.0.0
- **pnpm**: >= 8.0.0
- **TypeScript**: >= 5.9.0

## 安装

```bash
# 克隆仓库
git clone https://github.com/halolight/halolight-bff.git
cd halolight-bff

# 安装依赖
pnpm install

# 复制环境变量
cp .env.example .env

# 启动开发服务器
pnpm dev
```

## 配置

### 环境变量

```bash
# 服务器配置
PORT=3002
HOST=0.0.0.0
NODE_ENV=development

# CORS 配置
CORS_ORIGIN=*

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# 日志
LOG_LEVEL=info

# 后端服务（可选 - 用于 API 聚合）
HALOLIGHT_API_PYTHON_URL=http://localhost:8000
HALOLIGHT_API_BUN_URL=http://localhost:3000
HALOLIGHT_API_JAVA_URL=http://localhost:8080
HALOLIGHT_API_NESTJS_URL=http://localhost:3001
HALOLIGHT_API_NODE_URL=http://localhost:3003
HALOLIGHT_API_GO_URL=http://localhost:8081
```

## 使用

### 开发模式

```bash
pnpm dev          # 启动热重载开发服务器
```

服务器将在 `http://localhost:3002` 可用

### 生产模式

```bash
pnpm build        # 构建 TypeScript
pnpm start        # 启动生产服务器
```

### 其他命令

```bash
pnpm lint         # 代码检查
pnpm format       # 代码格式化
pnpm type-check   # 类型检查
```

## API 示例

### 认证

```typescript
// 登录
const result = await trpc.auth.login.mutate({
  email: 'user@example.com',
  password: 'password123',
});
// 返回: { code: 200, message: '登录成功', data: { user, token, expiresIn } }

// 获取当前用户
const user = await trpc.auth.getCurrentUser.query();

// 刷新令牌
const newToken = await trpc.auth.refreshToken.mutate();
```

### 用户管理

```typescript
// 分页查询用户列表
const users = await trpc.users.list.query({
  page: 1,
  limit: 10,
  search: 'john',
  role: 'admin',
  status: 'active',
});

// 创建用户（仅管理员）
const newUser = await trpc.users.create.mutate({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'securePassword123',
  role: 'editor',
});
```

### 文档管理

```typescript
// 查询文档列表
const docs = await trpc.documents.list.query({
  folderId: 'folder-1',
  status: 'published',
  tags: ['important'],
});

// 创建文档
const doc = await trpc.documents.create.mutate({
  title: '项目规范',
  content: '# 项目概述\n\n...',
  folderId: 'folder-docs',
  status: 'draft',
  tags: ['project', 'spec'],
});

// 获取版本历史
const versions = await trpc.documents.getVersions.query({ documentId: 'doc-1' });

// 恢复到之前版本
await trpc.documents.restoreVersion.mutate({ documentId: 'doc-1', version: 2 });
```

### 日历

```typescript
// 查询日期范围内的事件
const events = await trpc.calendar.list.query({
  start: '2024-01-01T00:00:00Z',
  end: '2024-01-31T23:59:59Z',
});

// 创建事件
const event = await trpc.calendar.create.mutate({
  title: '团队会议',
  start: '2024-01-15T10:00:00Z',
  end: '2024-01-15T11:00:00Z',
  location: '会议室 A',
  recurrence: 'weekly',
});

// RSVP
await trpc.calendar.updateAttendeeStatus.mutate({
  eventId: 'event-1',
  status: 'accepted',
});
```

## 客户端集成

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

### React Query 集成

```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from 'halolight-bff';

export const trpc = createTRPCReact<AppRouter>();

// 在组件中使用
function UserList() {
  const { data, isLoading } = trpc.users.list.useQuery({ page: 1 });

  if (isLoading) return <div>加载中...</div>;
  return (
    <ul>
      {data?.data.list.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## 项目结构

```
src/
├── index.ts              # 入口文件
├── server.ts             # Express 服务器配置
├── trpc.ts               # tRPC 实例和 procedures
├── context.ts            # Context 创建（用户、traceId、服务）
├── schemas/
│   ├── index.ts          # Schema 导出
│   └── common.ts         # 通用 Zod schemas
├── services/
│   ├── index.ts          # Service 导出
│   ├── httpClient.ts     # 后端服务 HTTP 客户端
│   └── serviceRegistry.ts # 后端服务注册表
├── routers/
│   ├── index.ts          # 根路由
│   ├── auth.ts           # 认证
│   ├── users.ts          # 用户管理
│   ├── dashboard.ts      # 仪表盘统计
│   ├── permissions.ts    # 权限管理
│   ├── roles.ts          # 角色管理
│   ├── teams.ts          # 团队管理
│   ├── folders.ts        # 文件夹管理
│   ├── files.ts          # 文件管理
│   ├── documents.ts      # 文档管理
│   ├── calendar.ts       # 日历事件
│   ├── notifications.ts  # 通知
│   └── messages.ts       # 消息
└── middleware/
    └── auth.ts           # 认证中间件
```

## 部署

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

## 路线图

- [x] 核心路由（认证、用户、仪表盘）
- [x] 权限和角色管理
- [x] 团队管理
- [x] 文件和文档管理
- [x] 日历和通知
- [x] 消息系统
- [x] 带重试/超时的 HTTP 客户端
- [x] 多后端服务注册表
- [ ] 数据库集成（Prisma）
- [ ] 实时 WebSocket 支持
- [ ] Redis 缓存层
- [ ] 限流
- [ ] 完整测试套件
- [ ] OpenAPI 文档

## 贡献

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m '添加某个功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

## 许可证

ISC

## 相关链接

- [文档](https://docs.halolight.h7ml.cn)
- [GitHub 仓库](https://github.com/halolight/halolight-bff)
- [tRPC 文档](https://trpc.io)
- [问题追踪](https://github.com/halolight/halolight-bff/issues)

---

由 HaloLight 团队使用 TypeScript、tRPC 和 Express 构建
