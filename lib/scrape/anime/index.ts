import {
  scrapeReAnime,
  scrapeAniKoto,
  scrapeJustAnime,
  scrapeKAA,
  scrapeHiAnime,
  scrapeAnimeGG,
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
  { id: "hianime", name: "HiAnime Server", scrape: scrapeHiAnime },
  { id: "animegg", name: "AnimeGG Engine", scrape: scrapeAnimeGG },
];

