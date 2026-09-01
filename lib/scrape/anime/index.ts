import {
  scrapeReAnime,
  scrapeAniKoto,
  scrapeJustAnime,
  scrapeKAA,
  scrapeAniBD,
  scrapeAniNeko,
  scrapeHiAnime,
  scrapeAnimeGG,
  scrapeAnimeNoSub,
} from "./allanime";
import { ScrapeStreamResult } from "../../domain/typings";

export interface AnimeScraper {
  id: string;
  name: string;
  scrape: (
    query: string | number,
    episode?: number,
    dub?: boolean
  ) => Promise<ScrapeStreamResult | null>;
}

export const animeScrapers: AnimeScraper[] = [
  { id: "reanime", name: "ReAnime (HLS Direct)", scrape: scrapeReAnime },
  { id: "anikoto", name: "AniKoto Cloud", scrape: scrapeAniKoto },
  { id: "justanime", name: "JustAnime Fast", scrape: scrapeJustAnime },
  { id: "kaa", name: "KickAssAnime HD", scrape: scrapeKAA },
  { id: "anibd", name: "AniBD Direct (Ecchi/OVA/18+)", scrape: scrapeAniBD },
  { id: "anineko", name: "AniNeko Stream", scrape: scrapeAniNeko },
  { id: "hianime", name: "HiAnime Server", scrape: scrapeHiAnime },
  { id: "animegg", name: "AnimeGG Engine", scrape: scrapeAnimeGG },
  { id: "animenosub", name: "AnimeNoSub Raw", scrape: scrapeAnimeNoSub },
];

