import { ScrapeStreamResult } from "../../domain/typings";
import { scrapeFetch } from "../fetch";

export async function scrapeAnimePahe(
  query: string,
  episode = 1,
  dub = false
): Promise<ScrapeStreamResult | null> {
  try {
    const searchUrl = `https://animepahe.ru/api?m=search&q=${encodeURIComponent(query)}`;
    const res = await scrapeFetch(searchUrl, {
      timeoutMs: 6000,
      headers: { Referer: "https://animepahe.ru/" },
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (data?.data?.[0]?.session) {
      const animeSession = data.data[0].session;
      const epListUrl = `https://animepahe.ru/api?m=release&id=${animeSession}&sort=episode_asc&page=1`;
      const epRes = await scrapeFetch(epListUrl, {
        timeoutMs: 6000,
        headers: { Referer: "https://animepahe.ru/" },
      });

      if (epRes.ok) {
        const epData = await epRes.json();
        const targetEp = epData?.data?.find((e: any) => e.episode === episode) || epData?.data?.[0];
        if (targetEp?.session) {
          const playPageUrl = `https://animepahe.ru/play/${animeSession}/${targetEp.session}`;
          const playPageRes = await scrapeFetch(playPageUrl, { timeoutMs: 6000 });
          if (playPageRes.ok) {
            const html = await playPageRes.text();
            const kwikMatch = html.match(/https:\/\/kwik\.cx\/e\/[a-zA-Z0-9]+/);
            if (kwikMatch) {
              return {
                providerId: "animepahe",
                providerName: "AnimePahe (MegaPlay)",
                streamType: "hls",
                url: kwikMatch[0],
                referer: "https://animepahe.ru/",
              };
            }
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
