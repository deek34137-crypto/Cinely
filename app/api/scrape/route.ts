import { NextResponse } from "next/server";
import { handleScrapeRequest, ScrapeRequestPayload } from "@/lib/scrape/api-handlers";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ScrapeRequestPayload;
    if (!payload || (!payload.tmdbId && !payload.title)) {
      return NextResponse.json({ error: "Missing required media identifier" }, { status: 400 });
    }

    const result = await handleScrapeRequest(payload);

    if (!result) {
      return NextResponse.json(
        { error: "No working stream found across direct providers", fallbackToEmbed: true },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Scrape API endpoint error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tmdbIdStr = url.searchParams.get("tmdbId");
  const mediaType = (url.searchParams.get("mediaType") || "movie") as "movie" | "tv";
  const seasonStr = url.searchParams.get("season");
  const episodeStr = url.searchParams.get("episode");
  const providerId = url.searchParams.get("providerId") || undefined;

  if (!tmdbIdStr) {
    return NextResponse.json({ error: "Missing tmdbId parameter" }, { status: 400 });
  }

  const tmdbId = parseInt(tmdbIdStr, 10);
  const season = seasonStr ? parseInt(seasonStr, 10) : 1;
  const episode = episodeStr ? parseInt(episodeStr, 10) : 1;

  const result = await handleScrapeRequest({
    mediaKind: "tmdb",
    tmdbId,
    mediaType,
    season,
    episode,
    providerId,
  });

  if (!result) {
    return NextResponse.json(
      { error: "No stream resolved", fallbackToEmbed: true },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
