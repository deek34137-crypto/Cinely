import { ScrapeStreamResult } from "../../domain/typings";
import { scrapeFetch } from "../fetch";

export async function scrapeVidRock(
  tmdbId: number,
  mediaType: "movie" | "tv",
  season = 1,
  episode = 1
): Promise<ScrapeStreamResult | null> {
  try {
    const url =
      mediaType === "movie"
        ? `https://vidrock.net/api/v1/movie/${tmdbId}`
        : `https://vidrock.net/api/v1/tv/${tmdbId}/${season}/${episode}`;

    const res = await scrapeFetch(url, {
      timeoutMs: 6000,
      headers: { Referer: "https://vidrock.net/" },
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (data?.data?.stream) {
      return {
        providerId: "vidrock",
        providerName: "VidRock",
        streamType: "hls",
        url: data.data.stream,
        referer: "https://vidrock.net/",
        subtitles: data.data.captions || [],
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}
