import { describe, it, expect } from 'vitest';
import { sanitizeStreamHeaders } from '../sanitize-headers';


describe('sanitizeStreamHeaders', () => {
  it('returns empty object for undefined input', () => {
    expect(sanitizeStreamHeaders(undefined)).toEqual({});
  });

  it('allows allowlisted keys (referer, origin, accept, range)', () => {
    const result = sanitizeStreamHeaders({
      referer: 'https://example.com',
      origin: 'https://example.com',
      accept: 'video/*',
      range: 'bytes=0-',
    });
    expect(result).toEqual({
      referer: 'https://example.com',
      origin: 'https://example.com',
      accept: 'video/*',
      range: 'bytes=0-',
    });
  });

  it('strips non-allowlisted headers (authorization, user-agent, cookie)', () => {
    const result = sanitizeStreamHeaders({
      authorization: 'Bearer token',
      'user-agent': 'Mozilla/5.0',
      cookie: 'session=abc',
      accept: 'video/*',
    });
    expect(result).toEqual({ accept: 'video/*' });
    expect(result).not.toHaveProperty('authorization');
    expect(result).not.toHaveProperty('user-agent');
    expect(result).not.toHaveProperty('cookie');
  });

  it('strips headers containing CR characters (CRLF injection)', () => {
    const result = sanitizeStreamHeaders({
      referer: 'https://example.com\r\nX-Injected: evil',
    });
    expect(result).not.toHaveProperty('referer');
  });

  it('strips headers containing LF characters', () => {
    const result = sanitizeStreamHeaders({
      origin: 'https://example.com\nEvil: header',
    });
    expect(result).not.toHaveProperty('origin');
  });

  it('strips headers with NUL characters', () => {
    const result = sanitizeStreamHeaders({
      accept: 'video/*\x00malicious',
    });
    expect(result).not.toHaveProperty('accept');
  });

  it('strips referer pointing to localhost', () => {
    const result = sanitizeStreamHeaders({
      referer: 'http://localhost:8080/admin',
    });
    expect(result).not.toHaveProperty('referer');
  });

  it('strips referer pointing to 127.0.0.1', () => {
    const result = sanitizeStreamHeaders({
      referer: 'http://127.0.0.1/secret',
    });
    expect(result).not.toHaveProperty('referer');
  });

  it('strips origin pointing to private 192.168.x.x', () => {
    const result = sanitizeStreamHeaders({
      origin: 'http://192.168.1.100',
    });
    expect(result).not.toHaveProperty('origin');
  });

  it('strips origin pointing to 10.x.x.x range', () => {
    const result = sanitizeStreamHeaders({ origin: 'http://10.0.0.1' });
    expect(result).not.toHaveProperty('origin');
  });

  it('allows a legitimate public origin', () => {
    const result = sanitizeStreamHeaders({
      origin: 'https://cdn.example.com',
    });
    expect(result.origin).toBe('https://cdn.example.com');
  });

  it('normalizes header key case to lowercase', () => {
    const result = sanitizeStreamHeaders({
      Referer: 'https://example.com',
      Accept: 'video/*',
    });
    expect(result).toHaveProperty('referer');
    expect(result).toHaveProperty('accept');
  });
});
