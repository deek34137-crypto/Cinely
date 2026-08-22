import { NextResponse } from "next/server";
import { fetchMediaSegments } from "@/lib/playback/introdb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const imdbId = url.searchParams.get("imdb_id") || url.searchParams.get("imdbId");
  const season = url.searchParams.get("season") ? parseInt(url.searchParams.get("season")!, 10) : undefined;
  const episode = url.searchParams.get("episode") ? parseInt(url.searchParams.get("episode")!, 10) : undefined;

  const segments = await fetchMediaSegments(imdbId, season, episode);
  return NextResponse.json({ segments });
}
