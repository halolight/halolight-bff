import { TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';
import { middleware } from '../trpc';
import { User } from '../context';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to context
 */
export const isAuthenticated = middleware(async ({ ctx, next }) => {
  const token = ctx.req.headers.authorization?.split(' ')[1];

  if (!token) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'No authentication token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key') as User;
    return next({
      ctx: {
        ...ctx,
        user: decoded,
      },
    });
  } catch (_error) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    });
  }
});

/**
 * Authorization middleware
 * Checks if user has required permissions
 */
export const hasPermission = (permission: string) => {
  return middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { permissions } = ctx.user.role;

    // Admin has all permissions
    if (permissions.includes('*')) {
      return next({ ctx });
    }

    // Check if user has the required permission
    if (!permissions.includes(permission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Permission denied: ${permission} required`,
      });
    }

    return next({ ctx });
  });
};

/**
 * Role-based authorization middleware
 */
export const hasRole = (role: string) => {
  return middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    if (ctx.user.role.name !== role) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Access denied: ${role} role required`,
      });
    }

    return next({ ctx });
  });
};
