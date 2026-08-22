import { NextResponse } from "next/server";
import { tmdb } from "@/tmdb/api";
import { tmdbImage } from "@/tmdb/utils";
import { Episode } from "@/lib/domain/typings";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; seasonNumber: string }> }
) {
  const { id, seasonNumber } = await params;
  try {
    const raw = await tmdb.tv.season(id, parseInt(seasonNumber, 10));
    const episodes: Episode[] = (raw.episodes || []).map((e) => ({
      id: e.id,
      episodeNumber: e.episode_number,
      seasonNumber: e.season_number,
      title: e.name || `Episode ${e.episode_number}`,
      overview: e.overview || "",
      stillUrl: tmdbImage.still(e.still_path),
      airDate: e.air_date,
      runtime: e.runtime,
      voteAverage: e.vote_average,
    }));

    return NextResponse.json({
      seasonNumber: raw.season_number,
      name: raw.name,
      overview: raw.overview,
      episodes,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch season episodes" }, { status: 404 });
  }
}
