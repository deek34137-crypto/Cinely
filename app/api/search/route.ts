import { NextResponse } from "next/server";
import { tmdb } from "@/tmdb/api";
import {
  mapTmdbMovieToMediaItem,
  mapTmdbTvToMediaItem,
  mapTmdbAnimeToMediaItem,
} from "@/lib/cards/mappers";
import { searchAniList } from "@/lib/anilist";
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
    const [tmdbRes, anilistRes] = await Promise.allSettled([
      tmdb.search.multi(query, page),
      page === "1" ? searchAniList(query, 10) : Promise.resolve([]),
    ]);

    const results: MediaItem[] = [];
    const seenTitles = new Set<string>();

    if (tmdbRes.status === "fulfilled" && tmdbRes.value?.results) {
      for (const item of tmdbRes.value.results) {
        if (item.media_type !== "movie" && item.media_type !== "tv") continue;
        const isAnime =
          item.genre_ids?.includes(16) ||
          item.origin_country?.includes("JP") ||
          item.original_language === "ja";

        const mapped =
          item.media_type === "movie"
            ? mapTmdbMovieToMediaItem(item)
            : isAnime
            ? mapTmdbAnimeToMediaItem(item)
            : mapTmdbTvToMediaItem(item);

        results.push(mapped);
        if (mapped.title) seenTitles.add(mapped.title.toLowerCase().trim());
      }
    }

    if (anilistRes.status === "fulfilled" && Array.isArray(anilistRes.value)) {
      for (const al of anilistRes.value) {
        const title = al.title?.english || al.title?.romaji || al.title?.native || "Anime";
        if (seenTitles.has(title.toLowerCase().trim())) continue;

        results.push({
          id: `al-${al.id}`,
          tmdbId: al.id,
          title,
          mediaType: "anime",
          posterUrl: al.coverImage?.extraLarge || al.coverImage?.large || "",
          backdropUrl: al.bannerImage || al.coverImage?.extraLarge || "",
          overview: al.description?.replace(/<[^>]*>/g, "") || "",
          voteAverage: al.averageScore ? al.averageScore / 10 : undefined,
          releaseDate: "",
        });
        seenTitles.add(title.toLowerCase().trim());
      }
    }

    const raw = tmdbRes.status === "fulfilled" ? tmdbRes.value : null;

    return NextResponse.json({
      results,
      page: raw?.page || 1,
      total_pages: raw?.total_pages || 1,
      total_results: (raw?.total_results || 0) + (anilistRes.status === "fulfilled" ? anilistRes.value.length : 0),
    });
  } catch (error: any) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Failed to fetch search results", results: [] }, { status: 500 });
  }
}
