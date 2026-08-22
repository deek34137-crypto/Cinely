import { ScrapeStreamResult } from "../../domain/typings";
import { scrapeFetch } from "../fetch";

export async function scrapeVidSrc(
  tmdbId: number,
  mediaType: "movie" | "tv",
  season = 1,
  episode = 1
): Promise<ScrapeStreamResult | null> {
  try {
    const embedUrl =
      mediaType === "movie"
        ? `https://vidsrc.xyz/embed/movie/${tmdbId}`
        : `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}-${episode}`;

    const res = await scrapeFetch(embedUrl, {
      timeoutMs: 6000,
      headers: { Referer: "https://vidsrc.xyz" },
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Look for iframe rcp or source url
    const rcpMatch = html.match(/src="(\/\/vidsrc\.xyz\/rcp\/[^"]+)"/) || html.match(/iframe\s+src="([^"]+)"/);
    if (rcpMatch && rcpMatch[1]) {
      const rcpUrl = rcpMatch[1].startsWith("//") ? `https:${rcpMatch[1]}` : rcpMatch[1];
      const rcpRes = await scrapeFetch(rcpUrl, {
        timeoutMs: 6000,
        headers: { Referer: embedUrl },
      });

      if (rcpRes.ok) {
        const rcpText = await rcpRes.text();
        const m3u8Match = rcpText.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
        if (m3u8Match) {
          return {
            providerId: "vidsrc",
            providerName: "VidSrc",
            streamType: "hls",
            url: m3u8Match[0],
            referer: "https://vidsrc.xyz/",
          };
        }
      }
    }

    const fallbackMatch = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
    if (fallbackMatch) {
      return {
        providerId: "vidsrc",
        providerName: "VidSrc",
        streamType: "hls",
        url: fallbackMatch[0],
        referer: "https://vidsrc.xyz/",
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}
