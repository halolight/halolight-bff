import { createHttpClient, HttpClient, HttpClientConfig } from './httpClient';

/**
 * Supported backend service types
 */
export type ServiceKind = 'python' | 'bun' | 'java' | 'nestjs' | 'node' | 'go';

/**
 * Service configuration
 */
export interface ServiceConfig {
  name: ServiceKind;
  baseUrl: string;
  healthPath?: string;
  priority?: number;
}

/**
 * Environment variable mapping for each service
 */
const ENV_VAR_MAP: Record<ServiceKind, string> = {
  python: 'HALOLIGHT_API_PYTHON_URL',
  bun: 'HALOLIGHT_API_BUN_URL',
  java: 'HALOLIGHT_API_JAVA_URL',
  nestjs: 'HALOLIGHT_API_NESTJS_URL',
  node: 'HALOLIGHT_API_NODE_URL',
  go: 'HALOLIGHT_API_GO_URL',
};

/**
 * Default priority for services (lower is higher priority)
 */
const DEFAULT_PRIORITY: Record<ServiceKind, number> = {
  nestjs: 1,
  python: 2,
  bun: 3,
  java: 4,
  node: 5,
  go: 6,
};

const DEFAULT_HEALTH_PATH = '/health';

/**
 * Client cache to avoid creating multiple instances
 */
const clientCache = new Map<ServiceKind, HttpClient>();

/**
 * Load service configurations from environment variables
 */
function loadServices(): Map<ServiceKind, ServiceConfig> {
  const services = new Map<ServiceKind, ServiceConfig>();

  (Object.keys(ENV_VAR_MAP) as ServiceKind[]).forEach((kind) => {
    const baseUrl = process.env[ENV_VAR_MAP[kind]];
    if (baseUrl) {
      services.set(kind, {
        name: kind,
        baseUrl: baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl,
        healthPath: DEFAULT_HEALTH_PATH,
        priority: DEFAULT_PRIORITY[kind],
      });
    }
  });

  return services;
}

/**
 * Service registry singleton
 */
class ServiceRegistry {
  private services: Map<ServiceKind, ServiceConfig>;
  private defaultService: ServiceKind | null = null;

  constructor() {
    this.services = loadServices();
    this.defaultService = this.findDefaultService();
  }

  /**
   * Reload services from environment (useful for testing)
   */
  reload(): void {
    clientCache.clear();
    this.services = loadServices();
    this.defaultService = this.findDefaultService();
  }

  /**
   * Find the default service based on priority
   */
  private findDefaultService(): ServiceKind | null {
    if (this.services.size === 0) return null;

    const sorted = Array.from(this.services.values()).sort(
      (a, b) => (a.priority ?? 99) - (b.priority ?? 99)
    );

    return sorted[0]?.name ?? null;
  }

  /**
   * Get all configured services
   */
  getServices(): ServiceConfig[] {
    return Array.from(this.services.values());
  }

  /**
   * Check if a service is configured
   */
  hasService(name: ServiceKind): boolean {
    return this.services.has(name);
  }

  /**
   * Get service configuration
   */
  getServiceConfig(name: ServiceKind): ServiceConfig | undefined {
    return this.services.get(name);
  }

  /**
   * Get HTTP client for a specific service
   */
  getClient(name: ServiceKind, options?: Partial<HttpClientConfig>): HttpClient {
    const cached = clientCache.get(name);
    if (cached && !options) {
      return cached;
    }

    const service = this.services.get(name);
    if (!service) {
      throw new Error(
        `Service "${name}" is not configured. Set ${ENV_VAR_MAP[name]} environment variable.`
      );
    }

    const client = createHttpClient({
      baseUrl: service.baseUrl,
      timeoutMs: 10000,
      retries: 2,
      ...options,
    });

    if (!options) {
      clientCache.set(name, client);
    }

    return client;
  }

  /**
   * Get the default HTTP client (highest priority available service)
   */
  getDefaultClient(options?: Partial<HttpClientConfig>): HttpClient {
    if (!this.defaultService) {
      throw new Error('No backend services configured. Set at least one HALOLIGHT_API_*_URL.');
    }

    return this.getClient(this.defaultService, options);
  }

  /**
   * Get the default service name
   */
  getDefaultServiceName(): ServiceKind | null {
    return this.defaultService;
  }

  /**
   * Check service health
   */
  async checkHealth(name: ServiceKind): Promise<{ healthy: boolean; latencyMs: number }> {
    const service = this.services.get(name);
    if (!service) {
      return { healthy: false, latencyMs: -1 };
    }

    const start = Date.now();
    try {
      const client = this.getClient(name);
      await client.get<{ status?: string }>(service.healthPath || DEFAULT_HEALTH_PATH, {
        timeoutMs: 3000,
        retries: 0,
      });
      return { healthy: true, latencyMs: Date.now() - start };
    } catch {
      return { healthy: false, latencyMs: Date.now() - start };
    }
  }

  /**
   * Check health of all configured services
   */
  async checkAllHealth(): Promise<Record<ServiceKind, { healthy: boolean; latencyMs: number }>> {
    const results: Record<string, { healthy: boolean; latencyMs: number }> = {};

    await Promise.all(
      Array.from(this.services.keys()).map(async (name) => {
        results[name] = await this.checkHealth(name);
      })
    );

    return results as Record<ServiceKind, { healthy: boolean; latencyMs: number }>;
  }
}

/**
 * Singleton instance
 */
export const serviceRegistry = new ServiceRegistry();

/**
 * Convenience function to get a service client
 */
export function getServiceClient(name: ServiceKind): HttpClient {
  return serviceRegistry.getClient(name);
}

/**
 * Convenience function to get the default service client
 */
export function getDefaultClient(): HttpClient {
  return serviceRegistry.getDefaultClient();
}
