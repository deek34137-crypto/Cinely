import { ScrapeStreamResult } from "../../domain/typings";
import { scrapeFetch } from "../fetch";

function decryptAllAnimeXor(str: string): string {
  try {
    return str
      .match(/.{1,2}/g)
      ?.map((hex) => String.fromCharCode(parseInt(hex, 16) ^ 56))
      .join("") || str;
  } catch {
    return str;
  }
}

export async function scrapeAllAnime(
  query: string,
  episode = 1,
  dub = false
): Promise<ScrapeStreamResult | null> {
  try {
    const gqlQuery = `query($search: SearchInput) { shows(search: $search, limit: 1) { edges { _id name availableEpisodesDetail } } }`;
    const res = await scrapeFetch("https://api.allanime.day/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://allanime.to",
      },
      body: JSON.stringify({
        query: gqlQuery,
        variables: {
          search: {
            query,
            mode: dub ? "dub" : "sub",
          },
        },
      }),
      timeoutMs: 6000,
    });

    if (!res.ok) return null;
    const data = await res.json();
    const showId = data?.data?.shows?.edges?.[0]?._id;

    if (showId) {
      const epGql = `query($showId: String!, $translationType: String!, $episodeString: String!) { episode(showId: $showId, translationType: $translationType, episodeString: $episodeString) { sourceUrls } }`;
      const epRes = await scrapeFetch("https://api.allanime.day/api", {
        method: "POST",
        headers: { "Content-Type": "application/json", Referer: "https://allanime.to" },
        body: JSON.stringify({
          query: epGql,
          variables: {
            showId,
            translationType: dub ? "dub" : "sub",
            episodeString: String(episode),
          },
        }),
        timeoutMs: 6000,
      });

      if (epRes.ok) {
        const epData = await epRes.json();
        const sources = epData?.data?.episode?.sourceUrls || [];
        for (const src of sources) {
          if (src.sourceUrl) {
            let url = src.sourceUrl;
            if (url.startsWith("--")) {
              url = decryptAllAnimeXor(url.slice(2));
            }
            if (url.includes(".m3u8") || url.includes(".mp4")) {
              return {
                providerId: "allanime",
                providerName: "AllAnime GraphQL",
                streamType: url.includes(".m3u8") ? "hls" : "mp4",
                url,
                referer: "https://allanime.to",
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
