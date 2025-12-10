import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * File schema
 */
export const fileSchema = z.object({
  id: z.string(),
  name: z.string(),
  folderId: z.string().nullable(),
  size: z.number().int(),
  mimeType: z.string(),
  url: z.string(),
  thumbnailUrl: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
});

export type File = z.infer<typeof fileSchema>;

/**
 * Mock files data
 */
const mockFiles: File[] = [
  {
    id: 'file-1',
    name: 'project-spec.pdf',
    folderId: 'folder-specs',
    size: 1024 * 1024 * 2.5,
    mimeType: 'application/pdf',
    url: 'https://storage.example.com/files/project-spec.pdf',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-1',
  },
  {
    id: 'file-2',
    name: 'logo.png',
    folderId: 'folder-images',
    size: 1024 * 512,
    mimeType: 'image/png',
    url: 'https://storage.example.com/files/logo.png',
    thumbnailUrl: 'https://storage.example.com/thumbnails/logo.png',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-2',
  },
  {
    id: 'file-3',
    name: 'report-2024.xlsx',
    folderId: 'folder-reports',
    size: 1024 * 1024 * 1.2,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    url: 'https://storage.example.com/files/report-2024.xlsx',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-1',
  },
  ...Array.from({ length: 7 }, (_, i) => ({
    id: `file-${i + 4}`,
    name: `document-${i + 1}.docx`,
    folderId: 'folder-documents',
    size: 1024 * (100 + i * 50),
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    url: `https://storage.example.com/files/document-${i + 1}.docx`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: `user-${(i % 3) + 1}`,
  })),
];

/**
 * Files router
 */
export const filesRouter = router({
  /**
   * List files with pagination and filters
   */
  list: protectedProcedure
    .input(
      z
        .object({
          folderId: z.string().nullable().optional(),
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(20),
          search: z.string().optional(),
          mimeType: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { folderId, page = 1, limit = 20, search, mimeType } = input || {};
      let data = [...mockFiles];

      if (folderId !== undefined) {
        data = data.filter((f) => f.folderId === folderId);
      }

      if (search) {
        const searchLower = search.toLowerCase();
        data = data.filter((f) => f.name.toLowerCase().includes(searchLower));
      }

      if (mimeType) {
        data = data.filter((f) => f.mimeType.startsWith(mimeType));
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
   * Get file by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const file = mockFiles.find((f) => f.id === input.id);

      if (!file) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `File with ID ${input.id} not found`,
        });
      }

      return {
        code: 200,
        message: 'success',
        data: file,
      };
    }),

  /**
   * Upload file (returns presigned URL for upload)
   */
  upload: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'File name is required'),
        folderId: z.string().nullable().optional(),
        size: z.number().int().positive('File size must be positive'),
        mimeType: z.string().min(1, 'MIME type is required'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { name, folderId, size, mimeType } = input;

      // Validate file size (max 100MB)
      const maxSize = 100 * 1024 * 1024;
      if (size > maxSize) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'File size exceeds maximum allowed (100MB)',
        });
      }

      const now = new Date().toISOString();
      const fileId = `file-${Date.now()}`;
      const uploadUrl = `https://upload.example.com/${fileId}?token=mock-presigned-token`;

      const file: File = {
        id: fileId,
        name,
        folderId: folderId ?? null,
        size,
        mimeType,
        url: `https://storage.example.com/files/${fileId}/${name}`,
        thumbnailUrl: mimeType.startsWith('image/')
          ? `https://storage.example.com/thumbnails/${fileId}/${name}`
          : undefined,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.user?.id || 'unknown',
      };

      mockFiles.push(file);

      return {
        code: 200,
        message: 'Upload URL generated successfully',
        data: {
          file,
          uploadUrl,
          expiresIn: 3600,
        },
      };
    }),

  /**
   * Update file metadata
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        folderId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      const existingIndex = mockFiles.findIndex((f) => f.id === id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `File with ID ${id} not found`,
        });
      }

      const existing = mockFiles[existingIndex];
      const updated: File = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      mockFiles[existingIndex] = updated;

      return {
        code: 200,
        message: 'File updated successfully',
        data: updated,
      };
    }),

  /**
   * Delete file (Admin only)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const existingIndex = mockFiles.findIndex((f) => f.id === input.id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `File with ID ${input.id} not found`,
        });
      }

      mockFiles.splice(existingIndex, 1);

      return {
        code: 200,
        message: 'File deleted successfully',
        data: { id: input.id, deleted: true },
      };
    }),

  /**
   * Move file to another folder
   */
  move: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        targetFolderId: z.string().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, targetFolderId } = input;
      const existingIndex = mockFiles.findIndex((f) => f.id === id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `File with ID ${id} not found`,
        });
      }

      const existing = mockFiles[existingIndex];
      const updated: File = {
        ...existing,
        folderId: targetFolderId,
        updatedAt: new Date().toISOString(),
      };

      mockFiles[existingIndex] = updated;

      return {
        code: 200,
        message: 'File moved successfully',
        data: updated,
      };
    }),

  /**
   * Copy file to another folder
   */
  copy: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        targetFolderId: z.string().nullable(),
        newName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, targetFolderId, newName } = input;
      const original = mockFiles.find((f) => f.id === id);

      if (!original) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `File with ID ${id} not found`,
        });
      }

      const now = new Date().toISOString();
      const copied: File = {
        ...original,
        id: `file-${Date.now()}`,
        name: newName || `Copy of ${original.name}`,
        folderId: targetFolderId,
        url: `https://storage.example.com/files/${Date.now()}/${newName || original.name}`,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.user?.id || 'unknown',
      };

      mockFiles.push(copied);

      return {
        code: 200,
        message: 'File copied successfully',
        data: copied,
      };
    }),

  /**
   * Get download URL for file
   */
  download: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const file = mockFiles.find((f) => f.id === input.id);

      if (!file) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `File with ID ${input.id} not found`,
        });
      }

      const downloadUrl = `${file.url}?action=download&token=mock-download-token`;

      return {
        code: 200,
        message: 'success',
        data: {
          downloadUrl,
          fileName: file.name,
          mimeType: file.mimeType,
          size: file.size,
          expiresIn: 3600,
        },
      };
    }),

  /**
   * Batch delete files (Admin only)
   */
  batchDelete: adminProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ input }) => {
      const { ids } = input;
      const deleted: string[] = [];
      const notFound: string[] = [];

      ids.forEach((id) => {
        const index = mockFiles.findIndex((f) => f.id === id);
        if (index !== -1) {
          mockFiles.splice(index, 1);
          deleted.push(id);
        } else {
          notFound.push(id);
        }
      });

      return {
        code: 200,
        message: `${deleted.length} files deleted successfully`,
        data: {
          deleted,
          notFound,
        },
      };
    }),
});
