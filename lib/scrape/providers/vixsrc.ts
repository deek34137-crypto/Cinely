import { ScrapeStreamResult } from "../../domain/typings";
import { scrapeFetch } from "../fetch";

export async function scrapeVixSrc(
  tmdbId: number,
  mediaType: "movie" | "tv",
  season = 1,
  episode = 1
): Promise<ScrapeStreamResult | null> {
  try {
    const url =
      mediaType === "movie"
        ? `https://vixsrc.xyz/api/stream/movie/${tmdbId}`
        : `https://vixsrc.xyz/api/stream/tv/${tmdbId}/${season}/${episode}`;

    const res = await scrapeFetch(url, {
      timeoutMs: 6000,
      headers: { Referer: "https://vixsrc.xyz/" },
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (data?.streamUrl) {
      return {
        providerId: "vixsrc",
        providerName: "VixSrc",
        streamType: "hls",
        url: data.streamUrl,
        referer: "https://vixsrc.xyz/",
        subtitles: data.subtitles || [],
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}
