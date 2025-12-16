import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Permission schema
 */
export const permissionSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  module: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Permission = z.infer<typeof permissionSchema>;

/**
 * Mock permissions data
 */
const MODULES = ['dashboard', 'users', 'roles', 'documents', 'files', 'teams', 'calendar', 'notifications', 'messages'];
const ACTIONS = ['view', 'create', 'update', 'delete'];

const mockPermissions: Permission[] = MODULES.flatMap((module) =>
  ACTIONS.map((action) => ({
    id: `perm-${module}-${action}`,
    code: `${module}:${action}`,
    name: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module.charAt(0).toUpperCase() + module.slice(1)}`,
    description: `Permission to ${action} ${module}`,
    module,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))
);

// Add wildcard permissions for each module
MODULES.forEach((module) => {
  mockPermissions.push({
    id: `perm-${module}-all`,
    code: `${module}:*`,
    name: `All ${module.charAt(0).toUpperCase() + module.slice(1)} Permissions`,
    description: `Full access to ${module} module`,
    module,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
});

// Add global admin permission
mockPermissions.unshift({
  id: 'perm-admin',
  code: '*',
  name: 'Super Admin',
  description: 'Full access to all modules and actions',
  module: 'system',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/**
 * Permissions router
 */
export const permissionsRouter = router({
  /**
   * List permissions with pagination and filters
   */
  list: protectedProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(10),
          search: z.string().optional(),
          module: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 10, search, module } = input || {};
      let data = [...mockPermissions];

      if (search) {
        const searchLower = search.toLowerCase();
        data = data.filter(
          (p) =>
            p.name.toLowerCase().includes(searchLower) ||
            p.code.toLowerCase().includes(searchLower) ||
            p.description?.toLowerCase().includes(searchLower)
        );
      }

      if (module) {
        data = data.filter((p) => p.module === module);
      }

      const total = data.length;
      const start = (page - 1) * limit;
      const list = data.slice(start, start + limit);

      return {
        code: 200,
        message: 'success',
        data: {
          list,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get permission by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const item = mockPermissions.find((p) => p.id === input.id);

      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Permission with ID ${input.id} not found`,
        });
      }

      return {
        code: 200,
        message: 'success',
        data: item,
      };
    }),

  /**
   * Create new permission (Admin only)
   */
  create: adminProcedure
    .input(
      z.object({
        code: z.string().min(1, 'Code is required').regex(/^[\w:*]+$/, 'Invalid permission code format'),
        name: z.string().min(1, 'Name is required'),
        description: z.string().optional(),
        module: z.string().min(1, 'Module is required'),
      })
    )
    .mutation(async ({ input }) => {
      // Check for duplicate code
      const existing = mockPermissions.find((p) => p.code === input.code);
      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Permission with code "${input.code}" already exists`,
        });
      }

      const now = new Date().toISOString();
      const created: Permission = {
        id: `perm-${Date.now()}`,
        code: input.code,
        name: input.name,
        description: input.description,
        module: input.module,
        createdAt: now,
        updatedAt: now,
      };

      // TODO: Save to database
      mockPermissions.push(created);

      return {
        code: 200,
        message: 'Permission created successfully',
        data: created,
      };
    }),

  /**
   * Update permission (Admin only)
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        module: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      const existingIndex = mockPermissions.findIndex((p) => p.id === id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Permission with ID ${id} not found`,
        });
      }

      const existing = mockPermissions[existingIndex];
      const updated: Permission = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // TODO: Update in database
      mockPermissions[existingIndex] = updated;

      return {
        code: 200,
        message: 'Permission updated successfully',
        data: updated,
      };
    }),

  /**
   * Delete permission (Admin only)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const existingIndex = mockPermissions.findIndex((p) => p.id === input.id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Permission with ID ${input.id} not found`,
        });
      }

      // Prevent deleting system permissions
      const permission = mockPermissions[existingIndex];
      if (permission.code === '*') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete system admin permission',
        });
      }

      // TODO: Delete from database
      mockPermissions.splice(existingIndex, 1);

      return {
        code: 200,
        message: 'Permission deleted successfully',
        data: { id: input.id, deleted: true },
      };
    }),

  /**
   * Get permissions tree grouped by module
   */
  getTree: protectedProcedure.query(async () => {
    const moduleMap = mockPermissions.reduce<Record<string, Permission[]>>(
      (acc, perm) => {
        if (!acc[perm.module]) {
          acc[perm.module] = [];
        }
        acc[perm.module].push(perm);
        return acc;
      },
      {}
    );

    const tree = Object.entries(moduleMap).map(([module, permissions]) => ({
      module,
      label: module.charAt(0).toUpperCase() + module.slice(1),
      permissions: permissions.sort((a, b) => a.code.localeCompare(b.code)),
    }));

    return {
      code: 200,
      message: 'success',
      data: tree,
    };
  }),

  /**
   * Get all available modules
   */
  getModules: protectedProcedure.query(async () => {
    const modules = [...new Set(mockPermissions.map((p) => p.module))];

    return {
      code: 200,
      message: 'success',
      data: modules.map((module) => ({
        value: module,
        label: module.charAt(0).toUpperCase() + module.slice(1),
      })),
    };
  }),
});
