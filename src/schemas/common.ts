import { z } from 'zod';

/**
 * Pagination request schema
 */
export const paginationRequestSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

/**
 * Pagination response schema
 */
export const paginationResponseSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0).optional(),
});

/**
 * Sort direction enum
 */
export const sortDirectionSchema = z.enum(['asc', 'desc']);

/**
 * Sort schema for ordering results
 */
export const sortSchema = z.object({
  field: z.string(),
  direction: sortDirectionSchema.default('asc'),
});

/**
 * Search/filter schema for list queries
 */
export const searchFilterSchema = z.object({
  search: z.string().optional(),
  sort: sortSchema.optional(),
});

/**
 * Audit fields schema for tracking entity changes
 */
export const auditFieldsSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  deletedAt: z.string().datetime().optional(),
});

/**
 * Partial audit fields for responses that may not include all fields
 */
export const partialAuditFieldsSchema = auditFieldsSchema.partial();

/**
 * Generic API response schema factory
 */
export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    code: z.number().int(),
    message: z.string(),
    data: dataSchema,
  });
}

/**
 * Generic paginated list response schema factory
 */
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return createApiResponseSchema(
    z.object({
      list: z.array(itemSchema),
      total: z.number().int().min(0),
      page: z.number().int().min(1),
      limit: z.number().int().min(1),
      totalPages: z.number().int().min(0).optional(),
    })
  );
}

/**
 * Base API response schema (without typed data)
 */
export const apiResponseSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.unknown().nullable(),
});

/**
 * Success response schema (code 200)
 */
export const successResponseSchema = apiResponseSchema.extend({
  code: z.literal(200),
});

/**
 * Error response schema
 */
export const errorResponseSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  error: z.string().optional(),
  details: z.record(z.array(z.string())).optional(),
});

/**
 * ID parameter schema
 */
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

/**
 * Status enum for entities
 */
export const entityStatusSchema = z.enum(['active', 'inactive', 'suspended', 'deleted']);

// Type exports
export type PaginationRequest = z.infer<typeof paginationRequestSchema>;
export type PaginationResponse = z.infer<typeof paginationResponseSchema>;
export type Sort = z.infer<typeof sortSchema>;
export type SortDirection = z.infer<typeof sortDirectionSchema>;
export type SearchFilter = z.infer<typeof searchFilterSchema>;
export type AuditFields = z.infer<typeof auditFieldsSchema>;
export type ApiResponse<T = unknown> = {
  code: number;
  message: string;
  data: T;
};
export type PaginatedData<T> = {
  list: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
};
export type EntityStatus = z.infer<typeof entityStatusSchema>;
