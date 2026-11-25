import { describe, expect, it } from 'vitest';
import { newRule } from './defaults';
import { statusText, toMockResponse } from './response';

describe('toMockResponse', () => {
  it('copies status, headers, body and delay, and adds the status text', () => {
    const spec = toMockResponse(newRule({ response: { status: 404, delayMs: 250, body: '{"a":1}' } }));
    expect(spec).toMatchObject({ status: 404, statusText: 'Not Found', delayMs: 250, body: '{"a":1}' });
    expect(spec.headers['Content-Type']).toBe('application/json');
  });

  it.each([204, 205, 304])('sends no body for status %i (a Response cannot carry one)', (status) => {
    expect(toMockResponse(newRule({ response: { status, body: 'ignored' } })).body).toBeNull();
    // and the resulting object is accepted by the platform
    expect(() => new Response(null, { status })).not.toThrow();
  });

  it('drops an empty header row so new Response() does not throw', () => {
    const spec = toMockResponse(newRule({ response: { headers: { '': '', 'X-A': '1' } } }));
    expect(spec.headers).toEqual({ 'X-A': '1' });
    expect(() => new Response('x', { headers: spec.headers })).not.toThrow();
  });

  it('builds a real Response from the spec', async () => {
    const spec = toMockResponse(newRule({ response: { status: 201, body: '{"ok":true}' } }));
    const res = new Response(spec.body, { status: spec.status, statusText: spec.statusText, headers: spec.headers });
    expect(res.status).toBe(201);
    expect(res.statusText).toBe('Created');
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('statusText', () => {
  it('returns an empty string for an unknown code', () => {
    expect(statusText(299)).toBe('');
    expect(statusText(500)).toBe('Internal Server Error');
  });
});
