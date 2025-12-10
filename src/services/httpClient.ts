import { TRPCError } from '@trpc/server';
import { z } from 'zod';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HttpClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
}

export interface RequestOptions<TBody = unknown> {
  path: string;
  method?: HttpMethod;
  query?: Record<string, string | number | boolean | undefined>;
  body?: TBody;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  token?: string;
  traceId?: string;
}

export interface HttpClient {
  request<TResponse>(
    options: RequestOptions,
    schema?: z.ZodSchema<TResponse>
  ): Promise<TResponse>;
  get<TResponse>(
    path: string,
    options?: Omit<RequestOptions, 'path' | 'method'>,
    schema?: z.ZodSchema<TResponse>
  ): Promise<TResponse>;
  post<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<RequestOptions, 'path' | 'method' | 'body'>,
    schema?: z.ZodSchema<TResponse>
  ): Promise<TResponse>;
  put<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<RequestOptions, 'path' | 'method' | 'body'>,
    schema?: z.ZodSchema<TResponse>
  ): Promise<TResponse>;
  patch<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<RequestOptions, 'path' | 'method' | 'body'>,
    schema?: z.ZodSchema<TResponse>
  ): Promise<TResponse>;
  delete<TResponse>(
    path: string,
    options?: Omit<RequestOptions, 'path' | 'method'>,
    schema?: z.ZodSchema<TResponse>
  ): Promise<TResponse>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Map HTTP status codes to tRPC error codes
 */
function mapHttpStatusToTRPCCode(
  status: number
): 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'TIMEOUT' | 'INTERNAL_SERVER_ERROR' {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 408:
    case 504:
      return 'TIMEOUT';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

/**
 * Create HTTP client for backend service communication
 */
export function createHttpClient(config: HttpClientConfig): HttpClient {
  const { baseUrl, defaultHeaders = {}, timeoutMs = 10000, retries = 2 } = config;

  const buildUrl = (path: string, query?: RequestOptions['query']): string => {
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${base}${normalizedPath}`);

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  };

  const doFetch = async <TResponse>(
    opts: RequestOptions,
    schema?: z.ZodSchema<TResponse>
  ): Promise<TResponse> => {
    const {
      path,
      method = 'GET',
      query,
      body,
      headers,
      timeoutMs: perReqTimeout,
      token,
      traceId,
    } = opts;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), perReqTimeout ?? timeoutMs);

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...defaultHeaders,
      ...headers,
    };

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    if (traceId) {
      requestHeaders['X-Trace-Id'] = traceId;
      requestHeaders['X-Request-Id'] = traceId;
    }

    try {
      const response = await fetch(buildUrl(path, query), {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const raw = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const rawObj = raw as Record<string, unknown>;
        const errorMessage =
          typeof raw === 'string'
            ? raw
            : (rawObj?.message as string) || (rawObj?.error as string) || `Request failed with status ${response.status}`;

        throw new TRPCError({
          code: mapHttpStatusToTRPCCode(response.status),
          message: errorMessage,
          cause: { status: response.status, body: raw },
        });
      }

      if (!schema) {
        return raw as TResponse;
      }

      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        console.error('Response validation failed:', parsed.error.errors);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Response validation failed',
          cause: parsed.error,
        });
      }

      return parsed.data;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        throw new TRPCError({
          code: 'TIMEOUT',
          message: 'Request timed out',
        });
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        cause: error,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  const request = async <TResponse>(
    options: RequestOptions,
    schema?: z.ZodSchema<TResponse>
  ): Promise<TResponse> => {
    const maxAttempts = (options.retries ?? retries) + 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await doFetch(options, schema);
      } catch (error) {
        lastError = error;

        const isLastAttempt = attempt === maxAttempts;
        const isIdempotent = ['GET', 'PUT', 'DELETE'].includes(options.method || 'GET');
        const isRetryable =
          error instanceof TRPCError &&
          ['TIMEOUT', 'INTERNAL_SERVER_ERROR'].includes(error.code);

        if (isLastAttempt || !isRetryable || !isIdempotent) {
          break;
        }

        const backoffMs = Math.min(100 * Math.pow(2, attempt - 1), 2000);
        await sleep(backoffMs);
      }
    }

    throw lastError;
  };

  return {
    request,

    get<TResponse>(
      path: string,
      options?: Omit<RequestOptions, 'path' | 'method'>,
      schema?: z.ZodSchema<TResponse>
    ): Promise<TResponse> {
      return request({ ...options, path, method: 'GET' }, schema);
    },

    post<TResponse, TBody = unknown>(
      path: string,
      body?: TBody,
      options?: Omit<RequestOptions, 'path' | 'method' | 'body'>,
      schema?: z.ZodSchema<TResponse>
    ): Promise<TResponse> {
      return request({ ...options, path, method: 'POST', body }, schema);
    },

    put<TResponse, TBody = unknown>(
      path: string,
      body?: TBody,
      options?: Omit<RequestOptions, 'path' | 'method' | 'body'>,
      schema?: z.ZodSchema<TResponse>
    ): Promise<TResponse> {
      return request({ ...options, path, method: 'PUT', body }, schema);
    },

    patch<TResponse, TBody = unknown>(
      path: string,
      body?: TBody,
      options?: Omit<RequestOptions, 'path' | 'method' | 'body'>,
      schema?: z.ZodSchema<TResponse>
    ): Promise<TResponse> {
      return request({ ...options, path, method: 'PATCH', body }, schema);
    },

    delete<TResponse>(
      path: string,
      options?: Omit<RequestOptions, 'path' | 'method'>,
      schema?: z.ZodSchema<TResponse>
    ): Promise<TResponse> {
      return request({ ...options, path, method: 'DELETE' }, schema);
    },
  };
}
