import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Notification schema
 */
export const notificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.enum(['info', 'success', 'warning', 'error']),
  read: z.boolean(),
  link: z.string().optional(),
  createdAt: z.string(),
});

export type Notification = z.infer<typeof notificationSchema>;

/**
 * Mock notifications data
 */
const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    title: 'Welcome to HaloLight',
    message: 'Your account has been created successfully.',
    type: 'success',
    read: true,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'notif-2',
    title: 'New Document Shared',
    message: 'John Doe shared "Project Spec" with you.',
    type: 'info',
    read: false,
    link: '/documents/doc-1',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'notif-3',
    title: 'Meeting Reminder',
    message: 'Team Standup starts in 15 minutes.',
    type: 'warning',
    read: false,
    link: '/calendar/event-1',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'notif-4',
    title: 'Password Changed',
    message: 'Your password was changed successfully.',
    type: 'success',
    read: true,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'notif-5',
    title: 'Storage Warning',
    message: 'You are using 90% of your storage quota.',
    type: 'warning',
    read: false,
    link: '/settings/storage',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  ...Array.from({ length: 7 }, (_, i) => ({
    id: `notif-${i + 6}`,
    title: `Notification ${i + 6}`,
    message: `This is notification message ${i + 6}`,
    type: 'info' as const,
    read: i % 2 === 0,
    createdAt: new Date(Date.now() - 86400000 * (i + 1)).toISOString(),
  })),
];

/**
 * Notifications router
 */
export const notificationsRouter = router({
  /**
   * List notifications with pagination
   */
  list: protectedProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(20),
          unreadOnly: z.boolean().optional(),
          type: z.enum(['info', 'success', 'warning', 'error']).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 20, unreadOnly, type } = input || {};
      let data = [...mockNotifications];

      if (unreadOnly) {
        data = data.filter((n) => !n.read);
      }

      if (type) {
        data = data.filter((n) => n.type === type);
      }

      // Sort by createdAt descending (newest first)
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
   * Get unread notification count
   */
  getUnreadCount: protectedProcedure.query(async () => {
    const count = mockNotifications.filter((n) => !n.read).length;

    return {
      code: 200,
      message: 'success',
      data: { count },
    };
  }),

  /**
   * Mark notification as read
   */
  markAsRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const existingIndex = mockNotifications.findIndex((n) => n.id === input.id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Notification with ID ${input.id} not found`,
        });
      }

      mockNotifications[existingIndex] = {
        ...mockNotifications[existingIndex],
        read: true,
      };

      return {
        code: 200,
        message: 'Notification marked as read',
        data: mockNotifications[existingIndex],
      };
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: protectedProcedure.mutation(async () => {
    let updatedCount = 0;

    mockNotifications.forEach((n, i) => {
      if (!n.read) {
        mockNotifications[i] = { ...n, read: true };
        updatedCount++;
      }
    });

    return {
      code: 200,
      message: `${updatedCount} notifications marked as read`,
      data: { updated: updatedCount },
    };
  }),

  /**
   * Delete notification
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const existingIndex = mockNotifications.findIndex((n) => n.id === input.id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Notification with ID ${input.id} not found`,
        });
      }

      mockNotifications.splice(existingIndex, 1);

      return {
        code: 200,
        message: 'Notification deleted successfully',
        data: { id: input.id, deleted: true },
      };
    }),

  /**
   * Delete all read notifications
   */
  deleteAllRead: protectedProcedure.mutation(async () => {
    const initialCount = mockNotifications.length;
    const readIndexes = mockNotifications
      .map((n, i) => (n.read ? i : -1))
      .filter((i) => i !== -1)
      .reverse();

    readIndexes.forEach((i) => mockNotifications.splice(i, 1));

    const deletedCount = initialCount - mockNotifications.length;

    return {
      code: 200,
      message: `${deletedCount} notifications deleted`,
      data: { deleted: deletedCount },
    };
  }),

  /**
   * Get notification by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const notification = mockNotifications.find((n) => n.id === input.id);

      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Notification with ID ${input.id} not found`,
        });
      }

      return {
        code: 200,
        message: 'success',
        data: notification,
      };
    }),
});
