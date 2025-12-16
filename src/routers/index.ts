import { router } from '../trpc';
import { authRouter } from './auth';
import { usersRouter } from './users';
import { dashboardRouter } from './dashboard';
import { permissionsRouter } from './permissions';
import { rolesRouter } from './roles';
import { teamsRouter } from './teams';
import { foldersRouter } from './folders';
import { filesRouter } from './files';
import { documentsRouter } from './documents';
import { calendarRouter } from './calendar';
import { notificationsRouter } from './notifications';
import { messagesRouter } from './messages';

/**
 * Root router
 * Combines all sub-routers into a single API
 *
 * Available routers:
 * - auth: Authentication (login, register, token refresh)
 * - users: User management
 * - dashboard: Dashboard statistics
 * - permissions: Permission management
 * - roles: Role management
 * - teams: Team management
 * - folders: Folder management
 * - files: File management
 * - documents: Document management
 * - calendar: Calendar events
 * - notifications: User notifications
 * - messages: Messaging/chat
 */
export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  dashboard: dashboardRouter,
  permissions: permissionsRouter,
  roles: rolesRouter,
  teams: teamsRouter,
  folders: foldersRouter,
  files: filesRouter,
  documents: documentsRouter,
  calendar: calendarRouter,
  notifications: notificationsRouter,
  messages: messagesRouter,
});

/**
 * Export type for use in client
 */
export type AppRouter = typeof appRouter;
