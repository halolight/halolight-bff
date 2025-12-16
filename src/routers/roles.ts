import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Role schema
 */
export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string(),
  description: z.string().optional(),
  permissions: z.array(z.string()),
  isSystem: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Role = z.infer<typeof roleSchema>;

/**
 * Mock roles data
 */
const mockRoles: Role[] = [
  {
    id: 'role-admin',
    name: 'admin',
    label: 'Super Admin',
    description: 'Full access to all modules and actions',
    permissions: ['*'],
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role-editor',
    name: 'editor',
    label: 'Editor',
    description: 'Can manage content and view users',
    permissions: ['dashboard:view', 'users:view', 'documents:*', 'files:*'],
    isSystem: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role-viewer',
    name: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to dashboard and documents',
    permissions: ['dashboard:view', 'documents:view', 'files:view'],
    isSystem: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role-manager',
    name: 'manager',
    label: 'Manager',
    description: 'Can manage teams and users',
    permissions: ['dashboard:view', 'users:*', 'teams:*', 'documents:view'],
    isSystem: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Roles router
 */
export const rolesRouter = router({
  /**
   * List roles with pagination and search
   */
  list: protectedProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(10),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 10, search } = input || {};
      let data = [...mockRoles];

      if (search) {
        const searchLower = search.toLowerCase();
        data = data.filter(
          (r) =>
            r.name.toLowerCase().includes(searchLower) ||
            r.label.toLowerCase().includes(searchLower) ||
            r.description?.toLowerCase().includes(searchLower)
        );
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
   * Get role by ID with full permission details
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const item = mockRoles.find((r) => r.id === input.id);

      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Role with ID ${input.id} not found`,
        });
      }

      return {
        code: 200,
        message: 'success',
        data: item,
      };
    }),

  /**
   * Get role by name
   */
  getByName: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      const item = mockRoles.find((r) => r.name === input.name);

      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Role with name "${input.name}" not found`,
        });
      }

      return {
        code: 200,
        message: 'success',
        data: item,
      };
    }),

  /**
   * Create new role (Admin only)
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required').regex(/^[a-z][a-z0-9_-]*$/, 'Name must be lowercase alphanumeric'),
        label: z.string().min(1, 'Label is required'),
        description: z.string().optional(),
        permissions: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ input }) => {
      // Check for duplicate name
      const existing = mockRoles.find((r) => r.name === input.name);
      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Role with name "${input.name}" already exists`,
        });
      }

      const now = new Date().toISOString();
      const created: Role = {
        id: `role-${Date.now()}`,
        name: input.name,
        label: input.label,
        description: input.description,
        permissions: input.permissions,
        isSystem: false,
        createdAt: now,
        updatedAt: now,
      };

      // TODO: Save to database
      mockRoles.push(created);

      return {
        code: 200,
        message: 'Role created successfully',
        data: created,
      };
    }),

  /**
   * Update role (Admin only)
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        label: z.string().optional(),
        description: z.string().optional(),
        permissions: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      const existingIndex = mockRoles.findIndex((r) => r.id === id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Role with ID ${id} not found`,
        });
      }

      const existing = mockRoles[existingIndex];

      // Prevent modifying system roles' core properties
      if (existing.isSystem && updates.permissions) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot modify permissions of system roles',
        });
      }

      const updated: Role = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // TODO: Update in database
      mockRoles[existingIndex] = updated;

      return {
        code: 200,
        message: 'Role updated successfully',
        data: updated,
      };
    }),

  /**
   * Delete role (Admin only)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const existingIndex = mockRoles.findIndex((r) => r.id === input.id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Role with ID ${input.id} not found`,
        });
      }

      const role = mockRoles[existingIndex];

      // Prevent deleting system roles
      if (role.isSystem) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete system roles',
        });
      }

      // TODO: Check if role is assigned to any users before deletion
      // TODO: Delete from database
      mockRoles.splice(existingIndex, 1);

      return {
        code: 200,
        message: 'Role deleted successfully',
        data: { id: input.id, deleted: true },
      };
    }),

  /**
   * Assign permissions to role (Admin only)
   */
  assignPermissions: adminProcedure
    .input(
      z.object({
        id: z.string(),
        permissions: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const { id, permissions } = input;
      const existingIndex = mockRoles.findIndex((r) => r.id === id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Role with ID ${id} not found`,
        });
      }

      const existing = mockRoles[existingIndex];

      // Prevent modifying system roles
      if (existing.isSystem) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot modify permissions of system roles',
        });
      }

      const updated: Role = {
        ...existing,
        permissions,
        updatedAt: new Date().toISOString(),
      };

      // TODO: Update in database
      mockRoles[existingIndex] = updated;

      return {
        code: 200,
        message: 'Permissions assigned successfully',
        data: updated,
      };
    }),

  /**
   * Get all roles (simple list for dropdowns)
   */
  getAll: protectedProcedure.query(async () => {
    return {
      code: 200,
      message: 'success',
      data: mockRoles.map((r) => ({
        id: r.id,
        name: r.name,
        label: r.label,
      })),
    };
  }),
});
