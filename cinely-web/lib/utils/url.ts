/**
 * Universal watch URL builder ensuring consistent URL encoding of canonical media IDs
 * and TV season/episode coordinates across all UI components.
 */
export function buildWatchUrl(
  mediaId: string,
  seasonNumber?: number,
  episodeNumber?: number
): string {
  const encodedId = encodeURIComponent(mediaId);
  const params = new URLSearchParams();

  if (typeof seasonNumber === 'number' && seasonNumber > 0) {
    params.set('season', String(seasonNumber));
  }
  if (typeof episodeNumber === 'number' && episodeNumber > 0) {
    params.set('episode', String(episodeNumber));
  }

  const queryString = params.toString();
  return queryString ? `/watch/${encodedId}?${queryString}` : `/watch/${encodedId}`;
}
