import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { serviceRegistry, HttpClient, ServiceKind } from './services';

export interface User {
  id: string;
  name: string;
  email: string;
  role: {
    id: string;
    name: string;
    label: string;
    permissions: string[];
  };
}

export interface ServiceClients {
  /**
   * Get HTTP client for a specific backend service
   */
  get(name: ServiceKind): HttpClient;
  /**
   * Get the default backend service client
   */
  getDefault(): HttpClient;
}

export interface Context {
  req: Request;
  res: Response;
  user: User | null;
  /** Raw JWT token from request (for forwarding to backend services) */
  token: string | null;
  /** Unique trace ID for request tracking */
  traceId: string;
  /** Backend service clients */
  services: ServiceClients;
}

/**
 * Create context for tRPC requests
 * Extracts and verifies JWT token from Authorization header
 */
export async function createContext({ req, res }: { req: Request; res: Response }): Promise<Context> {
  const token = req.headers.authorization?.split(' ')[1] ?? null;
  let user: User | null = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key') as User;
      user = decoded;
    } catch (error) {
      // Token invalid or expired - user remains null
      console.warn('Invalid token:', error);
    }
  }

  // Get or generate trace ID
  const traceId =
    (req.headers['x-trace-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    randomUUID();

  // Create service clients factory with request context
  const services: ServiceClients = {
    get(name: ServiceKind): HttpClient {
      return serviceRegistry.getClient(name, {
        defaultHeaders: {
          'X-Trace-Id': traceId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    },
    getDefault(): HttpClient {
      return serviceRegistry.getDefaultClient({
        defaultHeaders: {
          'X-Trace-Id': traceId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    },
  };

  return {
    req,
    res,
    user,
    token,
    traceId,
    services,
  };
}

export type TRPCContext = Context;
