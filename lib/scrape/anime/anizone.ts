import { ScrapeStreamResult } from "../../domain/typings";
import { scrapeFetch } from "../fetch";

export async function scrapeAniZone(
  query: string,
  episode = 1,
  dub = false
): Promise<ScrapeStreamResult | null> {
  try {
    const searchUrl = `https://anizone.to/api/search?q=${encodeURIComponent(query)}`;
    const res = await scrapeFetch(searchUrl, { timeoutMs: 5000 });
    if (!res.ok) return null;
    const data = await res.json();

    if (data?.results?.[0]?.id) {
      const animeId = data.results[0].id;
      const epUrl = `https://anizone.to/api/watch/${animeId}?ep=${episode}&dub=${dub ? "1" : "0"}`;
      const epRes = await scrapeFetch(epUrl, { timeoutMs: 5000 });
      if (epRes.ok) {
        const epData = await epRes.json();
        if (epData?.sources?.[0]?.url) {
          return {
            providerId: "anizone",
            providerName: "AniZone",
            streamType: "hls",
            url: epData.sources[0].url,
            referer: "https://anizone.to/",
            subtitles: epData.subtitles || [],
          };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
