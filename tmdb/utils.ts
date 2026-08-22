const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export const tmdbImage = {
  poster: (path: string | null | undefined, size: "w342" | "w500" | "w780" | "original" = "w500") => {
    if (!path) return "/placeholder-poster.png";
    if (path.startsWith("http")) return path;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  },
  backdrop: (path: string | null | undefined, size: "w780" | "w1280" | "original" = "w1280") => {
    if (!path) return "/placeholder-backdrop.png";
    if (path.startsWith("http")) return path;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  },
  still: (path: string | null | undefined, size: "w300" | "original" = "w300") => {
    if (!path) return "/placeholder-still.png";
    if (path.startsWith("http")) return path;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  },
  profile: (path: string | null | undefined, size: "w185" | "h632" | "original" = "w185") => {
    if (!path) return "/placeholder-avatar.png";
    if (path.startsWith("http")) return path;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  }
};
