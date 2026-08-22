import { NextResponse } from "next/server";
import { tmdb } from "@/tmdb/api";
import { mapTmdbMovieToMediaItem, mapTmdbTvToMediaItem } from "@/lib/cards/mappers";
import { MediaItem } from "@/lib/domain/typings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query") || url.searchParams.get("q") || "";
  const page = url.searchParams.get("page") || "1";

  if (!query.trim()) {
    return NextResponse.json({ results: [], total_pages: 0, total_results: 0 });
  }

  try {
    const raw = await tmdb.search.multi(query, page);
    const results: MediaItem[] = (raw.results || [])
      .filter((item: any) => item.media_type === "movie" || item.media_type === "tv")
      .map((item: any) => {
        if (item.media_type === "movie") {
          return mapTmdbMovieToMediaItem(item);
        }
        return mapTmdbTvToMediaItem(item);
      });

    return NextResponse.json({
      results,
      page: raw.page,
      total_pages: raw.total_pages,
      total_results: raw.total_results,
    });
  } catch (error: any) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Failed to fetch search results", results: [] }, { status: 500 });
  }
}
