import { ScrapeStreamResult } from "../../domain/typings";
import { decodeVidNestPayload } from "../vidnest-crypto";
import { scrapeFetch } from "../fetch";

export async function scrapeVidNest(
  tmdbId: number,
  mediaType: "movie" | "tv",
  season = 1,
  episode = 1
): Promise<ScrapeStreamResult | null> {
  try {
    const url =
      mediaType === "movie"
        ? `https://vidnest.fun/api/source/movie/${tmdbId}`
        : `https://vidnest.fun/api/source/tv/${tmdbId}/${season}/${episode}`;

    const res = await scrapeFetch(url, {
      timeoutMs: 6000,
      headers: { Referer: "https://vidnest.fun/" },
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (data && data.sources && Array.isArray(data.sources)) {
      const src = data.sources[0];
      return {
        providerId: "vidnest",
        providerName: "VidNest",
        streamType: src.file?.includes(".mpd") ? "dash" : "hls",
        url: src.file || src.url,
        referer: "https://vidnest.fun/",
        subtitles: data.tracks?.map((t: any) => ({ lang: t.label || "English", url: t.file })),
      };
    }

    if (typeof data.payload === "string") {
      const decoded = decodeVidNestPayload(data.payload);
      const parsed = JSON.parse(decoded);
      if (parsed.sources?.[0]) {
        return {
          providerId: "vidnest",
          providerName: "VidNest",
          streamType: "hls",
          url: parsed.sources[0].file,
          referer: "https://vidnest.fun/",
        };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}
