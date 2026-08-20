import crypto from "crypto";
import { MediaKind } from "../types/media.js";

/**
 * Deterministically generates a Canonical ID for a media item.
 * Ensures that syncing from different sources (TMDB, IMDb, TVMaze) with matching IDs maps to the identical canonical ID.
 */
export function generateCanonicalId(kind: MediaKind, primaryId: string): string {
  // If primaryId is already a full URN, return it
  if (primaryId.startsWith("cinely:item:")) {
    return primaryId;
  }

  // Standardize prefix based on kind
  const prefix = kind === "movie" ? "mov" : kind === "series" ? "ser" : "itm";

  // Clean the identifier
  const cleanedId = primaryId.trim().toLowerCase();

  // If it's an IMDb ID (e.g. tt1492048), use it directly for human readability
  if (cleanedId.startsWith("tt") && /^[a-z0-9]+$/i.test(cleanedId)) {
    return `cinely:item:${prefix}_${cleanedId}`;
  }

  // Otherwise generate deterministic 12-char SHA-256 hash
  const hash = crypto.createHash("sha256").update(`${kind}:${cleanedId}`).digest("hex").slice(0, 12);
  return `cinely:item:${prefix}_${hash}`;
}

export function generateEpisodeId(seriesCanonicalId: string, seasonNumber: number, episodeNumber: number): string {
  return `${seriesCanonicalId}:s${seasonNumber}:e${episodeNumber}`;
}

export function generateCandidateId(addonId: string, streamUrlOrHash: string): string {
  const hash = crypto.createHash("sha256").update(`${addonId}:${streamUrlOrHash}`).digest("hex").slice(0, 16);
  return `cand_${hash}`;
}
