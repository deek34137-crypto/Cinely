import { create } from "zustand";
import { Episode, Season } from "../domain/typings";

interface EpisodeState {
  currentSeasonNumber: number;
  currentEpisodeNumber: number;
  seasons: Season[];
  currentEpisodes: Episode[];
  setSeason: (seasonNumber: number) => void;
  setEpisode: (episodeNumber: number) => void;
  setSeasons: (seasons: Season[]) => void;
  setCurrentEpisodes: (episodes: Episode[]) => void;
  nextEpisode: () => { season: number; episode: number } | null;
  previousEpisode: () => { season: number; episode: number } | null;
}

export const useEpisodeStore = create<EpisodeState>((set, get) => ({
  currentSeasonNumber: 1,
  currentEpisodeNumber: 1,
  seasons: [],
  currentEpisodes: [],
  setSeason: (seasonNumber) => set({ currentSeasonNumber: seasonNumber }),
  setEpisode: (episodeNumber) => set({ currentEpisodeNumber: episodeNumber }),
  setSeasons: (seasons) => set({ seasons }),
  setCurrentEpisodes: (currentEpisodes) => set({ currentEpisodes }),
  nextEpisode: () => {
    const { currentSeasonNumber, currentEpisodeNumber, seasons, currentEpisodes } = get();
    const curSeasonData = seasons.find((s) => s.seasonNumber === currentSeasonNumber);
    const maxEp = curSeasonData?.episodeCount || currentEpisodes.length || 999;

    if (currentEpisodeNumber < maxEp) {
      const nextEp = currentEpisodeNumber + 1;
      set({ currentEpisodeNumber: nextEp });
      return { season: currentSeasonNumber, episode: nextEp };
    }

    // Check next season
    const nextSeasonData = seasons.find((s) => s.seasonNumber === currentSeasonNumber + 1);
    if (nextSeasonData) {
      set({ currentSeasonNumber: nextSeasonData.seasonNumber, currentEpisodeNumber: 1 });
      return { season: nextSeasonData.seasonNumber, episode: 1 };
    }

    return null;
  },
  previousEpisode: () => {
    const { currentSeasonNumber, currentEpisodeNumber } = get();
    if (currentEpisodeNumber > 1) {
      const prevEp = currentEpisodeNumber - 1;
      set({ currentEpisodeNumber: prevEp });
      return { season: currentSeasonNumber, episode: prevEp };
    }
    return null;
  },
}));
