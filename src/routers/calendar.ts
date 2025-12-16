import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Attendee schema
 */
export const attendeeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().optional(),
  status: z.enum(['accepted', 'declined', 'tentative', 'pending']),
});

export type Attendee = z.infer<typeof attendeeSchema>;

/**
 * Calendar event schema
 */
export const calendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  start: z.string(),
  end: z.string(),
  allDay: z.boolean(),
  location: z.string().optional(),
  color: z.string().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  ownerId: z.string(),
  ownerName: z.string(),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;

/**
 * Mock calendar events
 */
const mockEvents: CalendarEvent[] = [
  {
    id: 'event-1',
    title: 'Team Standup',
    description: 'Daily team standup meeting',
    start: new Date(Date.now() + 3600000).toISOString(),
    end: new Date(Date.now() + 5400000).toISOString(),
    allDay: false,
    location: 'Zoom',
    color: '#4CAF50',
    recurrence: 'daily',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: 'user-1',
    ownerName: 'Admin User',
  },
  {
    id: 'event-2',
    title: 'Sprint Planning',
    description: 'Bi-weekly sprint planning session',
    start: new Date(Date.now() + 86400000).toISOString(),
    end: new Date(Date.now() + 93600000).toISOString(),
    allDay: false,
    location: 'Conference Room A',
    color: '#2196F3',
    recurrence: 'weekly',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: 'user-2',
    ownerName: 'Project Manager',
  },
  {
    id: 'event-3',
    title: 'Company Holiday',
    description: 'Office closed',
    start: new Date(Date.now() + 604800000).toISOString(),
    end: new Date(Date.now() + 691200000).toISOString(),
    allDay: true,
    color: '#FF9800',
    recurrence: 'none',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: 'user-1',
    ownerName: 'Admin User',
  },
];

/**
 * Mock attendees per event
 */
const mockAttendees: Record<string, Attendee[]> = {
  'event-1': [
    { id: 'att-1', userId: 'user-1', name: 'Admin User', email: 'admin@example.com', status: 'accepted' },
    { id: 'att-2', userId: 'user-2', name: 'Developer', email: 'dev@example.com', status: 'accepted' },
    { id: 'att-3', userId: 'user-3', name: 'Designer', email: 'design@example.com', status: 'tentative' },
  ],
  'event-2': [
    { id: 'att-4', userId: 'user-1', name: 'Admin User', email: 'admin@example.com', status: 'accepted' },
    { id: 'att-5', userId: 'user-2', name: 'Project Manager', email: 'pm@example.com', status: 'accepted' },
  ],
};

/**
 * Calendar router
 */
