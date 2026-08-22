import { ScrapeStreamResult } from "../../domain/typings";
import { scrapeFetch } from "../fetch";

export async function scrapeXPass(
  tmdbId: number,
  mediaType: "movie" | "tv",
  season = 1,
  episode = 1
): Promise<ScrapeStreamResult | null> {
  try {
    const url =
      mediaType === "movie"
        ? `https://xpass.stream/api/media/${tmdbId}`
        : `https://xpass.stream/api/media/${tmdbId}/${season}/${episode}`;

    const res = await scrapeFetch(url, {
      timeoutMs: 6000,
      headers: { Referer: "https://xpass.stream/" },
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (data?.stream) {
      return {
        providerId: "xpass",
        providerName: "XPass",
        streamType: "hls",
        url: data.stream,
        referer: "https://xpass.stream/",
        subtitles: data.subtitles || [],
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}
