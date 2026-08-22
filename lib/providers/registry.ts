import { videoServers, VideoServer } from "../stores/video-servers";
import { tmdbScrapers } from "../scrape/providers";
import { animeScrapers } from "../scrape/anime";

export interface ProviderItem {
  id: string;
  name: string;
  type: "scrape" | "embed";
  kind: "tmdb" | "anime";
  badge?: string;
}

export function getProviderRegistry(): ProviderItem[] {
  const directTmdb: ProviderItem[] = tmdbScrapers.map((s) => ({
    id: `scrape-${s.id}`,
    name: `${s.name} [Proxy]`,
    type: "scrape",
    kind: "tmdb",
    badge: "Ad-Free",
  }));

  const directAnime: ProviderItem[] = animeScrapers.map((s) => ({
    id: `scrape-${s.id}`,
    name: `${s.name} [Proxy]`,
    type: "scrape",
    kind: "anime",
    badge: "Ad-Free",
  }));

  const embeds: ProviderItem[] = videoServers.map((s) => ({
    id: `embed-${s.id}`,
    name: `${s.name} [Embed]`,
    type: "embed",
    kind: "tmdb",
    badge: s.badge || "Embed",
  }));

  return [...directTmdb, ...directAnime, ...embeds];
}
