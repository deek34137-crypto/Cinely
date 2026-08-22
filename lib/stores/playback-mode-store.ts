import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PlaybackModeState {
  isProxyPreferred: boolean;
  autoFallbackToEmbed: boolean;
  audioDubPreference: "sub" | "dub";
  subtitleLanguage: string;
  setProxyPreferred: (val: boolean) => void;
  setAutoFallback: (val: boolean) => void;
  setAudioDubPreference: (val: "sub" | "dub") => void;
  setSubtitleLanguage: (lang: string) => void;
}

export const usePlaybackModeStore = create<PlaybackModeState>()(
  persist(
    (set) => ({
      isProxyPreferred: true,
      autoFallbackToEmbed: true,
      audioDubPreference: "sub",
      subtitleLanguage: "en",
      setProxyPreferred: (isProxyPreferred) => set({ isProxyPreferred }),
      setAutoFallback: (autoFallbackToEmbed) => set({ autoFallbackToEmbed }),
      setAudioDubPreference: (audioDubPreference) => set({ audioDubPreference }),
      setSubtitleLanguage: (subtitleLanguage) => set({ subtitleLanguage }),
    }),
    { name: "cinely-playback-mode" }
  )
);
