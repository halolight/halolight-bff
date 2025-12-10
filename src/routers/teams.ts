import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Team schema
 */
export const teamSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  avatar: z.string().optional(),
  memberCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Team = z.infer<typeof teamSchema>;

/**
 * Team member schema
 */
export const teamMemberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().optional(),
  role: z.enum(['owner', 'admin', 'member']),
  joinedAt: z.string(),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;

/**
 * Mock teams data
 */
const mockTeams: Team[] = [
  {
    id: 'team-engineering',
    name: 'Engineering',
    description: 'Software development team',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=engineering',
    memberCount: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'team-design',
    name: 'Design',
    description: 'UI/UX design team',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=design',
    memberCount: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'team-marketing',
    name: 'Marketing',
    description: 'Marketing and growth team',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=marketing',
    memberCount: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Mock team members data
 */
const mockMembers: Record<string, TeamMember[]> = {
  'team-engineering': Array.from({ length: 8 }, (_, i) => ({
    id: `member-eng-${i + 1}`,
    userId: `user-${i + 1}`,
    name: `Engineer ${i + 1}`,
    email: `engineer${i + 1}@example.com`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=eng${i + 1}`,
    role: i === 0 ? 'owner' : i < 3 ? 'admin' : 'member',
    joinedAt: new Date().toISOString(),
  })),
  'team-design': Array.from({ length: 4 }, (_, i) => ({
    id: `member-design-${i + 1}`,
    userId: `user-${i + 10}`,
    name: `Designer ${i + 1}`,
    email: `designer${i + 1}@example.com`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=design${i + 1}`,
    role: i === 0 ? 'owner' : 'member',
    joinedAt: new Date().toISOString(),
  })),
};

/**
 * Teams router
 */
export const teamsRouter = router({
  /**
   * List teams with pagination and search
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
      let data = [...mockTeams];

      if (search) {
        const searchLower = search.toLowerCase();
        data = data.filter(
          (t) =>
            t.name.toLowerCase().includes(searchLower) ||
            t.description?.toLowerCase().includes(searchLower)
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
   * Get team by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const team = mockTeams.find((t) => t.id === input.id);

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Team with ID ${input.id} not found`,
        });
      }

      return {
        code: 200,
        message: 'success',
        data: team,
      };
    }),

  /**
   * Create new team (Admin only)
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required'),
        description: z.string().optional(),
        avatar: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check for duplicate name
      const existing = mockTeams.find((t) => t.name.toLowerCase() === input.name.toLowerCase());
      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Team with name "${input.name}" already exists`,
        });
      }

      const now = new Date().toISOString();
      const teamId = `team-${Date.now()}`;
      const created: Team = {
        id: teamId,
        name: input.name,
        description: input.description,
        avatar: input.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${input.name}`,
        memberCount: 1,
        createdAt: now,
        updatedAt: now,
      };

      // Add creator as owner
      mockMembers[teamId] = [
        {
          id: `member-${Date.now()}`,
          userId: ctx.user.id,
          name: ctx.user.name,
          email: ctx.user.email,
          role: 'owner',
          joinedAt: now,
        },
      ];

      mockTeams.push(created);

      return {
        code: 200,
        message: 'Team created successfully',
        data: created,
      };
    }),

  /**
   * Update team (Admin only)
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        avatar: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      const existingIndex = mockTeams.findIndex((t) => t.id === id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Team with ID ${id} not found`,
        });
      }

      const existing = mockTeams[existingIndex];
      const updated: Team = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      mockTeams[existingIndex] = updated;

      return {
        code: 200,
        message: 'Team updated successfully',
        data: updated,
      };
    }),

  /**
   * Delete team (Admin only)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const existingIndex = mockTeams.findIndex((t) => t.id === input.id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Team with ID ${input.id} not found`,
        });
      }

      mockTeams.splice(existingIndex, 1);
      delete mockMembers[input.id];

      return {
        code: 200,
        message: 'Team deleted successfully',
        data: { id: input.id, deleted: true },
      };
    }),

  /**
   * Get team members
   */
  getMembers: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const { teamId, page, limit } = input;
      const team = mockTeams.find((t) => t.id === teamId);

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Team with ID ${teamId} not found`,
        });
      }

      const members = mockMembers[teamId] || [];
      const total = members.length;
      const start = (page - 1) * limit;
      const list = members.slice(start, start + limit);

      return {
        code: 200,
        message: 'success',
        data: {
          teamId,
          list,
          total,
          page,
          limit,
        },
      };
    }),

  /**
   * Add member to team (Admin only)
   */
  addMember: adminProcedure
    .input(
      z.object({
        teamId: z.string(),
        userId: z.string(),
        role: z.enum(['admin', 'member']).default('member'),
      })
    )
    .mutation(async ({ input }) => {
      const { teamId, userId, role } = input;
      const team = mockTeams.find((t) => t.id === teamId);

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Team with ID ${teamId} not found`,
        });
      }

      const members = mockMembers[teamId] || [];
      const existingMember = members.find((m) => m.userId === userId);

      if (existingMember) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User is already a member of this team',
        });
      }

      const newMember: TeamMember = {
        id: `member-${Date.now()}`,
        userId,
        name: `User ${userId}`,
        email: `${userId}@example.com`,
        role,
        joinedAt: new Date().toISOString(),
      };

      if (!mockMembers[teamId]) {
        mockMembers[teamId] = [];
      }
      mockMembers[teamId].push(newMember);

      // Update member count
      const teamIndex = mockTeams.findIndex((t) => t.id === teamId);
      if (teamIndex !== -1) {
        mockTeams[teamIndex].memberCount++;
      }

      return {
        code: 200,
        message: 'Member added successfully',
        data: newMember,
      };
    }),

  /**
   * Remove member from team (Admin only)
   */
  removeMember: adminProcedure
    .input(
      z.object({
        teamId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { teamId, userId } = input;
      const team = mockTeams.find((t) => t.id === teamId);

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Team with ID ${teamId} not found`,
        });
      }

      const members = mockMembers[teamId] || [];
      const memberIndex = members.findIndex((m) => m.userId === userId);

      if (memberIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User is not a member of this team',
        });
      }

      const member = members[memberIndex];
      if (member.role === 'owner') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot remove team owner',
        });
      }

      members.splice(memberIndex, 1);

      // Update member count
      const teamIndex = mockTeams.findIndex((t) => t.id === teamId);
      if (teamIndex !== -1) {
        mockTeams[teamIndex].memberCount--;
      }

      return {
        code: 200,
        message: 'Member removed successfully',
        data: { teamId, userId, removed: true },
      };
    }),

  /**
   * Update member role (Admin only)
   */
  updateMemberRole: adminProcedure
    .input(
      z.object({
        teamId: z.string(),
        userId: z.string(),
        role: z.enum(['admin', 'member']),
      })
    )
    .mutation(async ({ input }) => {
      const { teamId, userId, role } = input;
      const members = mockMembers[teamId] || [];
      const memberIndex = members.findIndex((m) => m.userId === userId);

      if (memberIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User is not a member of this team',
        });
      }

      const member = members[memberIndex];
      if (member.role === 'owner') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot change owner role',
        });
      }

      members[memberIndex] = { ...member, role };

      return {
        code: 200,
        message: 'Member role updated successfully',
        data: members[memberIndex],
      };
    }),
});
