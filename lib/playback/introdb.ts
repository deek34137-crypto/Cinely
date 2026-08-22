export interface MediaSegment {
  start: number;
  end: number;
  type: "intro" | "outro" | "recap" | "preview";
}

export async function fetchMediaSegments(
  imdbId?: string | null,
  season?: number,
  episode?: number
): Promise<MediaSegment[]> {
  if (!imdbId) return [];

  try {
    const query = season && episode ? `imdb_id=${imdbId}&season=${season}&episode=${episode}` : `imdb_id=${imdbId}`;
    const res = await fetch(`https://api.theintrodb.org/v1/segments?${query}`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data.segments || []).map((s: any) => ({
      start: s.start_sec || s.start || 0,
      end: s.end_sec || s.end || 0,
      type: s.type || "intro",
    }));
  } catch {
    return [];
  }
}
