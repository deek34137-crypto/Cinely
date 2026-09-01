import { NextResponse } from "next/server";
import { tmdb } from "@/tmdb/api";
import {
  mapTmdbMovieToMediaItem,
  mapTmdbTvToMediaItem,
  mapTmdbAnimeToMediaItem,
} from "@/lib/cards/mappers";

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
      .slice(0, 8)
      .map((item: any) => {
        const isAnime =
          item.genre_ids?.includes(16) ||
          item.origin_country?.includes("JP") ||
          item.original_language === "ja";

        if (item.media_type === "movie") {
          return mapTmdbMovieToMediaItem(item);
        }
        return isAnime ? mapTmdbAnimeToMediaItem(item) : mapTmdbTvToMediaItem(item);
      });

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ results: [] });
  }
}
