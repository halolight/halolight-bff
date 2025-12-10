import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './context';
import { serviceRegistry } from './services';

const APP_VERSION = '1.0.0';
const APP_NAME = 'HaloLight BFF Gateway';

/**
 * Generate HTML homepage
 */
function getHomePage(): string {
  const environment = process.env.NODE_ENV || 'development';
  const port = process.env.PORT || 3002;
  const baseUrl = environment === 'production' ? 'https://halolight-bff.h7ml.cn' : `http://localhost:${port}`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="HaloLight BFF Gateway - tRPC-based Backend for Frontend providing type-safe APIs">
  <meta name="keywords" content="HaloLight, BFF, tRPC, TypeScript, API Gateway, Type-Safe">
  <title>${APP_NAME} | Enterprise tRPC Gateway</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '#3b82f6',
            secondary: '#8b5cf6',
            accent: '#06b6d4',
          }
        }
      }
    }
  </script>
  <style>
    :root {
      --primary: #3b82f6;
      --secondary: #8b5cf6;
      --accent: #06b6d4;
      --gradient: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 50%, var(--accent) 100%);
    }
    .bg-gradient-animated::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
                  radial-gradient(circle at 70% 70%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
      animation: rotate 30s linear infinite;
    }
    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .text-gradient {
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .bg-gradient-brand { background: var(--gradient); }
    .btn-gradient {
      background: var(--gradient);
      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
    }
    .btn-gradient:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
    }
    .card-hover:hover {
      border-color: var(--primary);
      transform: translateY(-4px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }
    .module-hover:hover {
      border-color: var(--primary);
      background: rgba(59, 130, 246, 0.1);
    }
  </style>
</head>
<body class="bg-slate-900 text-slate-50 min-h-screen overflow-x-hidden font-sans">
  <div class="fixed inset-0 bg-slate-900 -z-10 bg-gradient-animated"></div>

  <!-- Navigation -->
  <nav class="fixed top-0 left-0 right-0 z-50 py-4 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50">
    <div class="max-w-7xl mx-auto px-6 flex justify-between items-center">
      <div class="text-2xl font-bold text-gradient">⚡ ${APP_NAME}</div>
      <div class="hidden md:flex items-center gap-6">
        <a href="#features" class="text-slate-400 hover:text-white text-sm font-medium transition-colors">Features</a>
        <a href="#modules" class="text-slate-400 hover:text-white text-sm font-medium transition-colors">Modules</a>
        <a href="/docs" class="text-slate-400 hover:text-white text-sm font-medium transition-colors">API Docs</a>
        <a href="https://github.com/halolight/halolight-bff" target="_blank" class="text-slate-400 hover:text-white text-sm font-medium transition-colors">GitHub</a>
        <span class="px-3 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">v${APP_VERSION}</span>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="min-h-screen flex items-center pt-20">
    <div class="max-w-7xl mx-auto px-6">
      <div class="max-w-3xl">
        <div class="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700/50 rounded-full text-sm text-slate-400 mb-6">
          <span class="text-blue-500">⚡</span> Enterprise-Grade tRPC Gateway
        </div>
        <h1 class="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
          类型安全的 API Gateway<br>
          <span class="text-gradient">端到端类型保障</span>
        </h1>
        <p class="text-xl text-slate-400 leading-relaxed mb-8">
          基于 tRPC 11 + Express 5 的企业级 BFF 网关，提供完整的类型安全、JWT 认证、
          服务注册、请求追踪，100+ API 端点开箱即用。
        </p>
        <div class="flex flex-col sm:flex-row gap-4 mb-12">
          <a href="/docs" class="btn-gradient inline-flex items-center justify-center gap-2 px-7 py-4 text-white font-semibold rounded-xl transition-all">
            📖 查看 API 文档
          </a>
          <a href="https://halolight.docs.h7ml.cn/guide/bff" class="inline-flex items-center justify-center gap-2 px-7 py-4 bg-slate-800/80 text-white font-semibold rounded-xl border border-slate-700/50 hover:border-primary hover:bg-slate-800 transition-all" target="_blank">
            📚 使用指南
          </a>
          <a href="/health" class="inline-flex items-center justify-center gap-2 px-7 py-4 bg-slate-800/80 text-white font-semibold rounded-xl border border-slate-700/50 hover:border-primary hover:bg-slate-800 transition-all">
            💚 健康检查
          </a>
        </div>
        <!-- Tech Stack -->
        <div class="flex flex-wrap gap-3 pt-8 border-t border-slate-700/50">
          <div class="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700/50 rounded-lg text-sm text-slate-400">
            <span>⚡</span> tRPC 11
          </div>
          <div class="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700/50 rounded-lg text-sm text-slate-400">
            <span>🚀</span> Express 5
          </div>
          <div class="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700/50 rounded-lg text-sm text-slate-400">
            <span>📘</span> TypeScript 5.9
          </div>
          <div class="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700/50 rounded-lg text-sm text-slate-400">
            <span>✅</span> Zod Validation
          </div>
          <div class="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700/50 rounded-lg text-sm text-slate-400">
            <span>📦</span> SuperJSON
          </div>
        </div>
        <div class="mt-6 text-sm text-slate-500">
          Base URL: <code class="text-cyan-400 bg-slate-800/50 px-2 py-1 rounded">${baseUrl}/trpc</code>
        </div>
      </div>
    </div>
  </section>

  <!-- Stats Section -->
  <section class="py-16">
    <div class="max-w-7xl mx-auto px-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div class="text-center p-8 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
          <div class="text-5xl font-extrabold text-gradient mb-2">12</div>
          <div class="text-slate-400">业务模块</div>
        </div>
        <div class="text-center p-8 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
          <div class="text-5xl font-extrabold text-gradient mb-2">100+</div>
          <div class="text-slate-400">API 端点</div>
        </div>
        <div class="text-center p-8 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
          <div class="text-5xl font-extrabold text-gradient mb-2">100%</div>
          <div class="text-slate-400">类型安全</div>
        </div>
        <div class="text-center p-8 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
          <div class="text-5xl font-extrabold text-gradient mb-2">MIT</div>
          <div class="text-slate-400">开源协议</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section id="features" class="py-24">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold mb-4">核心特性</h2>
        <p class="text-slate-400 text-lg max-w-2xl mx-auto">企业级 tRPC 网关，开箱即用的完整解决方案</p>
      </div>
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="p-8 bg-slate-800/50 border border-slate-700/50 rounded-2xl transition-all card-hover">
          <div class="w-12 h-12 flex items-center justify-center bg-gradient-brand rounded-xl text-2xl mb-5">⚡</div>
          <h3 class="text-xl font-semibold mb-3">端到端类型安全</h3>
          <p class="text-slate-400 leading-relaxed">tRPC 提供从服务器到客户端的完整类型推导，零运行时开销，编译时即可发现错误。</p>
        </div>
        <div class="p-8 bg-slate-800/50 border border-slate-700/50 rounded-2xl transition-all card-hover">
          <div class="w-12 h-12 flex items-center justify-center bg-gradient-brand rounded-xl text-2xl mb-5">🔐</div>
          <h3 class="text-xl font-semibold mb-3">JWT 认证授权</h3>
          <p class="text-slate-400 leading-relaxed">内置 JWT Token 验证、RBAC 权限控制，支持通配符权限（users:*, *），灵活的中间件机制。</p>
        </div>
        <div class="p-8 bg-slate-800/50 border border-slate-700/50 rounded-2xl transition-all card-hover">
          <div class="w-12 h-12 flex items-center justify-center bg-gradient-brand rounded-xl text-2xl mb-5">✅</div>
          <h3 class="text-xl font-semibold mb-3">Zod 数据验证</h3>
          <p class="text-slate-400 leading-relaxed">所有输入自动验证，详细的错误消息，支持复杂的嵌套结构和自定义验证规则。</p>
        </div>
        <div class="p-8 bg-slate-800/50 border border-slate-700/50 rounded-2xl transition-all card-hover">
          <div class="w-12 h-12 flex items-center justify-center bg-gradient-brand rounded-xl text-2xl mb-5">🔄</div>
          <h3 class="text-xl font-semibold mb-3">服务注册发现</h3>
          <p class="text-slate-400 leading-relaxed">支持多个后端服务，自动故障转移和健康检查，灵活的服务优先级配置。</p>
        </div>
        <div class="p-8 bg-slate-800/50 border border-slate-700/50 rounded-2xl transition-all card-hover">
          <div class="w-12 h-12 flex items-center justify-center bg-gradient-brand rounded-xl text-2xl mb-5">📊</div>
          <h3 class="text-xl font-semibold mb-3">请求追踪日志</h3>
          <p class="text-slate-400 leading-relaxed">分布式追踪支持，Trace ID 自动传播，Pino 高性能日志，生产环境 JSON 格式。</p>
        </div>
        <div class="p-8 bg-slate-800/50 border border-slate-700/50 rounded-2xl transition-all card-hover">
          <div class="w-12 h-12 flex items-center justify-center bg-gradient-brand rounded-xl text-2xl mb-5">📦</div>
          <h3 class="text-xl font-semibold mb-3">SuperJSON 序列化</h3>
          <p class="text-slate-400 leading-relaxed">自动处理 Date、Map、Set、BigInt 等复杂类型，保持数据完整性和类型信息。</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Modules Section -->
  <section id="modules" class="py-24">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold mb-4">API 模块</h2>
        <p class="text-slate-400 text-lg max-w-2xl mx-auto">12 个核心业务模块，覆盖企业应用场景</p>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <a href="/docs#auth" class="p-5 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-center gap-4 transition-all module-hover no-underline">
          <div class="text-2xl">🔑</div>
          <div><h4 class="font-semibold text-white">Auth</h4><span class="text-sm text-slate-400">8 个端点</span></div>
        </a>
        <a href="/docs#users" class="p-5 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-center gap-4 transition-all module-hover no-underline">
          <div class="text-2xl">👥</div>
          <div><h4 class="font-semibold text-white">Users</h4><span class="text-sm text-slate-400">8 个端点</span></div>
        </a>
        <a href="/docs#dashboard" class="p-5 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-center gap-4 transition-all module-hover no-underline">
          <div class="text-2xl">📊</div>
          <div><h4 class="font-semibold text-white">Dashboard</h4><span class="text-sm text-slate-400">9 个端点</span></div>
        </a>
        <a href="/docs#permissions" class="p-5 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-center gap-4 transition-all module-hover no-underline">
          <div class="text-2xl">🔒</div>
          <div><h4 class="font-semibold text-white">Permissions</h4><span class="text-sm text-slate-400">7 个端点</span></div>
        </a>
        <a href="/docs#roles" class="p-5 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-center gap-4 transition-all module-hover no-underline">
          <div class="text-2xl">🎭</div>
          <div><h4 class="font-semibold text-white">Roles</h4><span class="text-sm text-slate-400">8 个端点</span></div>
        </a>
        <a href="/docs#teams" class="p-5 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-center gap-4 transition-all module-hover no-underline">
          <div class="text-2xl">🏢</div>
          <div><h4 class="font-semibold text-white">Teams</h4><span class="text-sm text-slate-400">9 个端点</span></div>
        </a>
        <a href="/docs#folders" class="p-5 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-center gap-4 transition-all module-hover no-underline">
          <div class="text-2xl">📂</div>
          <div><h4 class="font-semibold text-white">Folders</h4><span class="text-sm text-slate-400">8 个端点</span></div>
        </a>
        <a href="/docs#files" class="p-5 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-center gap-4 transition-all module-hover no-underline">
          <div class="text-2xl">📁</div>
          <div><h4 class="font-semibold text-white">Files</h4><span class="text-sm text-slate-400">9 个端点</span></div>
        </a>
        <a href="/docs#documents" class="p-5 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-center gap-4 transition-all module-hover no-underline">
          <div class="text-2xl">📄</div>
          <div><h4 class="font-semibold text-white">Documents</h4><span class="text-sm text-slate-400">10 个端点</span></div>
        </a>
        <a href="/docs#calendar" class="p-5 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-center gap-4 transition-all module-hover no-underline">
          <div class="text-2xl">📅</div>
          <div><h4 class="font-semibold text-white">Calendar</h4><span class="text-sm text-slate-400">10 个端点</span></div>
        </a>
        <a href="/docs#notifications" class="p-5 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-center gap-4 transition-all module-hover no-underline">
          <div class="text-2xl">🔔</div>
          <div><h4 class="font-semibold text-white">Notifications</h4><span class="text-sm text-slate-400">7 个端点</span></div>
        </a>
        <a href="/docs#messages" class="p-5 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-center gap-4 transition-all module-hover no-underline">
          <div class="text-2xl">💬</div>
          <div><h4 class="font-semibold text-white">Messages</h4><span class="text-sm text-slate-400">9 个端点</span></div>
        </a>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="py-24">
    <div class="max-w-7xl mx-auto px-6">
      <div class="relative p-16 bg-gradient-brand rounded-3xl overflow-hidden">
        <div class="relative text-center">
          <h2 class="text-4xl font-bold mb-4 text-white">开始使用 HaloLight BFF</h2>
          <p class="text-lg opacity-90 mb-8 text-white">查看完整文档，快速集成到你的项目中</p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/docs" class="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:shadow-xl transition-all">
              📖 tRPC 文档
            </a>
            <a href="https://halolight.docs.h7ml.cn/guide/bff" class="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/20 text-white font-semibold rounded-xl border border-white/40 hover:bg-white/30 transition-all" target="_blank">
              📚 完整使用指南
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-12 border-t border-slate-700/50">
    <div class="max-w-7xl mx-auto px-6 text-center">
      <div class="flex flex-wrap justify-center gap-8 mb-6">
        <a href="/docs" class="text-slate-400 hover:text-white text-sm transition-colors">API 文档</a>
        <a href="https://halolight.docs.h7ml.cn/guide/bff" target="_blank" class="text-slate-400 hover:text-white text-sm transition-colors">使用指南</a>
        <a href="https://github.com/halolight/halolight-bff" target="_blank" class="text-slate-400 hover:text-white text-sm transition-colors">GitHub</a>
        <a href="https://github.com/halolight/halolight-bff/issues" target="_blank" class="text-slate-400 hover:text-white text-sm transition-colors">问题反馈</a>
      </div>
      <p class="text-slate-400 text-sm">
        Built with ❤️ by <a href="https://github.com/h7ml" target="_blank" class="text-blue-400 hover:underline">h7ml</a> |
        Powered by tRPC 11 & Express 5
      </p>
      <p class="text-slate-500 text-sm mt-2">
        Version ${APP_VERSION} | Environment: ${environment} | Port: ${port}
      </p>
    </div>
  </footer>
</body>
</html>`;
}

/**
 * API Documentation data
 */
const API_DOCS = {
  auth: {
    name: 'Authentication',
    description: 'User authentication and authorization',
    endpoints: [
      { name: 'login', type: 'mutation', desc: 'User login with email and password', input: '{ email: string, password: string }', output: '{ user, token, expiresIn }' },
      { name: 'register', type: 'mutation', desc: 'Register a new user account', input: '{ name: string, email: string, password: string }', output: '{ user, token }' },
      { name: 'logout', type: 'mutation', desc: 'Logout current user', input: 'void', output: '{ success: boolean }' },
      { name: 'refreshToken', type: 'mutation', desc: 'Refresh JWT token', input: 'void', output: '{ token, expiresIn }' },
      { name: 'getCurrentUser', type: 'query', desc: 'Get current authenticated user', input: 'void', output: '{ user }' },
      { name: 'forgotPassword', type: 'mutation', desc: 'Request password reset email', input: '{ email: string }', output: '{ success: boolean }' },
      { name: 'resetPassword', type: 'mutation', desc: 'Reset password with token', input: '{ token: string, password: string }', output: '{ success: boolean }' },
      { name: 'changePassword', type: 'mutation', desc: 'Change current user password', input: '{ currentPassword: string, newPassword: string }', output: '{ success: boolean }' },
    ],
  },
  users: {
    name: 'Users',
    description: 'User management operations',
    endpoints: [
      { name: 'list', type: 'query', desc: 'List users with pagination', input: '{ page?, limit?, search?, role?, status? }', output: '{ list: User[], total, page, limit }' },
      { name: 'getById', type: 'query', desc: 'Get user by ID', input: '{ id: string }', output: '{ user }' },
      { name: 'create', type: 'mutation', desc: 'Create a new user', input: '{ name, email, password, role? }', output: '{ user }' },
      { name: 'update', type: 'mutation', desc: 'Update user information', input: '{ id, name?, email?, avatar? }', output: '{ user }' },
      { name: 'delete', type: 'mutation', desc: 'Delete a user', input: '{ id: string }', output: '{ success: boolean }' },
      { name: 'updateRole', type: 'mutation', desc: 'Update user role', input: '{ id: string, roleId: string }', output: '{ user }' },
      { name: 'updateStatus', type: 'mutation', desc: 'Update user status', input: '{ id: string, status: string }', output: '{ user }' },
      { name: 'batchDelete', type: 'mutation', desc: 'Delete multiple users', input: '{ ids: string[] }', output: '{ deletedCount: number }' },
    ],
  },
  dashboard: {
    name: 'Dashboard',
    description: 'Dashboard statistics and analytics',
    endpoints: [
      { name: 'getStats', type: 'query', desc: 'Get overview statistics', input: 'void', output: '{ totalUsers, totalDocuments, ... }' },
      { name: 'getUserTrends', type: 'query', desc: 'Get user growth trends', input: '{ period?: string }', output: '{ data: TrendPoint[] }' },
      { name: 'getDocumentTrends', type: 'query', desc: 'Get document trends', input: '{ period?: string }', output: '{ data: TrendPoint[] }' },
      { name: 'getRecentActivities', type: 'query', desc: 'Get recent activities', input: '{ limit?: number }', output: '{ activities: Activity[] }' },
      { name: 'getTopUsers', type: 'query', desc: 'Get most active users', input: '{ limit?: number }', output: '{ users: User[] }' },
      { name: 'getSystemHealth', type: 'query', desc: 'Get system health status', input: 'void', output: '{ cpu, memory, disk, ... }' },
      { name: 'getStorageUsage', type: 'query', desc: 'Get storage usage stats', input: 'void', output: '{ used, total, percentage }' },
      { name: 'getPendingTasks', type: 'query', desc: 'Get pending tasks', input: '{ limit?: number }', output: '{ tasks: Task[] }' },
      { name: 'getNotificationSummary', type: 'query', desc: 'Get notification summary', input: 'void', output: '{ unread, total, ... }' },
    ],
  },
  permissions: {
    name: 'Permissions',
    description: 'Permission management',
    endpoints: [
      { name: 'list', type: 'query', desc: 'List all permissions', input: '{ module?: string }', output: '{ list: Permission[] }' },
      { name: 'getById', type: 'query', desc: 'Get permission by ID', input: '{ id: string }', output: '{ permission }' },
      { name: 'create', type: 'mutation', desc: 'Create a permission', input: '{ name, code, module, description? }', output: '{ permission }' },
      { name: 'update', type: 'mutation', desc: 'Update a permission', input: '{ id, name?, description? }', output: '{ permission }' },
      { name: 'delete', type: 'mutation', desc: 'Delete a permission', input: '{ id: string }', output: '{ success: boolean }' },
      { name: 'getTree', type: 'query', desc: 'Get permissions as tree', input: 'void', output: '{ tree: PermissionNode[] }' },
      { name: 'getModules', type: 'query', desc: 'Get all modules', input: 'void', output: '{ modules: string[] }' },
    ],
  },
  roles: {
    name: 'Roles',
    description: 'Role management',
    endpoints: [
      { name: 'list', type: 'query', desc: 'List all roles', input: '{ page?, limit? }', output: '{ list: Role[], total }' },
      { name: 'getById', type: 'query', desc: 'Get role by ID', input: '{ id: string }', output: '{ role }' },
      { name: 'create', type: 'mutation', desc: 'Create a role', input: '{ name, label, permissions }', output: '{ role }' },
      { name: 'update', type: 'mutation', desc: 'Update a role', input: '{ id, name?, label?, permissions? }', output: '{ role }' },
      { name: 'delete', type: 'mutation', desc: 'Delete a role', input: '{ id: string }', output: '{ success: boolean }' },
      { name: 'assignPermissions', type: 'mutation', desc: 'Assign permissions to role', input: '{ roleId, permissionIds }', output: '{ role }' },
      { name: 'getPermissions', type: 'query', desc: 'Get role permissions', input: '{ roleId: string }', output: '{ permissions: Permission[] }' },
      { name: 'getUsers', type: 'query', desc: 'Get users with role', input: '{ roleId: string }', output: '{ users: User[] }' },
    ],
  },
  teams: {
    name: 'Teams',
    description: 'Team management',
    endpoints: [
      { name: 'list', type: 'query', desc: 'List all teams', input: '{ page?, limit?, search? }', output: '{ list: Team[], total }' },
      { name: 'getById', type: 'query', desc: 'Get team by ID', input: '{ id: string }', output: '{ team }' },
      { name: 'create', type: 'mutation', desc: 'Create a team', input: '{ name, description? }', output: '{ team }' },
      { name: 'update', type: 'mutation', desc: 'Update a team', input: '{ id, name?, description? }', output: '{ team }' },
      { name: 'delete', type: 'mutation', desc: 'Delete a team', input: '{ id: string }', output: '{ success: boolean }' },
      { name: 'getMembers', type: 'query', desc: 'Get team members', input: '{ teamId: string }', output: '{ members: User[] }' },
      { name: 'addMember', type: 'mutation', desc: 'Add member to team', input: '{ teamId, userId, role? }', output: '{ member }' },
      { name: 'removeMember', type: 'mutation', desc: 'Remove member from team', input: '{ teamId, userId }', output: '{ success: boolean }' },
      { name: 'updateMemberRole', type: 'mutation', desc: 'Update member role', input: '{ teamId, userId, role }', output: '{ member }' },
    ],
  },
  folders: {
    name: 'Folders',
    description: 'Folder management',
    endpoints: [
      { name: 'list', type: 'query', desc: 'List folders', input: '{ parentId?, page?, limit? }', output: '{ list: Folder[], total }' },
      { name: 'getById', type: 'query', desc: 'Get folder by ID', input: '{ id: string }', output: '{ folder }' },
      { name: 'create', type: 'mutation', desc: 'Create a folder', input: '{ name, parentId? }', output: '{ folder }' },
      { name: 'update', type: 'mutation', desc: 'Update a folder', input: '{ id, name? }', output: '{ folder }' },
      { name: 'delete', type: 'mutation', desc: 'Delete a folder', input: '{ id: string }', output: '{ success: boolean }' },
      { name: 'move', type: 'mutation', desc: 'Move folder to new parent', input: '{ id, parentId }', output: '{ folder }' },
      { name: 'getTree', type: 'query', desc: 'Get folder tree', input: '{ rootId?: string }', output: '{ tree: FolderNode[] }' },
      { name: 'getBreadcrumb', type: 'query', desc: 'Get folder breadcrumb', input: '{ id: string }', output: '{ path: Folder[] }' },
    ],
  },
  files: {
    name: 'Files',
    description: 'File management',
    endpoints: [
      { name: 'list', type: 'query', desc: 'List files', input: '{ folderId?, page?, limit?, type? }', output: '{ list: File[], total }' },
      { name: 'getById', type: 'query', desc: 'Get file by ID', input: '{ id: string }', output: '{ file }' },
      { name: 'upload', type: 'mutation', desc: 'Upload a file', input: '{ name, folderId?, content }', output: '{ file }' },
      { name: 'update', type: 'mutation', desc: 'Update file metadata', input: '{ id, name? }', output: '{ file }' },
      { name: 'delete', type: 'mutation', desc: 'Delete a file', input: '{ id: string }', output: '{ success: boolean }' },
      { name: 'move', type: 'mutation', desc: 'Move file to folder', input: '{ id, folderId }', output: '{ file }' },
      { name: 'copy', type: 'mutation', desc: 'Copy file to folder', input: '{ id, folderId }', output: '{ file }' },
      { name: 'download', type: 'query', desc: 'Get file download URL', input: '{ id: string }', output: '{ url: string }' },
      { name: 'batchDelete', type: 'mutation', desc: 'Delete multiple files', input: '{ ids: string[] }', output: '{ deletedCount: number }' },
    ],
  },
  documents: {
    name: 'Documents',
    description: 'Document management',
    endpoints: [
      { name: 'list', type: 'query', desc: 'List documents', input: '{ folderId?, status?, tags?, page?, limit? }', output: '{ list: Document[], total }' },
      { name: 'getById', type: 'query', desc: 'Get document by ID', input: '{ id: string }', output: '{ document }' },
      { name: 'create', type: 'mutation', desc: 'Create a document', input: '{ title, content, folderId?, status?, tags? }', output: '{ document }' },
      { name: 'update', type: 'mutation', desc: 'Update a document', input: '{ id, title?, content?, status?, tags? }', output: '{ document }' },
      { name: 'delete', type: 'mutation', desc: 'Delete a document', input: '{ id: string }', output: '{ success: boolean }' },
      { name: 'publish', type: 'mutation', desc: 'Publish a document', input: '{ id: string }', output: '{ document }' },
      { name: 'archive', type: 'mutation', desc: 'Archive a document', input: '{ id: string }', output: '{ document }' },
      { name: 'getVersions', type: 'query', desc: 'Get document versions', input: '{ documentId: string }', output: '{ versions: Version[] }' },
      { name: 'restoreVersion', type: 'mutation', desc: 'Restore to version', input: '{ documentId, version }', output: '{ document }' },
      { name: 'share', type: 'mutation', desc: 'Share document', input: '{ documentId, userIds, permission }', output: '{ shares: Share[] }' },
    ],
  },
  calendar: {
    name: 'Calendar',
    description: 'Calendar and events',
    endpoints: [
      { name: 'list', type: 'query', desc: 'List events in range', input: '{ start: string, end: string }', output: '{ events: Event[] }' },
      { name: 'getById', type: 'query', desc: 'Get event by ID', input: '{ id: string }', output: '{ event }' },
      { name: 'create', type: 'mutation', desc: 'Create an event', input: '{ title, start, end, location?, recurrence? }', output: '{ event }' },
      { name: 'update', type: 'mutation', desc: 'Update an event', input: '{ id, title?, start?, end?, location? }', output: '{ event }' },
      { name: 'delete', type: 'mutation', desc: 'Delete an event', input: '{ id: string }', output: '{ success: boolean }' },
      { name: 'getAttendees', type: 'query', desc: 'Get event attendees', input: '{ eventId: string }', output: '{ attendees: Attendee[] }' },
      { name: 'addAttendee', type: 'mutation', desc: 'Add attendee to event', input: '{ eventId, userId }', output: '{ attendee }' },
      { name: 'removeAttendee', type: 'mutation', desc: 'Remove attendee', input: '{ eventId, userId }', output: '{ success: boolean }' },
      { name: 'updateAttendeeStatus', type: 'mutation', desc: 'Update RSVP status', input: '{ eventId, status }', output: '{ attendee }' },
      { name: 'getUpcoming', type: 'query', desc: 'Get upcoming events', input: '{ limit?: number }', output: '{ events: Event[] }' },
    ],
  },
  notifications: {
    name: 'Notifications',
    description: 'User notifications',
    endpoints: [
      { name: 'list', type: 'query', desc: 'List notifications', input: '{ page?, limit?, unreadOnly? }', output: '{ list: Notification[], total }' },
      { name: 'getById', type: 'query', desc: 'Get notification by ID', input: '{ id: string }', output: '{ notification }' },
      { name: 'markAsRead', type: 'mutation', desc: 'Mark as read', input: '{ id: string }', output: '{ notification }' },
      { name: 'markAllAsRead', type: 'mutation', desc: 'Mark all as read', input: 'void', output: '{ updatedCount: number }' },
      { name: 'delete', type: 'mutation', desc: 'Delete notification', input: '{ id: string }', output: '{ success: boolean }' },
      { name: 'getUnreadCount', type: 'query', desc: 'Get unread count', input: 'void', output: '{ count: number }' },
      { name: 'getSettings', type: 'query', desc: 'Get notification settings', input: 'void', output: '{ settings }' },
    ],
  },
  messages: {
    name: 'Messages',
    description: 'Messaging system',
    endpoints: [
      { name: 'getConversations', type: 'query', desc: 'List conversations', input: '{ page?, limit? }', output: '{ list: Conversation[], total }' },
      { name: 'getConversation', type: 'query', desc: 'Get conversation by ID', input: '{ id: string }', output: '{ conversation }' },
      { name: 'createConversation', type: 'mutation', desc: 'Create conversation', input: '{ participantIds, name? }', output: '{ conversation }' },
      { name: 'getMessages', type: 'query', desc: 'Get messages in conversation', input: '{ conversationId, page?, limit? }', output: '{ list: Message[], total }' },
      { name: 'sendMessage', type: 'mutation', desc: 'Send a message', input: '{ conversationId, content, type? }', output: '{ message }' },
      { name: 'markAsRead', type: 'mutation', desc: 'Mark messages as read', input: '{ conversationId }', output: '{ success: boolean }' },
      { name: 'deleteMessage', type: 'mutation', desc: 'Delete a message', input: '{ id: string }', output: '{ success: boolean }' },
      { name: 'deleteConversation', type: 'mutation', desc: 'Delete conversation', input: '{ id: string }', output: '{ success: boolean }' },
      { name: 'getUnreadCount', type: 'query', desc: 'Get unread message count', input: 'void', output: '{ count: number }' },
    ],
  },
};

/**
 * Generate API Documentation page
 */
function getDocsPage(): string {
  const baseUrl = process.env.NODE_ENV === 'production' ? 'https://halolight-bff.h7ml.cn' : `http://localhost:${process.env.PORT || 3002}`;

  const generateEndpointHtml = (router: string, endpoint: { name: string; type: string; desc: string; input: string; output: string }) => {
    const methodColor = endpoint.type === 'query' ? 'green' : 'blue';
    return `
    <div id="${router}-${endpoint.name}" class="border border-slate-700/50 rounded-lg mb-3 overflow-hidden endpoint-card">
      <div class="flex items-center gap-3 p-4 bg-slate-800/50 cursor-pointer hover:bg-slate-800 transition-colors" onclick="this.parentElement.classList.toggle('open')">
        <span class="px-2 py-1 text-xs font-mono font-semibold rounded bg-${methodColor}-500/20 text-${methodColor}-400 uppercase">${endpoint.type}</span>
        <div class="flex-1">
          <code class="text-white font-mono font-semibold">${router}.${endpoint.name}</code>
          <p class="text-slate-400 text-sm mt-1">${endpoint.desc}</p>
        </div>
        <svg class="w-5 h-5 text-slate-400 transform transition-transform endpoint-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
      <div class="endpoint-details bg-slate-900/50 border-t border-slate-700/50 hidden">
        <div class="p-4 space-y-4">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-slate-400 text-sm font-semibold">📥 Input Schema</span>
            </div>
            <pre class="p-3 bg-slate-950 rounded text-${methodColor}-400 text-sm font-mono overflow-x-auto">${endpoint.input}</pre>
          </div>
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-slate-400 text-sm font-semibold">📤 Output Schema</span>
            </div>
            <pre class="p-3 bg-slate-950 rounded text-cyan-400 text-sm font-mono overflow-x-auto">${endpoint.output}</pre>
          </div>
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-slate-400 text-sm font-semibold">💻 Example Usage</span>
            </div>
            <div class="space-y-2">
              <pre class="p-3 bg-slate-950 rounded text-yellow-300 text-sm font-mono overflow-x-auto">// tRPC Client
const result = await trpc.${router}.${endpoint.name}.${endpoint.type === 'query' ? 'query' : 'mutate'}(${endpoint.input === 'void' ? '' : '{\n  // your input here\n}'});</pre>
              <pre class="p-3 bg-slate-950 rounded text-orange-300 text-sm font-mono overflow-x-auto">// HTTP POST
curl -X POST ${baseUrl}/trpc/${router}.${endpoint.name} \\
  -H "Content-Type: application/json" \\
  ${endpoint.input !== 'void' ? '-d \'{"0":{ /* input */ }}\'' : ''}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  };

  const routerSections = Object.entries(API_DOCS).map(([key, router]) => `
    <section id="${key}" class="mb-12 scroll-mt-20">
      <div class="flex items-center gap-3 mb-4 pb-3 border-b border-slate-700/50">
        <h2 class="text-2xl font-bold text-white">${router.name}</h2>
        <span class="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-semibold">${router.endpoints.length} endpoint${router.endpoints.length > 1 ? 's' : ''}</span>
      </div>
      <p class="text-slate-400 mb-6">${router.description}</p>
      <div class="space-y-3">
        ${router.endpoints.map(ep => generateEndpointHtml(key, ep)).join('')}
      </div>
    </section>`).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation - ${APP_NAME}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .open .endpoint-details { display: block !important; }
    .open .endpoint-arrow { transform: rotate(180deg); }
    .endpoint-details { display: none; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #0f172a; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #475569; }
    html { scroll-behavior: smooth; }
    .sidebar-link.active { background: rgba(59, 130, 246, 0.1); color: rgb(96, 165, 250); border-left: 3px solid rgb(59, 130, 246); }
  </style>
</head>
<body class="bg-slate-950 text-slate-50 min-h-screen">
  <div class="flex min-h-screen">
    <!-- Sidebar -->
    <aside class="w-72 bg-slate-900 border-r border-slate-800 fixed h-screen overflow-y-auto">
      <div class="p-6 border-b border-slate-800">
        <a href="/" class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 hover:from-blue-300 hover:to-purple-300 transition-all">${APP_NAME}</a>
        <p class="text-slate-400 text-sm mt-2">tRPC API Documentation</p>
      </div>

      <!-- Search -->
      <div class="p-4 border-b border-slate-800">
        <input
          type="text"
          id="search"
          placeholder="Search endpoints..."
          class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onkeyup="searchEndpoints(this.value)"
        />
      </div>

      <!-- Navigation -->
      <nav class="p-4 space-y-1">
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">API Modules</div>
        ${Object.entries(API_DOCS).map(([key, router]) => `
          <a href="#${key}" class="sidebar-link block px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-sm">
            <div class="flex items-center justify-between">
              <span>${router.name}</span>
              <span class="text-xs text-slate-500">${router.endpoints.length}</span>
            </div>
          </a>
        `).join('')}
      </nav>

      <div class="p-4 border-t border-slate-800">
        <a href="/" class="block px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-sm transition-colors">← 返回首页</a>
        <a href="/api" class="block px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-sm transition-colors">API 信息 (JSON)</a>
        <a href="/health" class="block px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-sm transition-colors">健康检查</a>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="ml-72 flex-1">
      <div class="max-w-5xl mx-auto p-8">
        <!-- Header -->
        <header class="mb-12">
          <h1 class="text-4xl font-bold mb-3">API Reference</h1>
          <p class="text-slate-400 text-lg mb-6">Complete tRPC endpoint documentation. Click any endpoint to view details.</p>

          <!-- Legend -->
          <div class="flex flex-wrap gap-4 p-4 bg-slate-900 border border-slate-800 rounded-lg">
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-mono font-semibold">QUERY</span>
              <span class="text-slate-400 text-sm">Read operations (GET)</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-mono font-semibold">MUTATION</span>
              <span class="text-slate-400 text-sm">Write operations (POST/PUT/DELETE)</span>
            </div>
          </div>
        </header>

        <!-- Base Info -->
        <section class="mb-12 p-6 bg-slate-900 border border-slate-800 rounded-lg">
          <h2 class="text-xl font-semibold mb-4">Getting Started</h2>
          <div class="space-y-4">
            <div>
              <span class="text-slate-400 text-sm font-semibold">Base URL</span>
              <code class="block mt-1 p-2 bg-slate-950 rounded text-green-400 text-sm font-mono">${baseUrl}/trpc</code>
            </div>
            <div>
              <span class="text-slate-400 text-sm font-semibold">Authentication</span>
              <p class="text-slate-400 text-sm mt-1">Include JWT token in Authorization header for protected endpoints:</p>
              <code class="block mt-2 p-2 bg-slate-950 rounded text-yellow-400 text-sm font-mono">Authorization: Bearer &lt;your-jwt-token&gt;</code>
            </div>
            <div>
              <span class="text-slate-400 text-sm font-semibold">Content Type</span>
              <code class="block mt-1 p-2 bg-slate-950 rounded text-cyan-400 text-sm font-mono">Content-Type: application/json</code>
            </div>
          </div>
        </section>

        <!-- Endpoints -->
        ${routerSections}

        <!-- Footer -->
        <footer class="mt-16 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
          <p>Built with tRPC 11 & TypeScript | Version ${APP_VERSION}</p>
        </footer>
      </div>
    </main>
  </div>

  <script>
    // Search functionality
    function searchEndpoints(query) {
      const cards = document.querySelectorAll('.endpoint-card');
      const searchLower = query.toLowerCase();

      cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        const match = text.includes(searchLower);
        card.style.display = match ? 'block' : 'none';
        if (!match) {
          card.classList.remove('open');
        }
      });

      // Hide empty sections
      document.querySelectorAll('section[id]').forEach(section => {
        const visibleCards = section.querySelectorAll('.endpoint-card[style*="display: block"], .endpoint-card:not([style*="display: none"])');
        section.style.display = visibleCards.length > 0 ? 'block' : 'none';
      });
    }

    // Active link highlighting
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + entry.target.id) {
              link.classList.add('active');
            }
          });
        }
      });
    }, { rootMargin: '-100px 0px -80% 0px' });

    document.querySelectorAll('section[id]').forEach(section => observer.observe(section));
  </script>
</body>
</html>`;
}

/**
 * Create Express server with tRPC adapter
 */
export function createServer() {
  const app = express();

  // Logger configuration - different transports for dev/prod
  const isDevelopment = process.env.NODE_ENV !== 'production';

  const logger = isDevelopment
    ? pino({
        level: process.env.LOG_LEVEL || 'debug',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      })
    : pino({
        level: process.env.LOG_LEVEL || 'info',
        timestamp: pino.stdTimeFunctions.isoTime,
      });

  // HTTP request logger
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/favicon.ico',
      },
    })
  );

  // Security middleware (allow inline styles for homepage)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.tailwindcss.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'cdn.tailwindcss.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    })
  );

  // Body parser
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Homepage - Beautiful HTML page
  app.get('/', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(getHomePage());
  });

  // API Documentation page
  app.get('/docs', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(getDocsPage());
  });

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      name: APP_NAME,
      version: APP_VERSION,
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB',
      },
    });
  });

  // Backend services health check
  app.get('/health/services', async (_req: Request, res: Response) => {
    const services = serviceRegistry.getServices();
    const healthResults = await serviceRegistry.checkAllHealth();

    res.json({
      name: APP_NAME,
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      services: services.map((s) => ({
        name: s.name,
        baseUrl: s.baseUrl,
        ...healthResults[s.name],
      })),
    });
  });

  // API info endpoint
  app.get('/api', (_req: Request, res: Response) => {
    res.json({
      name: APP_NAME,
      version: APP_VERSION,
      description: 'tRPC-based Backend for Frontend providing type-safe, unified APIs',
      documentation: 'https://docs.halolight.h7ml.cn',
      github: 'https://github.com/halolight/halolight-bff',
      endpoints: {
        home: '/',
        health: '/health',
        healthServices: '/health/services',
        api: '/api',
        trpc: '/trpc',
      },
      routers: {
        auth: { endpoints: 8, description: 'Authentication & Authorization' },
        users: { endpoints: 8, description: 'User Management' },
        dashboard: { endpoints: 9, description: 'Statistics & Analytics' },
        permissions: { endpoints: 7, description: 'Permission Management' },
        roles: { endpoints: 8, description: 'Role Management' },
        teams: { endpoints: 9, description: 'Team Management' },
        folders: { endpoints: 8, description: 'Folder Management' },
        files: { endpoints: 9, description: 'File Management' },
        documents: { endpoints: 10, description: 'Document Management' },
        calendar: { endpoints: 10, description: 'Calendar Events' },
        notifications: { endpoints: 7, description: 'Notifications' },
        messages: { endpoints: 9, description: 'Messaging' },
      },
      totalEndpoints: 102,
    });
  });

  // tRPC middleware
  app.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, type, path, input }) {
        logger.error(
          {
            type,
            path,
            input,
            code: error.code,
            message: error.message,
          },
          'tRPC Error'
        );
      },
    })
  );

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      code: 404,
      error: 'Not Found',
      message: 'The requested endpoint does not exist',
      availableEndpoints: ['/', '/health', '/health/services', '/api', '/trpc'],
    });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
    logger.error(err, 'Unhandled error');
    res.status(500).json({
      code: 500,
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    });
  });

  return { app, logger };
}
