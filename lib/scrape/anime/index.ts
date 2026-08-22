import { scrapeGogoAnime } from "./gogoanime";
import { scrapeAniZone } from "./anizone";
import { scrapeKickAssAnime } from "./kickassanime";
import { scrapeAnimePahe } from "./animepahe";
import { scrapeAllAnime } from "./allanime";
import { ScrapeStreamResult } from "../../domain/typings";

export interface AnimeScraper {
  id: string;
  name: string;
  scrape: (query: string, episode?: number, dub?: boolean) => Promise<ScrapeStreamResult | null>;
}

export const animeScrapers: AnimeScraper[] = [
  { id: "kickassanime", name: "KickAssAnime HQ", scrape: scrapeKickAssAnime },
  { id: "anizone", name: "AniZone Direct", scrape: scrapeAniZone },
  { id: "animepahe", name: "AnimePahe (MegaPlay)", scrape: scrapeAnimePahe },
  { id: "allanime", name: "AllAnime GraphQL", scrape: scrapeAllAnime },
  { id: "gogoanime", name: "GogoAnime Cloud", scrape: scrapeGogoAnime },
];
