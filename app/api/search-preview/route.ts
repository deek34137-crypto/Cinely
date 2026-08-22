import { NextResponse } from "next/server";
import { tmdb } from "@/tmdb/api";
import { mapTmdbMovieToMediaItem, mapTmdbTvToMediaItem } from "@/lib/cards/mappers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query") || url.searchParams.get("q") || "";

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const raw = await tmdb.search.multi(query, "1");
    const results = (raw.results || [])
      .filter((item: any) => item.media_type === "movie" || item.media_type === "tv")
      .slice(0, 6)
      .map((item: any) =>
        item.media_type === "movie" ? mapTmdbMovieToMediaItem(item) : mapTmdbTvToMediaItem(item)
      );

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ results: [] });
  }
}
