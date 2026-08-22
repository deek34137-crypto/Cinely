import { ScrapeStreamResult } from "../../domain/typings";
import { decryptVidKingPayload } from "../vidking-cipher";
import { scrapeFetch } from "../fetch";

export async function scrapeVidKing(
  tmdbId: number,
  mediaType: "movie" | "tv",
  season = 1,
  episode = 1
): Promise<ScrapeStreamResult | null> {
  try {
    const targetUrl =
      mediaType === "movie"
        ? `https://www.vidking.net/embed/movie/${tmdbId}`
        : `https://www.vidking.net/embed/tv/${tmdbId}/${season}/${episode}`;

    const res = await scrapeFetch(targetUrl, {
      timeoutMs: 7000,
      headers: { Referer: "https://www.vidking.net" },
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Look for data-payload or script variable
    const match = html.match(/data-payload="([^"]+)"/) || html.match(/payload\s*:\s*["']([^"']+)["']/);
    const seedMatch = html.match(/data-seed="([^"]+)"/) || html.match(/seed\s*:\s*["']([^"']+)["']/);

    if (match && match[1]) {
      const payload = match[1];
      const seed = seedMatch?.[1] || `vidking_${tmdbId}`;
      try {
        const decryptedJson = decryptVidKingPayload(payload, seed, tmdbId);
        const parsed = JSON.parse(decryptedJson);
        if (parsed.sources && parsed.sources.length > 0) {
          const mainSource = parsed.sources[0];
          return {
            providerId: "vidking",
            providerName: "VidKing",
            streamType: mainSource.file?.includes(".mpd") ? "dash" : "hls",
            url: mainSource.file || mainSource.url,
            referer: "https://www.vidking.net/",
            subtitles: (parsed.tracks || [])
              .filter((t: any) => t.kind === "captions" || t.kind === "subtitles")
              .map((t: any) => ({ lang: t.label || t.lang || "English", url: t.file })),
          };
        }
      } catch (decErr) {
        // Fallback pattern extraction if decryption fails
      }
    }

    // Direct HLS link regex fallback
    const directHls = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
    if (directHls) {
      return {
        providerId: "vidking",
        providerName: "VidKing",
        streamType: "hls",
        url: directHls[0],
        referer: "https://www.vidking.net/",
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}
