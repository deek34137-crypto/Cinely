import { PlaybackSessionToken } from "../domain/typings";

export function encodeScrapePlaybackToken(payload: PlaybackSessionToken): string {
  const jsonStr = JSON.stringify({
    ...payload,
    exp: payload.exp || Date.now() + 1000 * 60 * 60 * 6, // 6 hours
  });
  return Buffer.from(jsonStr, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeScrapePlaybackToken(token: string): PlaybackSessionToken | null {
  try {
    const normalized = token.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(token.length / 4) * 4, "=");
    const jsonStr = Buffer.from(normalized, "base64").toString("utf-8");
    const parsed = JSON.parse(jsonStr) as PlaybackSessionToken;
    if (parsed.exp && parsed.exp < Date.now()) {
      // Allow a small grace period for ongoing playback
      if (Date.now() - parsed.exp > 1000 * 60 * 30) {
        return null;
      }
    }
    return parsed;
  } catch (error) {
    console.error("Error decoding playback token:", error);
    return null;
  }
}

export function resolveUpstreamUrl(base: string, relative: string): string {
  if (relative.startsWith("http://") || relative.startsWith("https://")) {
    return relative;
  }
  if (relative.startsWith("//")) {
    return `https:${relative}`;
  }
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

export function createProxiedMediaUrl(
  resolvedUrl: string,
  referer?: string,
  refresh?: string,
  assetName = "media.ts"
): string {
  const token = encodeScrapePlaybackToken({
    url: resolvedUrl,
    referer,
    streamType: resolvedUrl.includes(".m3u8") ? "hls" : resolvedUrl.includes(".mpd") ? "dash" : "mp4",
    refresh,
  });

  const ext = resolvedUrl.includes(".m3u8")
    ? "playlist.m3u8"
    : resolvedUrl.includes(".mpd")
    ? "manifest.mpd"
    : assetName;

  return `/api/scrape/play/${token}/${ext}`;
}

export function rewriteManifestPlaylist(
  manifest: string,
  upstreamUrl: string,
  referer?: string,
  refresh?: string
): string {
  const lines = manifest.split(/\r?\n/);
  const rewrittenLines: string[] = [];

  for (let line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      rewrittenLines.push(line);
      continue;
    }

    // Handle URI attributes in tags like #EXT-X-KEY, #EXT-X-MEDIA, #EXT-X-MAP, #EXT-X-I-FRAME-STREAM-INF
    if (trimmed.startsWith("#EXT-X-KEY:") || trimmed.startsWith("#EXT-X-MEDIA:") || trimmed.startsWith("#EXT-X-MAP:")) {
      const replaced = trimmed.replace(/URI="([^"]+)"/g, (_, uriMatch) => {
        const fullUrl = resolveUpstreamUrl(upstreamUrl, uriMatch);
        const proxied = createProxiedMediaUrl(
          fullUrl,
          referer,
          refresh,
          fullUrl.includes(".m3u8") ? "sub.m3u8" : "asset.bin"
        );
        return `URI="${proxied}"`;
      });
      rewrittenLines.push(replaced);
      continue;
    }

    // Handle comments & header tags without URLs
    if (trimmed.startsWith("#")) {
      rewrittenLines.push(trimmed);
      continue;
    }

    // Regular URL line (segment or sub-playlist)
    const fullUrl = resolveUpstreamUrl(upstreamUrl, trimmed);
    const assetName = fullUrl.includes(".m3u8") ? "stream.m3u8" : "segment.ts";
    const proxied = createProxiedMediaUrl(fullUrl, referer, refresh, assetName);
    rewrittenLines.push(proxied);
  }

  return rewrittenLines.join("\n");
}

export function rewriteDashManifest(
  manifestXml: string,
  upstreamUrl: string,
  referer?: string,
  refresh?: string
): string {
  // Rewrite BaseURL tags in DASH MPD
  return manifestXml.replace(/<BaseURL>([^<]+)<\/BaseURL>/g, (_, baseMatch) => {
    const fullUrl = resolveUpstreamUrl(upstreamUrl, baseMatch.trim());
    const proxied = createProxiedMediaUrl(fullUrl, referer, refresh, "dash-base");
    return `<BaseURL>${proxied}</BaseURL>`;
  });
}
