import { scrapeVidKing } from "./vidking";
import { scrapeVidSrc } from "./vidsrc";
import { scrapeVidNest } from "./vidnest";
import { scrapeBingr } from "./bingr";
import { scrapeVidRock } from "./vidrock";
import { scrapeVixSrc } from "./vixsrc";
import { scrapeXPass } from "./xpass";
import { ScrapeStreamResult } from "../../domain/typings";

export interface ScraperProvider {
  id: string;
  name: string;
  scrape: (tmdbId: number, mediaType: "movie" | "tv", season?: number, episode?: number) => Promise<ScrapeStreamResult | null>;
}

export const tmdbScrapers: ScraperProvider[] = [
  { id: "vidking", name: "VidKing (Ad-Free)", scrape: scrapeVidKing },
  { id: "vidsrc", name: "VidSrc High-Speed", scrape: scrapeVidSrc },
  { id: "vidnest", name: "VidNest Ultra", scrape: scrapeVidNest },
  { id: "bingr", name: "Bingr Direct", scrape: scrapeBingr },
  { id: "vidrock", name: "VidRock Stream", scrape: scrapeVidRock },
  { id: "vixsrc", name: "VixSrc Cloud", scrape: scrapeVixSrc },
  { id: "xpass", name: "XPass Fast", scrape: scrapeXPass },
];
