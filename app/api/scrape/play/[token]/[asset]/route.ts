import { NextResponse } from "next/server";
import {
  decodeScrapePlaybackToken,
  rewriteManifestPlaylist,
  rewriteDashManifest,
} from "@/lib/scrape/playback";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; asset: string }> }
) {
  const { token } = await params;
  const playback = decodeScrapePlaybackToken(token);

  if (!playback) {
    return NextResponse.json({ error: "Invalid playback token" }, { status: 400 });
  }

  const rangeHeader = request.headers.get("range");
  const upstreamHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    ...(playback.referer
      ? { Referer: playback.referer, Origin: new URL(playback.referer).origin }
      : {}),
    ...(rangeHeader ? { Range: rangeHeader } : {}),
    ...(playback.headers || {}),
  };

  try {
    const upstreamRes = await fetch(playback.url, {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(50000),
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new NextResponse(null, { status: upstreamRes.status });
    }

    const contentType = upstreamRes.headers.get("content-type") ?? "";

    // 1. Rewrite HLS Master / Media Playlists
    if (
      playback.url.includes(".m3u8") ||
      contentType.includes("mpegurl") ||
      contentType.includes("x-mpegURL") ||
      contentType.includes("apple.mpegurl")
    ) {
      const rawText = await upstreamRes.text();
      const rewritten = rewriteManifestPlaylist(
        rawText,
        playback.url,
        playback.referer,
        playback.refresh
      );
      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 2. Rewrite DASH MPD Manifests
    if (playback.url.includes(".mpd") || contentType.includes("dash+xml")) {
      const rawXml = await upstreamRes.text();
      const rewritten = rewriteDashManifest(
        rawXml,
        playback.url,
        playback.referer,
        playback.refresh
      );
      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          "Content-Type": "application/dash+xml",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 3. Pipe Media Segments (TS / MP4 / M4S / Audio / Key Chunks)
    const headers = new Headers();
    ["content-length", "content-range", "accept-ranges", "content-type"].forEach((k) => {
      const val = upstreamRes.headers.get(k);
      if (val) headers.set(k, val);
    });

    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", contentType || "video/mp2t");
    }
    headers.set("Cache-Control", "public, max-age=3600");
    headers.set("Access-Control-Allow-Origin", "*");

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers,
    });
  } catch (error) {
    console.error("Upstream proxy error:", error);
    return NextResponse.json({ error: "Upstream proxy failed" }, { status: 502 });
  }
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ token: string; asset: string }> }
) {
  const { token } = await params;
  const playback = decodeScrapePlaybackToken(token);
  if (!playback) {
    return new NextResponse(null, { status: 400 });
  }
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
