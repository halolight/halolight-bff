import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Users router
 * Handles user CRUD operations, role management
 */
export const usersRouter = router({
  /**
   * Get all users with pagination
   */
  list: protectedProcedure
    .input(
      z
        .object({
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(10),
          search: z.string().optional(),
          role: z.string().optional(),
          status: z.enum(['active', 'inactive', 'suspended']).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 10 } = input || {};
      // TODO: Apply filters: input?.search, input?.role, input?.status

      // TODO: Replace with actual database query
      // Mock implementation
      const mockUsers = Array.from({ length: limit }, (_, i) => ({
        id: `user-${page}-${i}`,
        name: `User ${page * limit + i}`,
        email: `user${page * limit + i}@example.com`,
        phone: `1390000${String(page * limit + i).padStart(4, '0')}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${page * limit + i}`,
        role: {
          id: 'viewer',
          name: 'viewer',
          label: 'Viewer',
          permissions: ['dashboard:view'],
        },
        status: 'active' as const,
        department: 'Engineering',
        position: 'Developer',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      }));

      return {
        code: 200,
        message: 'success',
        data: {
          list: mockUsers,
          total: 100,
          page,
          limit,
        },
      };
    }),

  /**
   * Get user by ID
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { id } = input;

      // TODO: Replace with actual database query
      const mockUser = {
        id,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '13900001234',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
        role: {
          id: 'admin',
          name: 'admin',
          label: 'Super Admin',
          permissions: ['*'],
        },
        status: 'active' as const,
        department: 'Engineering',
        position: 'CTO',
        bio: 'Experienced software engineer with 10+ years in the industry.',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      return {
        code: 200,
        message: 'success',
        data: mockUser,
      };
    }),

  /**
   * Create new user (Admin only)
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email format'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        phone: z.string().optional(),
        role: z.string(),
        department: z.string().optional(),
        position: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { name, email } = input;
      // TODO: Use input.password for hashing, input.role for role assignment

      // TODO: Replace with actual database operations
      // - Check if email already exists
      // - Hash password
      // - Create user in database

      return {
        code: 200,
        message: 'User created successfully',
        data: {
          id: 'new-user-id',
          name,
          email,
          createdAt: new Date().toISOString(),
        },
      };
    }),

  /**
   * Update user
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        avatar: z.string().optional(),
        department: z.string().optional(),
        position: z.string().optional(),
        bio: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;

      // Users can only update their own profile unless they're admin
      if (ctx.user.id !== id && ctx.user.role.name !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update your own profile',
        });
      }

      // TODO: Replace with actual database update
      return {
        code: 200,
        message: 'User updated successfully',
        data: {
          id,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  /**
   * Update user role (Admin only)
   */
  updateRole: adminProcedure
    .input(
      z.object({
        id: z.string(),
        roleId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, roleId } = input;

      // TODO: Replace with actual database update
      return {
        code: 200,
        message: 'User role updated successfully',
        data: {
          id,
          roleId,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  /**
   * Update user status (Admin only)
   */
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['active', 'inactive', 'suspended']),
      })
    )
    .mutation(async ({ input }) => {
      const { id, status } = input;

      // TODO: Replace with actual database update
      return {
        code: 200,
        message: 'User status updated successfully',
        data: {
          id,
          status,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  /**
   * Delete user (Admin only)
   */
  delete: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id } = input;

      // Prevent self-deletion
      if (ctx.user.id === id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot delete your own account',
        });
      }

      // TODO: Replace with actual database deletion
      return {
        code: 200,
        message: 'User deleted successfully',
        data: null,
      };
    }),

  /**
   * Get all roles
   */
  getRoles: protectedProcedure.query(async () => {
    // TODO: Replace with actual database query
    const mockRoles = [
      { id: 'admin', name: 'admin', label: 'Super Admin', permissions: ['*'] },
      {
        id: 'editor',
        name: 'editor',
        label: 'Editor',
        permissions: ['dashboard:view', 'users:view', 'documents:*'],
      },
      { id: 'viewer', name: 'viewer', label: 'Viewer', permissions: ['dashboard:view'] },
    ];

    return {
      code: 200,
      message: 'success',
      data: mockRoles,
    };
  }),
});