export const calendarRouter = router({
  /**
   * List events with date range filter
   */
  list: protectedProcedure
    .input(
      z
        .object({
          start: z.string().optional(),
          end: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { start, end, search } = input || {};
      let data = [...mockEvents];

      if (start) {
        data = data.filter((e) => e.start >= start || e.end >= start);
      }

      if (end) {
        data = data.filter((e) => e.start <= end);
      }

      if (search) {
        const searchLower = search.toLowerCase();
        data = data.filter(
          (e) =>
            e.title.toLowerCase().includes(searchLower) ||
            e.description?.toLowerCase().includes(searchLower) ||
            e.location?.toLowerCase().includes(searchLower)
        );
      }

      return {
        code: 200,
        message: 'success',
        data: {
          list: data,
          total: data.length,
        },
      };
    }),

  /**
   * Get event by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const event = mockEvents.find((e) => e.id === input.id);

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Event with ID ${input.id} not found`,
        });
      }

      const attendees = mockAttendees[input.id] || [];

      return {
        code: 200,
        message: 'success',
        data: {
          ...event,
          attendees,
        },
      };
    }),

  /**
   * Create new event
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, 'Title is required'),
        description: z.string().optional(),
        start: z.string(),
        end: z.string(),
        allDay: z.boolean().default(false),
        location: z.string().optional(),
        color: z.string().optional(),
        recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).default('none'),
        attendeeIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { attendeeIds: _attendeeIds, ...eventData } = input;
      const now = new Date().toISOString();
      const eventId = `event-${Date.now()}`;

      const created: CalendarEvent = {
        id: eventId,
        ...eventData,
        createdAt: now,
        updatedAt: now,
        ownerId: ctx.user?.id || 'unknown',
        ownerName: ctx.user?.name || 'Unknown',
      };

      mockEvents.push(created);

      // Add creator as attendee
      mockAttendees[eventId] = [
        {
          id: `att-${Date.now()}`,
          userId: ctx.user?.id || 'unknown',
          name: ctx.user?.name || 'Unknown',
          email: ctx.user?.email || 'unknown@example.com',
          status: 'accepted',
        },
      ];

      return {
        code: 200,
        message: 'Event created successfully',
        data: created,
      };
    }),

  /**
   * Update event
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        start: z.string().optional(),
        end: z.string().optional(),
        allDay: z.boolean().optional(),
        location: z.string().optional(),
        color: z.string().optional(),
        recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      const existingIndex = mockEvents.findIndex((e) => e.id === id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Event with ID ${id} not found`,
        });
      }

      const existing = mockEvents[existingIndex];
      const updated: CalendarEvent = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      mockEvents[existingIndex] = updated;

      return {
        code: 200,
        message: 'Event updated successfully',
        data: updated,
      };
    }),

  /**
   * Delete event (Admin only)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const existingIndex = mockEvents.findIndex((e) => e.id === input.id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Event with ID ${input.id} not found`,
        });
      }

      mockEvents.splice(existingIndex, 1);
      delete mockAttendees[input.id];

      return {
        code: 200,
        message: 'Event deleted successfully',
        data: { id: input.id, deleted: true },
      };
    }),

  /**
   * Get event attendees
   */
  getAttendees: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ input }) => {
      const event = mockEvents.find((e) => e.id === input.eventId);

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Event with ID ${input.eventId} not found`,
        });
      }

      const attendees = mockAttendees[input.eventId] || [];

      return {
        code: 200,
        message: 'success',
        data: {
          eventId: input.eventId,
          attendees,
          total: attendees.length,
        },
      };
    }),

  /**
   * Add attendee to event
   */
  addAttendee: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        userId: z.string(),
        name: z.string(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const { eventId, userId, name, email } = input;
      const event = mockEvents.find((e) => e.id === eventId);

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Event with ID ${eventId} not found`,
        });
      }

      const attendees = mockAttendees[eventId] || [];
      const existing = attendees.find((a) => a.userId === userId);

      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User is already an attendee',
        });
      }

      const newAttendee: Attendee = {
        id: `att-${Date.now()}`,
        userId,
        name,
        email,
        status: 'pending',
      };

      if (!mockAttendees[eventId]) {
        mockAttendees[eventId] = [];
      }
      mockAttendees[eventId].push(newAttendee);

      return {
        code: 200,
        message: 'Attendee added successfully',
        data: newAttendee,
      };
    }),

  /**
   * Remove attendee from event
   */
  removeAttendee: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { eventId, userId } = input;
      const attendees = mockAttendees[eventId] || [];
      const attendeeIndex = attendees.findIndex((a) => a.userId === userId);

      if (attendeeIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Attendee not found',
        });
      }

      attendees.splice(attendeeIndex, 1);

      return {
        code: 200,
        message: 'Attendee removed successfully',
        data: { eventId, userId, removed: true },
      };
    }),

  /**
   * Update attendee status (RSVP)
   */
  updateAttendeeStatus: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        status: z.enum(['accepted', 'declined', 'tentative']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { eventId, status } = input;
      const attendees = mockAttendees[eventId] || [];
      const attendeeIndex = attendees.findIndex((a) => a.userId === ctx.user?.id);

      if (attendeeIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'You are not an attendee of this event',
        });
      }

      attendees[attendeeIndex] = { ...attendees[attendeeIndex], status };

      return {
        code: 200,
        message: 'RSVP updated successfully',
        data: attendees[attendeeIndex],
      };
    }),
});
