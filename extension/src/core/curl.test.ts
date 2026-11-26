import { describe, expect, it } from 'vitest';
import { parseCurl } from './curl';

describe('parseCurl', () => {
  it('returns null for text that is not a cURL command', () => {
    expect(parseCurl('https://api.com/x')).toBeNull();
    expect(parseCurl('curling is fun')).toBeNull();
    expect(parseCurl('curl')).toBeNull();
  });
  it('reads a simple GET', () => {
    expect(parseCurl("curl 'https://api.com/users?x=1'")).toEqual({ url: 'https://api.com/users?x=1', method: 'GET' });
  });
  it('reads -X, quoted headers and the URL placed anywhere', () => {
    expect(parseCurl('curl -X PUT -H "Content-Type: application/json" https://api.com/a')).toEqual({ url: 'https://api.com/a', method: 'PUT' });
    expect(parseCurl("curl https://api.com/a -XDELETE")).toEqual({ url: 'https://api.com/a', method: 'DELETE' });
  });
  it('assumes POST when there is a body and no -X (as curl does)', () => {
    expect(parseCurl(`curl 'https://api.com/o' --data-raw '{"a":1}'`)).toEqual({ url: 'https://api.com/o', method: 'POST' });
  });
  it('handles Chrome-style multi-line commands and -I', () => {
    const text = "curl 'https://api.com/p' \\\n  -H 'accept: */*' \\\n  --compressed";
    expect(parseCurl(text)).toEqual({ url: 'https://api.com/p', method: 'GET' });
    expect(parseCurl('curl -I https://api.com/p')?.method).toBe('HEAD');
  });
  it('does not take a header or body value for the URL', () => {
    expect(parseCurl("curl -H 'a: b' -d 'x' https://api.com/z")?.url).toBe('https://api.com/z');
  });
});
