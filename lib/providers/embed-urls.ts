import { videoServers, VideoServer } from "../stores/video-servers";

export function getEmbedUrl(
  serverId: string,
  tmdbId: number,
  mediaType: "movie" | "tv",
  season = 1,
  episode = 1
): string {
  const server = videoServers.find((s) => s.id === serverId) || videoServers[0];
  if (mediaType === "movie") {
    return server.getMovieUrl(tmdbId);
  }
  return server.getEpisodeUrl(tmdbId, season, episode);
}

export function getAllServers(): VideoServer[] {
  return videoServers;
}
