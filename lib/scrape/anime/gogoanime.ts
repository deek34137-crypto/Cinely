import { ScrapeStreamResult } from "../../domain/typings";
import { scrapeFetch } from "../fetch";

export async function scrapeGogoAnime(
  query: string,
  episode = 1,
  dub = false
): Promise<ScrapeStreamResult | null> {
  try {
    const cleanSlug = query
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const slug = dub ? `${cleanSlug}-dub` : cleanSlug;
    const targetUrl = `https://anitaku.to/${slug}-episode-${episode}`;

    const res = await scrapeFetch(targetUrl, {
      timeoutMs: 6000,
      headers: { Referer: "https://anitaku.to/" },
    });

    if (!res.ok) return null;
    const html = await res.text();

    const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
    if (iframeMatch && iframeMatch[1]) {
      let embedUrl = iframeMatch[1];
      if (embedUrl.startsWith("//")) embedUrl = `https:${embedUrl}`;

      const embedRes = await scrapeFetch(embedUrl, {
        timeoutMs: 6000,
        headers: { Referer: targetUrl },
      });

      if (embedRes.ok) {
        const embedHtml = await embedRes.text();
        const m3u8Match = embedHtml.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
        if (m3u8Match) {
          return {
            providerId: "gogoanime",
            providerName: "GogoAnime",
            streamType: "hls",
            url: m3u8Match[0],
            referer: embedUrl,
          };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}
