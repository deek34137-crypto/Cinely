import { NextResponse } from "next/server";
import { tmdb } from "@/tmdb/api";
import { mapTmdbMovieDetails } from "@/lib/cards/mappers";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const raw = await tmdb.movie.detail(id);
    const details = mapTmdbMovieDetails(raw);
    return NextResponse.json(details);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch movie details" }, { status: 404 });
  }
}
