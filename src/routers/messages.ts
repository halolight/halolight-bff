import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Conversation participant schema
 */
export const participantSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  avatar: z.string().optional(),
});

export type Participant = z.infer<typeof participantSchema>;

/**
 * Conversation schema
 */
export const conversationSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  type: z.enum(['direct', 'group']),
  participants: z.array(participantSchema),
  lastMessage: z.string().optional(),
  lastMessageAt: z.string().optional(),
  unreadCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Conversation = z.infer<typeof conversationSchema>;

/**
 * Message schema
 */
export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  senderName: z.string(),
  senderAvatar: z.string().optional(),
  content: z.string(),
  type: z.enum(['text', 'image', 'file']),
  attachmentUrl: z.string().optional(),
  read: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Message = z.infer<typeof messageSchema>;

/**
 * Mock conversations data
 */
const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Engineering Team',
    type: 'group',
    participants: [
      { id: 'p-1', userId: 'user-1', name: 'Admin User', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' },
      { id: 'p-2', userId: 'user-2', name: 'Developer', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dev' },
      { id: 'p-3', userId: 'user-3', name: 'Designer', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=design' },
    ],
    lastMessage: 'The new feature is ready for review',
    lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
    unreadCount: 3,
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'conv-2',
    type: 'direct',
    participants: [
      { id: 'p-4', userId: 'user-1', name: 'Admin User', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' },
      { id: 'p-5', userId: 'user-4', name: 'Project Manager', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm' },
    ],
    lastMessage: 'Can we schedule a meeting?',
    lastMessageAt: new Date(Date.now() - 7200000).toISOString(),
    unreadCount: 1,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'conv-3',
    title: 'Design Review',
    type: 'group',
    participants: [
      { id: 'p-6', userId: 'user-1', name: 'Admin User' },
      { id: 'p-7', userId: 'user-3', name: 'Designer' },
    ],
    lastMessage: 'Updated mockups attached',
    lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
    unreadCount: 0,
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

/**
 * Mock messages data
 */
const mockMessages: Record<string, Message[]> = {
  'conv-1': [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-2',
      senderName: 'Developer',
      content: 'Hey team, I just pushed the new feature branch',
      type: 'text',
      read: true,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      senderId: 'user-3',
      senderName: 'Designer',
      content: 'Great! I will review the UI changes',
      type: 'text',
      read: true,
      createdAt: new Date(Date.now() - 5400000).toISOString(),
      updatedAt: new Date(Date.now() - 5400000).toISOString(),
    },
    {
      id: 'msg-3',
      conversationId: 'conv-1',
      senderId: 'user-2',
      senderName: 'Developer',
      content: 'The new feature is ready for review',
      type: 'text',
      read: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  'conv-2': [
    {
      id: 'msg-4',
      conversationId: 'conv-2',
      senderId: 'user-4',
      senderName: 'Project Manager',
      content: 'Hi, do you have time for a quick sync?',
      type: 'text',
      read: true,
      createdAt: new Date(Date.now() - 10800000).toISOString(),
      updatedAt: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      id: 'msg-5',
      conversationId: 'conv-2',
      senderId: 'user-4',
      senderName: 'Project Manager',
      content: 'Can we schedule a meeting?',
      type: 'text',
      read: false,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
};

/**
 * Messages router
 */
export const messagesRouter = router({
  /**
   * Get conversations list
   */
  getConversations: protectedProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(20),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 20, search } = input || {};
      let data = [...mockConversations];

      if (search) {
        const searchLower = search.toLowerCase();
        data = data.filter(
          (c) =>
            c.title?.toLowerCase().includes(searchLower) ||
            c.participants.some((p) => p.name.toLowerCase().includes(searchLower)) ||
            c.lastMessage?.toLowerCase().includes(searchLower)
        );
      }

      // Sort by lastMessageAt descending
      data.sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      });

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
   * Get conversation by ID
   */
  getConversation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const conversation = mockConversations.find((c) => c.id === input.id);

      if (!conversation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Conversation with ID ${input.id} not found`,
        });
      }

      return {
        code: 200,
        message: 'success',
        data: conversation,
      };
    }),

  /**
   * Get messages in a conversation
   */
  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const { conversationId, page, limit } = input;
      const conversation = mockConversations.find((c) => c.id === conversationId);

      if (!conversation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Conversation with ID ${conversationId} not found`,
        });
      }

      const messages = mockMessages[conversationId] || [];
      // Sort by createdAt ascending (oldest first for chat)
      const sorted = [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const total = sorted.length;
      const start = (page - 1) * limit;
      const list = sorted.slice(start, start + limit);

      return {
        code: 200,
        message: 'success',
        data: {
          conversationId,
          list,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Send a message
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1, 'Message content is required'),
        type: z.enum(['text', 'image', 'file']).default('text'),
        attachmentUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { conversationId, content, type, attachmentUrl } = input;
      const conversationIndex = mockConversations.findIndex((c) => c.id === conversationId);

      if (conversationIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Conversation with ID ${conversationId} not found`,
        });
      }

      const now = new Date().toISOString();
      const message: Message = {
        id: `msg-${Date.now()}`,
        conversationId,
        senderId: ctx.user?.id || 'unknown',
        senderName: ctx.user?.name || 'Unknown',
        content,
        type,
        attachmentUrl,
        read: false,
        createdAt: now,
        updatedAt: now,
      };

      if (!mockMessages[conversationId]) {
        mockMessages[conversationId] = [];
      }
      mockMessages[conversationId].push(message);

      // Update conversation
      mockConversations[conversationIndex] = {
        ...mockConversations[conversationIndex],
        lastMessage: content,
        lastMessageAt: now,
        updatedAt: now,
      };

      return {
        code: 200,
        message: 'Message sent successfully',
        data: message,
      };
    }),

  /**
   * Mark message as read
   */
  markAsRead: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ input }) => {
      let found = false;

      for (const convId in mockMessages) {
        const messages = mockMessages[convId];
        const msgIndex = messages.findIndex((m) => m.id === input.messageId);

        if (msgIndex !== -1) {
          messages[msgIndex] = { ...messages[msgIndex], read: true };
          found = true;

          // Update unread count in conversation
          const convIndex = mockConversations.findIndex((c) => c.id === convId);
          if (convIndex !== -1) {
            const unreadCount = messages.filter((m) => !m.read).length;
            mockConversations[convIndex] = {
              ...mockConversations[convIndex],
              unreadCount,
            };
          }
          break;
        }
      }

      if (!found) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Message with ID ${input.messageId} not found`,
        });
      }

      return {
        code: 200,
        message: 'Message marked as read',
        data: { messageId: input.messageId, read: true },
      };
    }),

  /**
   * Mark all messages in conversation as read
   */
  markConversationAsRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ input }) => {
      const { conversationId } = input;
      const messages = mockMessages[conversationId];

      if (!messages) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Conversation with ID ${conversationId} not found`,
        });
      }

      let updatedCount = 0;
      messages.forEach((m, i) => {
        if (!m.read) {
          messages[i] = { ...m, read: true };
          updatedCount++;
        }
      });

      // Update conversation unread count
      const convIndex = mockConversations.findIndex((c) => c.id === conversationId);
      if (convIndex !== -1) {
        mockConversations[convIndex] = {
          ...mockConversations[convIndex],
          unreadCount: 0,
        };
      }

      return {
        code: 200,
        message: `${updatedCount} messages marked as read`,
        data: { conversationId, updated: updatedCount },
      };
    }),

  /**
   * Delete message
   */
  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      let found = false;

      for (const convId in mockMessages) {
        const messages = mockMessages[convId];
        const msgIndex = messages.findIndex((m) => m.id === input.messageId);

        if (msgIndex !== -1) {
          const message = messages[msgIndex];

          // Only allow deleting own messages
          if (message.senderId !== ctx.user?.id && ctx.user?.role.name !== 'admin') {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You can only delete your own messages',
            });
          }

          messages.splice(msgIndex, 1);
          found = true;
          break;
        }
      }

      if (!found) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Message with ID ${input.messageId} not found`,
        });
      }

      return {
        code: 200,
        message: 'Message deleted successfully',
        data: { messageId: input.messageId, deleted: true },
      };
    }),

  /**
   * Create new conversation
   */
  createConversation: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
        type: z.enum(['direct', 'group']),
        participantIds: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { title, type, participantIds } = input;
      const now = new Date().toISOString();

      // Add current user to participants
      const allParticipantIds = [...new Set([ctx.user?.id || 'unknown', ...participantIds])];

      const participants: Participant[] = allParticipantIds.map((userId, i) => ({
        id: `p-${Date.now()}-${i}`,
        userId,
        name: userId === ctx.user?.id ? ctx.user.name : `User ${userId}`,
      }));

      const conversation: Conversation = {
        id: `conv-${Date.now()}`,
        title: type === 'group' ? title : undefined,
        type,
        participants,
        unreadCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      mockConversations.push(conversation);
      mockMessages[conversation.id] = [];

      return {
        code: 200,
        message: 'Conversation created successfully',
        data: conversation,
      };
    }),

  /**
   * Get total unread message count
   */
  getTotalUnreadCount: protectedProcedure.query(async () => {
    const count = mockConversations.reduce((sum, c) => sum + c.unreadCount, 0);

    return {
      code: 200,
      message: 'success',
      data: { count },
    };
  }),
});
