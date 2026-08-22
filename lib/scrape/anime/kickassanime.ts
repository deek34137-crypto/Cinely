import { ScrapeStreamResult } from "../../domain/typings";
import { scrapeFetch } from "../fetch";

export async function scrapeKickAssAnime(
  query: string,
  episode = 1,
  dub = false
): Promise<ScrapeStreamResult | null> {
  try {
    const searchUrl = `https://kaas.to/api/show/search?q=${encodeURIComponent(query)}`;
    const res = await scrapeFetch(searchUrl, { timeoutMs: 5000 });
    if (!res.ok) return null;
    const data = await res.json();

    if (data?.[0]?.slug) {
      const slug = data[0].slug;
      const epUrl = `https://kaas.to/api/show/${slug}/episode/${episode}`;
      const epRes = await scrapeFetch(epUrl, { timeoutMs: 5000 });
      if (epRes.ok) {
        const epData = await epRes.json();
        const server = epData?.servers?.find((s: any) => (dub ? s.type === "dub" : s.type === "sub")) || epData?.servers?.[0];
        if (server?.src) {
          return {
            providerId: "kickassanime",
            providerName: "KickAssAnime",
            streamType: "hls",
            url: server.src,
            referer: "https://kaas.to/",
            subtitles: server.subtitles || [],
          };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
