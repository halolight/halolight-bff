import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Folder schema
 */
export const folderSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  path: z.string(),
  itemCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
});

export type Folder = z.infer<typeof folderSchema>;

/**
 * Folder tree node schema
 */
export interface FolderTreeNode extends Folder {
  children: FolderTreeNode[];
}

/**
 * Mock folders data
 */
const mockFolders: Folder[] = [
  {
    id: 'folder-root',
    name: 'Root',
    parentId: null,
    path: '/',
    itemCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
  },
  {
    id: 'folder-documents',
    name: 'Documents',
    parentId: 'folder-root',
    path: '/Documents',
    itemCount: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-1',
  },
  {
    id: 'folder-images',
    name: 'Images',
    parentId: 'folder-root',
    path: '/Images',
    itemCount: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-1',
  },
  {
    id: 'folder-projects',
    name: 'Projects',
    parentId: 'folder-root',
    path: '/Projects',
    itemCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-2',
  },
  {
    id: 'folder-specs',
    name: 'Specs',
    parentId: 'folder-documents',
    path: '/Documents/Specs',
    itemCount: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-1',
  },
  {
    id: 'folder-reports',
    name: 'Reports',
    parentId: 'folder-documents',
    path: '/Documents/Reports',
    itemCount: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-3',
  },
];

/**
 * Folders router
 */
export const foldersRouter = router({
  /**
   * List folders by parent ID
   */
  list: protectedProcedure
    .input(
      z
        .object({
          parentId: z.string().nullable().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { parentId = null, search } = input || {};
      let data = mockFolders.filter((f) => f.parentId === parentId);

      if (search) {
        const searchLower = search.toLowerCase();
        data = data.filter((f) => f.name.toLowerCase().includes(searchLower));
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
   * Get folder by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const folder = mockFolders.find((f) => f.id === input.id);

      if (!folder) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Folder with ID ${input.id} not found`,
        });
      }

      return {
        code: 200,
        message: 'success',
        data: folder,
      };
    }),

  /**
   * Create new folder
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required'),
        parentId: z.string().nullable().default(null),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { name, parentId } = input;

      // Check parent exists if specified
      let parentPath = '';
      if (parentId) {
        const parent = mockFolders.find((f) => f.id === parentId);
        if (!parent) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Parent folder with ID ${parentId} not found`,
          });
        }
        parentPath = parent.path;
      }

      // Check for duplicate name in same parent
      const existing = mockFolders.find(
        (f) => f.parentId === parentId && f.name.toLowerCase() === name.toLowerCase()
      );
      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Folder with name "${name}" already exists in this location`,
        });
      }

      const now = new Date().toISOString();
      const created: Folder = {
        id: `folder-${Date.now()}`,
        name,
        parentId,
        path: `${parentPath}/${name}`,
        itemCount: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.user?.id || 'unknown',
      };

      mockFolders.push(created);

      return {
        code: 200,
        message: 'Folder created successfully',
        data: created,
      };
    }),

  /**
   * Update folder
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, name } = input;
      const existingIndex = mockFolders.findIndex((f) => f.id === id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Folder with ID ${id} not found`,
        });
      }

      const existing = mockFolders[existingIndex];

      // Prevent renaming root folder
      if (existing.parentId === null && existing.name === 'Root') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot rename root folder',
        });
      }

      const updated: Folder = {
        ...existing,
        name: name || existing.name,
        updatedAt: new Date().toISOString(),
      };

      // Update path if name changed
      if (name && name !== existing.name) {
        const parentPath = existing.path.substring(0, existing.path.lastIndexOf('/'));
        updated.path = `${parentPath}/${name}`;
      }

      mockFolders[existingIndex] = updated;

      return {
        code: 200,
        message: 'Folder updated successfully',
        data: updated,
      };
    }),

  /**
   * Delete folder
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const existingIndex = mockFolders.findIndex((f) => f.id === input.id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Folder with ID ${input.id} not found`,
        });
      }

      const folder = mockFolders[existingIndex];

      // Prevent deleting root folder
      if (folder.parentId === null && folder.name === 'Root') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete root folder',
        });
      }

      // Check for children
      const hasChildren = mockFolders.some((f) => f.parentId === input.id);
      if (hasChildren) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete folder with subfolders. Delete subfolders first.',
        });
      }

      mockFolders.splice(existingIndex, 1);

      return {
        code: 200,
        message: 'Folder deleted successfully',
        data: { id: input.id, deleted: true },
      };
    }),

  /**
   * Get folder tree structure
   */
  getTree: protectedProcedure
    .input(
      z
        .object({
          rootId: z.string().nullable().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { rootId = null } = input || {};

      const buildTree = (parentId: string | null): FolderTreeNode[] => {
        return mockFolders
          .filter((f) => f.parentId === parentId)
          .map((f) => ({
            ...f,
            children: buildTree(f.id),
          }));
      };

      const tree = buildTree(rootId);

      return {
        code: 200,
        message: 'success',
        data: tree,
      };
    }),

  /**
   * Move folder to new parent
   */
  move: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        targetParentId: z.string().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, targetParentId } = input;
      const existingIndex = mockFolders.findIndex((f) => f.id === id);

      if (existingIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Folder with ID ${id} not found`,
        });
      }

      const folder = mockFolders[existingIndex];

      // Prevent moving root folder
      if (folder.parentId === null && folder.name === 'Root') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot move root folder',
        });
      }

      // Prevent moving to itself or its children
      if (targetParentId === id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot move folder into itself',
        });
      }

      // Check target parent exists
      let newPath = `/${folder.name}`;
      if (targetParentId) {
        const targetParent = mockFolders.find((f) => f.id === targetParentId);
        if (!targetParent) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Target folder with ID ${targetParentId} not found`,
          });
        }
        newPath = `${targetParent.path}/${folder.name}`;
      }

      const updated: Folder = {
        ...folder,
        parentId: targetParentId,
        path: newPath,
        updatedAt: new Date().toISOString(),
      };

      mockFolders[existingIndex] = updated;

      return {
        code: 200,
        message: 'Folder moved successfully',
        data: updated,
      };
    }),

  /**
   * Get breadcrumb path for a folder
   */
  getBreadcrumb: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const folder = mockFolders.find((f) => f.id === input.id);

      if (!folder) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Folder with ID ${input.id} not found`,
        });
      }

      const breadcrumb: Array<{ id: string; name: string }> = [];
      let current: Folder | undefined = folder;

      while (current) {
        breadcrumb.unshift({ id: current.id, name: current.name });
        current = current.parentId
          ? mockFolders.find((f) => f.id === current!.parentId)
          : undefined;
      }

      return {
        code: 200,
        message: 'success',
        data: breadcrumb,
      };
    }),
});
