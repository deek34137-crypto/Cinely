export interface AnimeMapping {
  tmdbId?: number;
  anilistId?: number;
  malId?: number;
  kitsuId?: number;
  title: string;
}

// Popular mappings fallback table
const COMMON_MAPPINGS: Record<number, { anilistId: number; title: string }> = {
  // Attack on Titan
  1429: { anilistId: 16498, title: "Shingeki no Kyojin" },
  // Death Note
  13916: { anilistId: 1535, title: "Death Note" },
  // Demon Slayer
  85937: { anilistId: 101922, title: "Kimetsu no Yaiba" },
  // Jujutsu Kaisen
  95479: { anilistId: 113415, title: "Jujutsu Kaisen" },
  // One Piece
  37854: { anilistId: 21, title: "One Piece" },
  // Naruto
  46260: { anilistId: 20, title: "Naruto" },
  // Fullmetal Alchemist: Brotherhood
  31911: { anilistId: 5114, title: "Fullmetal Alchemist: Brotherhood" },
  // Spirited Away
  129: { anilistId: 199, title: "Sen to Chihiro no Kamikakushi" },
  // Your Name
  372058: { anilistId: 21519, title: "Kimi no Na wa." },
};

export async function resolveTmdbToAnilist(tmdbId: number, title?: string): Promise<{ anilistId?: number; title?: string }> {
  if (COMMON_MAPPINGS[tmdbId]) {
    return COMMON_MAPPINGS[tmdbId];
  }

  if (title) {
    try {
      // Query AniList GraphQL API by title
      const query = `
        query ($search: String) {
          Media (search: $search, type: ANIME) {
            id
            title {
              romaji
              english
              native
            }
          }
        }
      `;
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, variables: { search: title } }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.data?.Media?.id) {
          return {
            anilistId: data.data.Media.id,
            title: data.data.Media.title?.english || data.data.Media.title?.romaji || title,
          };
        }
      }
    } catch {
      // Ignore network failures for fallback
    }
  }

  return { anilistId: undefined, title };
}
