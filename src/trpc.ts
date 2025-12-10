import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { TRPCContext } from './context';

/**
 * Initialize tRPC with context and superjson transformer
 */
const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

/**
 * Public procedures - no authentication required
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedures - requires authentication
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Admin procedures - requires admin role
 */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role.name !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }
  return next({ ctx });
});

/**
 * Router creator
 */
export const router = t.router;

/**
 * Middleware creator
 */
export const middleware = t.middleware;
