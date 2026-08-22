export interface MediaProgress {
  contentId: number;
  mediaType: "movie" | "tv";
  currentTime: number;
  duration: number;
  season?: number;
  episode?: number;
  percentage: number;
  updatedAt: number;
  title?: string;
  posterUrl?: string;
}

const STORAGE_KEY = "cinely_playback_progress_v1";

export const progressStorage = {
  get: (contentId: number, mediaType: "movie" | "tv", season?: number, episode?: number): MediaProgress | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed: Record<string, MediaProgress> = JSON.parse(raw);
      const key = mediaType === "movie" ? `movie_${contentId}` : `tv_${contentId}_s${season || 1}_e${episode || 1}`;
      return parsed[key] || null;
    } catch {
      return null;
    }
  },

  getAll: (): MediaProgress[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: Record<string, MediaProgress> = JSON.parse(raw);
      return Object.values(parsed).sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  },

  save: (progress: Omit<MediaProgress, "updatedAt" | "percentage">) => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: Record<string, MediaProgress> = raw ? JSON.parse(raw) : {};
      const key =
        progress.mediaType === "movie"
          ? `movie_${progress.contentId}`
          : `tv_${progress.contentId}_s${progress.season || 1}_e${progress.episode || 1}`;

      const percentage = progress.duration > 0 ? (progress.currentTime / progress.duration) * 100 : 0;

      parsed[key] = {
        ...progress,
        percentage,
        updatedAt: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch (err) {
      console.warn("Failed to save playback progress:", err);
    }
  },

  remove: (contentId: number, mediaType: "movie" | "tv", season?: number, episode?: number) => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: Record<string, MediaProgress> = JSON.parse(raw);
      const key =
        mediaType === "movie"
          ? `movie_${contentId}`
          : `tv_${contentId}_s${season || 1}_e${episode || 1}`;
      delete parsed[key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch {}
  }
};
