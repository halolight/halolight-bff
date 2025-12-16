export { createHttpClient } from './httpClient';
export type { HttpClient, HttpClientConfig, RequestOptions } from './httpClient';

export {
  serviceRegistry,
  getServiceClient,
  getDefaultClient,
} from './serviceRegistry';
export type { ServiceKind, ServiceConfig } from './serviceRegistry';
