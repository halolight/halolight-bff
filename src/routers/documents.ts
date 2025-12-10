import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Document schema
 */
export const documentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  folderId: z.string().nullable(),
  status: z.enum(['draft', 'published', 'archived']),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  ownerId: z.string(),
  ownerName: z.string(),
});

export type Document = z.infer<typeof documentSchema>;

/**
 * Document version schema
 */
export const documentVersionSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  version: z.number().int(),
  content: z.string(),
  createdAt: z.string(),
  createdBy: z.string(),
  createdByName: z.string(),
});

export type DocumentVersion = z.infer<typeof documentVersionSchema>;

/**
 * Mock documents data
 */
const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    title: 'Project Overview',
    content: '# Project Overview\n\nThis document describes the project architecture and goals.',
    folderId: 'folder-documents',
    status: 'published',
    tags: ['project', 'overview'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: 'user-1',
    ownerName: 'Admin User',
  },
  {
    id: 'doc-2',
    title: 'API Specification',
    content: '# API Specification\n\n## Endpoints\n\n- GET /api/users\n- POST /api/users',
    folderId: 'folder-specs',
    status: 'published',
    tags: ['api', 'spec', 'technical'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: 'user-2',
    ownerName: 'Developer',
  },
  {
    id: 'doc-3',
    title: 'Meeting Notes - Q4 Planning',
    content: '# Q4 Planning Meeting\n\n## Attendees\n- Team Lead\n- Product Manager',
    folderId: null,
    status: 'draft',
    tags: ['meeting', 'planning'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: 'user-1',
    ownerName: 'Admin User',
  },
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `doc-${i + 4}`,
    title: `Document ${i + 4}`,
    content: `Content of document ${i + 4}`,
    folderId: 'folder-documents',
    status: 'published' as const,
    tags: ['general'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: `user-${(i % 3) + 1}`,
    ownerName: `User ${(i % 3) + 1}`,
  })),
];

/**
 * Mock document versions
 */
const mockVersions: DocumentVersion[] = [
  {
    id: 'ver-1',
    documentId: 'doc-1',
    version: 1,
    content: '# Project Overview\n\nInitial draft.',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    createdBy: 'user-1',
    createdByName: 'Admin User',
  },
  {
    id: 'ver-2',
    documentId: 'doc-1',
    version: 2,
    content: '# Project Overview\n\nUpdated with architecture details.',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    createdBy: 'user-1',
    createdByName: 'Admin User',
  },
  {
    id: 'ver-3',
    documentId: 'doc-1',
    version: 3,
    content: '# Project Overview\n\nThis document describes the project architecture and goals.',
    createdAt: new Date().toISOString(),
    createdBy: 'user-2',
    createdByName: 'Developer',
  },
];

/**
 * Documents router
 */
