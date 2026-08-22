import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppSettingsState {
  autoplay: boolean;
  autoNextEpisode: boolean;
  autoSkipIntro: boolean;
  ambientGlow: boolean;
  videoQuality: "auto" | "1080p" | "720p" | "480p";
  setAutoplay: (autoplay: boolean) => void;
  setAutoNextEpisode: (autoNext: boolean) => void;
  setAutoSkipIntro: (skip: boolean) => void;
  setAmbientGlow: (glow: boolean) => void;
  setVideoQuality: (q: "auto" | "1080p" | "720p" | "480p") => void;
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      autoplay: true,
      autoNextEpisode: true,
      autoSkipIntro: false,
      ambientGlow: true,
      videoQuality: "auto",
      setAutoplay: (autoplay) => set({ autoplay }),
      setAutoNextEpisode: (autoNextEpisode) => set({ autoNextEpisode }),
      setAutoSkipIntro: (autoSkipIntro) => set({ autoSkipIntro }),
      setAmbientGlow: (ambientGlow) => set({ ambientGlow }),
      setVideoQuality: (videoQuality) => set({ videoQuality }),
    }),
    { name: "cinely-app-settings" }
  )
);
