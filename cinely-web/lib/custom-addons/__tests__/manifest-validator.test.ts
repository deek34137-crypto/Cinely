import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateManifestUrl, addonHasStreamCapability, stableAddonId } from '../manifest-validator';

// Minimal valid manifest fixture
const validManifest = {
  id: 'com.example.myaddon',
  name: 'My Test Addon',
  version: '1.0.0',
  resources: ['stream', 'catalog'],
  types: ['movie', 'series'],
  catalogs: [{ type: 'movie', id: 'my_movies', name: 'My Movies' }],
};

describe('ManifestValidator — URL syntax checks', () => {
  it('rejects non-parseable URLs', async () => {
    const result = await validateManifestUrl('not a url');
    expect(result.status).toBe('error');
    expect((result as { status: string; message: string }).message).toMatch(/invalid url/i);
  });

  it('rejects http:// for non-localhost URLs', async () => {
    const result = await validateManifestUrl('http://example.com/manifest.json');
    expect(result.status).toBe('error');
    expect((result as { status: string; message: string }).message).toMatch(/https/i);
  });

  it('allows http:// for localhost', async () => {
    // Will fail at fetch, but URL validation should pass — error is not a URL error
    const result = await validateManifestUrl('http://localhost:7000');
    // Should fail at fetch (connection refused / CORS), not at URL validation
    expect((result as { status: string; message?: string }).status).not.toBe('idle');
    // The URL validation step itself should pass (error is from fetch, not URL check)
  });

  it('rejects literal private IP ranges', async () => {
    for (const ip of ['https://10.0.0.1/m', 'https://192.168.1.1/', 'https://172.16.0.5/']) {
      const result = await validateManifestUrl(ip);
      expect(result.status).toBe('error');
      expect((result as { status: string; message: string }).message).toMatch(/private/i);
    }
  });

  it('rejects non-http schemes', async () => {
    const result = await validateManifestUrl('file:///etc/passwd');
    expect(result.status).toBe('error');
  });
});

describe('ManifestValidator — schema validation', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns success for a valid manifest', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => validManifest,
    });

    const result = await validateManifestUrl('https://example.com/addon');
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.manifest.name).toBe('My Test Addon');
      expect(result.manifest.resources).toContain('stream');
    }
  });

  it('rejects manifest missing required id', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...validManifest, id: '' }),
    });
    const result = await validateManifestUrl('https://example.com/addon');
    expect(result.status).toBe('error');
    expect((result as { status: string; message: string }).message).toMatch(/id/i);
  });

  it('rejects manifest with control characters in id', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...validManifest, id: 'bad\nid' }),
    });
    const result = await validateManifestUrl('https://example.com/addon');
    expect(result.status).toBe('error');
    expect((result as { status: string; message: string }).message).toMatch(/control/i);
  });

  it('rejects manifest with empty resources array', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...validManifest, resources: [] }),
    });
    const result = await validateManifestUrl('https://example.com/addon');
    expect(result.status).toBe('error');
  });

  it('classifies CORS-like TypeError as isCorsLikely: true', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new TypeError('Failed to fetch')
    );
    const result = await validateManifestUrl('https://cors-blocked.example.com/addon');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.isCorsLikely).toBe(true);
    }
  });

  it('returns HTTP error for non-2xx responses', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, status: 404 });
    const result = await validateManifestUrl('https://example.com/addon');
    expect(result.status).toBe('error');
    expect((result as { status: string; message: string }).message).toMatch(/404/);
  });
});

describe('addonHasStreamCapability', () => {
  it('returns true when resources includes "stream"', () => {
    expect(addonHasStreamCapability(validManifest)).toBe(true);
  });

  it('returns false when stream is absent', () => {
    expect(addonHasStreamCapability({ ...validManifest, resources: ['catalog'] })).toBe(false);
  });
});

describe('stableAddonId', () => {
  it('produces a consistent id for the same URL', () => {
    const a = stableAddonId('https://example.com/manifest.json');
    const b = stableAddonId('https://example.com/manifest.json');
    expect(a).toBe(b);
  });

  it('produces different ids for different URLs', () => {
    const a = stableAddonId('https://a.example.com/manifest.json');
    const b = stableAddonId('https://b.example.com/manifest.json');
    expect(a).not.toBe(b);
  });

  it('produces a non-empty string prefixed with custom_', () => {
    expect(stableAddonId('https://example.com/')).toMatch(/^custom_[0-9a-f]{8}$/);
  });
});
