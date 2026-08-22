import { ScrapeStreamResult } from "../../domain/typings";
import { scrapeFetch } from "../fetch";

export async function scrapeBingr(
  tmdbId: number,
  mediaType: "movie" | "tv",
  season = 1,
  episode = 1
): Promise<ScrapeStreamResult | null> {
  try {
    const url =
      mediaType === "movie"
        ? `https://bingr.stream/api/stream/movie/${tmdbId}`
        : `https://bingr.stream/api/stream/tv/${tmdbId}/${season}/${episode}`;

    const res = await scrapeFetch(url, {
      timeoutMs: 6000,
      headers: { Referer: "https://bingr.stream/" },
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (data?.streamUrl) {
      return {
        providerId: "bingr",
        providerName: "Bingr",
        streamType: data.streamUrl.includes(".mpd") ? "dash" : "hls",
        url: data.streamUrl,
        referer: "https://bingr.stream/",
        subtitles: data.subtitles || [],
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}