export const documentsRouter = router({
  /**
   * List documents with pagination and filters
   */
  list: protectedProcedure
    .input(
      z
        .object({
          folderId: z.string().nullable().optional(),
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(20),
          search: z.string().optional(),
          status: z.enum(['draft', 'published', 'archived']).optional(),
          tags: z.array(z.string()).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { folderId, page = 1, limit = 20, search, status, tags } = input || {};
      let data = [...mockDocuments];

      if (folderId !== undefined) {
        data = data.filter((d) => d.folderId === folderId);
      }

      if (search) {
        const searchLower = search.toLowerCase();
        data = data.filter(
          (d) =>
            d.title.toLowerCase().includes(searchLower) ||
            d.content.toLowerCase().includes(searchLower)
        );
      }

      if (status) {
        data = data.filter((d) => d.status === status);
      }

      if (tags && tags.length > 0) {
        data = data.filter((d) => tags.some((tag) => d.tags.includes(tag)));
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
   * Get document by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const doc = mockDocuments.find((d) => d.id === input.id);

      if (!doc) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Document with ID ${input.id} not found`,
        });
      }

      return {
        code: 200,
        message: 'success',
        data: doc,
      };
    }),

  /**
   * Create new document
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, 'Title is required'),
        content: z.string().default(''),
        folderId: z.string().nullable().optional(),
        status: z.enum(['draft', 'published']).default('draft'),
        tags: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const now = new Date().toISOString();
      const created: Document = {
        id: `doc-${Date.now()}`,
        title: input.title,
        content: input.content,
        folderId: input.folderId ?? null,
        status: input.status,
        tags: input.tags,
        createdAt: now,
        updatedAt: now,
        ownerId: ctx.user?.id || 'unknown',
        ownerName: ctx.user?.name || 'Unknown',
      };

      mockDocuments.push(created);

      // Create initial version
      mockVersions.push({
        id: `ver-${Date.now()}`,
        documentId: created.id,
        version: 1,
        content: input.content,
        createdAt: now,
        createdBy: ctx.user?.id || 'unknown',
        createdByName: ctx.user?.name || 'Unknown',
      });

      return {
        code: 200,
        message: 'Document created successfully',
        data: created,
      };
    }),

  /**
   * Update document
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        content: z.string().optional(),
        status: z.enum(['draft', 'published', 'archived']).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      const existingIndex = mockDocuments.findIndex((d) => d.id === id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Document with ID ${id} not found`,
        });
      }

      const existing = mockDocuments[existingIndex];
      const now = new Date().toISOString();

      const updated: Document = {
        ...existing,
        ...updates,
        updatedAt: now,
      };

      mockDocuments[existingIndex] = updated;

      // Create new version if content changed
      if (updates.content && updates.content !== existing.content) {
        const latestVersion = mockVersions
          .filter((v) => v.documentId === id)
          .sort((a, b) => b.version - a.version)[0];

        mockVersions.push({
          id: `ver-${Date.now()}`,
          documentId: id,
          version: (latestVersion?.version || 0) + 1,
          content: updates.content,
          createdAt: now,
          createdBy: ctx.user?.id || 'unknown',
          createdByName: ctx.user?.name || 'Unknown',
        });
      }

      return {
        code: 200,
        message: 'Document updated successfully',
        data: updated,
      };
    }),

  /**
   * Delete document (Admin only)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const existingIndex = mockDocuments.findIndex((d) => d.id === input.id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Document with ID ${input.id} not found`,
        });
      }

      mockDocuments.splice(existingIndex, 1);

      // Remove versions
      const versionIndexes = mockVersions
        .map((v, i) => (v.documentId === input.id ? i : -1))
        .filter((i) => i !== -1)
        .reverse();
      versionIndexes.forEach((i) => mockVersions.splice(i, 1));

      return {
        code: 200,
        message: 'Document deleted successfully',
        data: { id: input.id, deleted: true },
      };
    }),

  /**
   * Get document version history
   */
  getVersions: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ input }) => {
      const doc = mockDocuments.find((d) => d.id === input.documentId);

      if (!doc) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Document with ID ${input.documentId} not found`,
        });
      }

      const versions = mockVersions
        .filter((v) => v.documentId === input.documentId)
        .sort((a, b) => b.version - a.version);

      return {
        code: 200,
        message: 'success',
        data: versions,
      };
    }),

  /**
   * Get specific version
   */
  getVersion: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        version: z.number().int(),
      })
    )
    .query(async ({ input }) => {
      const version = mockVersions.find(
        (v) => v.documentId === input.documentId && v.version === input.version
      );

      if (!version) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Version ${input.version} not found for document ${input.documentId}`,
        });
      }

      return {
        code: 200,
        message: 'success',
        data: version,
      };
    }),

  /**
   * Share document with users
   */
  share: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        targetUserIds: z.array(z.string()).min(1),
        permission: z.enum(['view', 'edit']).default('view'),
      })
    )
    .mutation(async ({ input }) => {
      const { documentId, targetUserIds, permission } = input;
      const doc = mockDocuments.find((d) => d.id === documentId);

      if (!doc) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Document with ID ${documentId} not found`,
        });
      }

      // TODO: Save share settings to database
      return {
        code: 200,
        message: 'Document shared successfully',
        data: {
          documentId,
          sharedWith: targetUserIds,
          permission,
        },
      };
    }),

  /**
   * Restore document to specific version
   */
  restoreVersion: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        version: z.number().int(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { documentId, version } = input;
      const docIndex = mockDocuments.findIndex((d) => d.id === documentId);

      if (docIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Document with ID ${documentId} not found`,
        });
      }

      const targetVersion = mockVersions.find(
        (v) => v.documentId === documentId && v.version === version
      );

      if (!targetVersion) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Version ${version} not found`,
        });
      }

      const now = new Date().toISOString();
      const doc = mockDocuments[docIndex];

      // Update document with version content
      mockDocuments[docIndex] = {
        ...doc,
        content: targetVersion.content,
        updatedAt: now,
      };

      // Create new version for the restore
      const latestVersion = mockVersions
        .filter((v) => v.documentId === documentId)
        .sort((a, b) => b.version - a.version)[0];

      mockVersions.push({
        id: `ver-${Date.now()}`,
        documentId,
        version: (latestVersion?.version || 0) + 1,
        content: targetVersion.content,
        createdAt: now,
        createdBy: ctx.user?.id || 'unknown',
        createdByName: ctx.user?.name || 'Unknown',
      });

      return {
        code: 200,
        message: `Document restored to version ${version}`,
        data: mockDocuments[docIndex],
      };
    }),

  /**
   * Get all tags used in documents
   */
  getTags: protectedProcedure.query(async () => {
    const allTags = mockDocuments.flatMap((d) => d.tags);
    const uniqueTags = [...new Set(allTags)].sort();

    return {
      code: 200,
      message: 'success',
      data: uniqueTags,
    };
  }),
});
