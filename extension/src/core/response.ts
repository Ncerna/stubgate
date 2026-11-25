import type { PageRule } from './types';

const STATUS_TEXT: Record<number, string> = {
  200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
  301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
  405: 'Method Not Allowed', 409: 'Conflict', 410: 'Gone', 422: 'Unprocessable Entity',
  429: 'Too Many Requests', 500: 'Internal Server Error', 502: 'Bad Gateway',
  503: 'Service Unavailable', 504: 'Gateway Timeout',
};

export function statusText(status: number): string {
  return STATUS_TEXT[status] ?? '';
}

// A Response with one of these statuses cannot carry a body.
const NULL_BODY_STATUS = new Set([204, 205, 304]);

export interface MockResponseSpec {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string | null;
  delayMs: number;
}

export function toMockResponse(rule: PageRule): MockResponseSpec {
  const { status, headers, body, delayMs } = rule.response;
  return {
    status,
    statusText: statusText(status),
    headers: Object.fromEntries(Object.entries(headers).filter(([k, v]) => k !== '' || v !== '')),
    body: NULL_BODY_STATUS.has(status) ? null : body,
    delayMs,
  };
}
