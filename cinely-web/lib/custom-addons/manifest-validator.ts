/**
 * ManifestValidator — fetches and validates a Stremio addon manifest from a URL.
 *
 * Security model:
 *   - URL syntax validation only. JavaScript cannot reliably perform DNS-based
 *     SSRF prevention (the browser networking stack resolves hostnames beneath JS).
 *   - The real SSRF protection is that the Cinely backend NEVER fetches or proxies
 *     custom addon URLs. All network requests in this module originate from the
 *     user's own browser on the user's own behalf.
 *   - Obvious literal private-range IPs in the URL hostname are rejected as a
 *     convenience check only — not as a security guarantee.
 *
 * The browser's same-origin policy and CORS headers are the effective network
 * security boundary for browser-initiated requests.
 */

import { CustomAddonManifest, CustomAddonInstallStatus } from '../types';

const FETCH_TIMEOUT_MS = 10_000;

/** Private IP literal prefixes that are obviously wrong for a public addon. */
const PRIVATE_IP_PATTERNS = [
  /^10\.\d+\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^::1$/,
];

function isObviouslyPrivateHost(hostname: string): boolean {
  return PRIVATE_IP_PATTERNS.some((re) => re.test(hostname));
}

/**
 * Validates URL syntax and rejects obviously invalid targets.
 * Does NOT perform DNS resolution.
 */
function validateUrl(rawUrl: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: 'Invalid URL — could not be parsed.' };
  }

  const { protocol, hostname } = url;

  // Allow https:// always; allow http:// only for localhost / 127.x (local dev addons)
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  if (protocol !== 'https:' && !(protocol === 'http:' && isLocalhost)) {
    return {
      ok: false,
      error:
        protocol === 'http:'
          ? 'Custom addons must use HTTPS (except localhost for local development).'
          : `Unsupported URL scheme "${protocol}". Only HTTPS is allowed.`,
    };
  }

  if (!isLocalhost && isObviouslyPrivateHost(hostname)) {
    return {
      ok: false,
      error: `"${hostname}" appears to be a private network address. Only public addon URLs are supported.`,
    };
  }

  return { ok: true, url };
}

function validateManifestSchema(
  data: unknown
): { ok: true; manifest: CustomAddonManifest } | { ok: false; error: string } {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, error: 'Manifest must be a JSON object.' };
  }

  const m = data as Record<string, unknown>;

  if (typeof m.id !== 'string' || m.id.trim() === '') {
    return { ok: false, error: 'Manifest is missing a valid "id" field.' };
  }
  // Reject control characters in id
  if (/[\x00-\x1F\x7F]/.test(m.id)) {
    return { ok: false, error: 'Manifest "id" contains invalid control characters.' };
  }
  if (typeof m.name !== 'string' || m.name.trim() === '') {
    return { ok: false, error: 'Manifest is missing a valid "name" field.' };
  }
  if (typeof m.version !== 'string' || m.version.trim() === '') {
    return { ok: false, error: 'Manifest is missing a valid "version" field.' };
  }
  if (!Array.isArray(m.resources) || m.resources.length === 0) {
    return { ok: false, error: 'Manifest "resources" must be a non-empty array.' };
  }
  if (!Array.isArray(m.types) || m.types.length === 0) {
    return { ok: false, error: 'Manifest "types" must be a non-empty array.' };
  }
  if (!Array.isArray(m.catalogs)) {
    return { ok: false, error: 'Manifest "catalogs" must be an array.' };
  }

  return {
    ok: true,
    manifest: {
      id: m.id,
      name: (m.name as string).trim(),
      version: (m.version as string).trim(),
      description: typeof m.description === 'string' ? m.description : undefined,
      resources: m.resources as string[],
      types: m.types as string[],
      catalogs: (m.catalogs as Array<{ type: string; id: string; name?: string }>),
      idPrefixes: Array.isArray(m.idPrefixes) ? (m.idPrefixes as string[]) : undefined,
      behaviorHints:
        typeof m.behaviorHints === 'object' && m.behaviorHints !== null
          ? (m.behaviorHints as Record<string, unknown>)
          : undefined,
    },
  };
}

function isCorsLikelyError(err: unknown): boolean {
  if (!(err instanceof TypeError)) return false;
  const msg = (err as TypeError).message.toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed')
  );
}

/**
 * Fetches and validates a Stremio addon manifest from a URL.
 *
 * The URL must resolve to a JSON document at `{url}/manifest.json`
 * (or the URL itself if it already ends with manifest.json).
 */
export async function validateManifestUrl(
  rawUrl: string
): Promise<CustomAddonInstallStatus> {
  const urlResult = validateUrl(rawUrl.trim());
  if (!urlResult.ok) {
    return { status: 'error', message: urlResult.error, isCorsLikely: false };
  }

  // Build manifest URL: strip trailing slash, append /manifest.json if needed
  const base = urlResult.url.href.replace(/\/+$/, '');
  const manifestUrl = base.endsWith('/manifest.json') ? base : `${base}/manifest.json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(manifestUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return {
        status: 'error',
        message: `Server returned HTTP ${res.status} when fetching the manifest.`,
        isCorsLikely: false,
      };
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return {
        status: 'error',
        message: 'Manifest response is not valid JSON.',
        isCorsLikely: false,
      };
    }

    const schemaResult = validateManifestSchema(json);
    if (!schemaResult.ok) {
      return { status: 'error', message: schemaResult.error, isCorsLikely: false };
    }

    return { status: 'success', manifest: schemaResult.manifest };
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      return {
        status: 'error',
        message: 'Request timed out after 10 seconds. The addon server may be unavailable.',
        isCorsLikely: false,
      };
    }
    if (isCorsLikelyError(err)) {
      return {
        status: 'error',
        message:
          'Could not fetch the manifest — the addon server may not allow browser access (CORS). ' +
          'You can still install this addon, but streams may be blocked at playback time.',
        isCorsLikely: true,
      };
    }
    return {
      status: 'error',
      message: `Unexpected error: ${(err as Error)?.message ?? String(err)}`,
      isCorsLikely: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Returns true if the addon has `stream` in its resources array,
 * meaning it can provide playable stream candidates.
 */
export function addonHasStreamCapability(manifest: CustomAddonManifest): boolean {
  return manifest.resources.some(
    (r) => (typeof r === 'string' ? r : (r as { name?: string }).name) === 'stream'
  );
}

/**
 * Generates a stable, short ID for a custom addon based on its manifest URL.
 * Uses a simple djb2 hash — collision resistance is not a security requirement here.
 */
export function stableAddonId(manifestUrl: string): string {
  let hash = 5381;
  for (let i = 0; i < manifestUrl.length; i++) {
    hash = ((hash << 5) + hash) ^ manifestUrl.charCodeAt(i);
    hash = hash >>> 0; // Force unsigned 32-bit
  }
  return `custom_${hash.toString(16).padStart(8, '0')}`;
}
