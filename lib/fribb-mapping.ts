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
  1429: { anilistId: 16498, title: "Attack on Titan" },
  // Death Note
  13916: { anilistId: 1535, title: "Death Note" },
  // Demon Slayer
  85937: { anilistId: 101922, title: "Demon Slayer: Kimetsu no Yaiba" },
  // Jujutsu Kaisen
  95479: { anilistId: 113415, title: "Jujutsu Kaisen" },
  // One Piece
  37854: { anilistId: 21, title: "One Piece" },
  // Naruto
  46260: { anilistId: 20, title: "Naruto" },
  // Naruto Shippuden
  31910: { anilistId: 1735, title: "Naruto: Shippuden" },
  // Solo Leveling
  122108: { anilistId: 151807, title: "Solo Leveling" },
  // Chainsaw Man
  114410: { anilistId: 127230, title: "Chainsaw Man" },
  // Bleach
  30984: { anilistId: 269, title: "Bleach" },
  // Bleach: Thousand-Year Blood War
  126308: { anilistId: 114446, title: "Bleach: Sennen Kessen-hen" },
  // My Hero Academia
  65930: { anilistId: 21459, title: "My Hero Academia" },
  // Hunter x Hunter
  46298: { anilistId: 11061, title: "Hunter x Hunter (2011)" },
  // Spy x Family
  120089: { anilistId: 140960, title: "SPY x FAMILY" },
  // Fullmetal Alchemist: Brotherhood
  31911: { anilistId: 5114, title: "Fullmetal Alchemist: Brotherhood" },
  // Spirited Away
  129: { anilistId: 199, title: "Spirited Away" },
  // Your Name
  372058: { anilistId: 21519, title: "Your Name." },
  // Overflow (TMDB 95897 & 97539)
  95897: { anilistId: 113417, title: "Overflow" },
  97539: { anilistId: 113417, title: "Overflow" },
  // Mushoku Tensei: Jobless Reincarnation
  94664: { anilistId: 108465, title: "Mushoku Tensei: Jobless Reincarnation" },
};

const mappingCache = new Map<number | string, { anilistId?: number; title?: string }>();

export async function resolveTmdbToAnilist(
  tmdbId?: number,
  rawTitle?: string
): Promise<{ anilistId?: number; title?: string }> {
  if (tmdbId && COMMON_MAPPINGS[tmdbId]) {
    return COMMON_MAPPINGS[tmdbId];
  }

  if (tmdbId && mappingCache.has(tmdbId)) {
    return mappingCache.get(tmdbId)!;
  }

  const cleanTitle = (rawTitle || "")
    .replace(/\s*—\s*Episode\s*\d+.*$/i, "")
    .replace(/\s*\(?(Sub|Dub|Subbed|Dubbed)\)?/gi, "")
    .replace(/Season\s*\d+/gi, "")
    .trim();

  if (cleanTitle && mappingCache.has(cleanTitle.toLowerCase())) {
    return mappingCache.get(cleanTitle.toLowerCase())!;
  }

  if (cleanTitle) {
    try {
      const query = `
        query ($search: String) {
          Media (search: $search, type: ANIME, sort: SEARCH_MATCH) {
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
        body: JSON.stringify({ query, variables: { search: cleanTitle } }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        const media = data?.data?.Media;
        if (media?.id) {
          const resolved = {
            anilistId: media.id,
            title: media.title?.english || media.title?.romaji || cleanTitle,
          };
          if (tmdbId) mappingCache.set(tmdbId, resolved);
          mappingCache.set(cleanTitle.toLowerCase(), resolved);
          return resolved;
        }
      }
    } catch {
      // Ignore network failures
    }
  }

  const fallback = { anilistId: undefined, title: cleanTitle || rawTitle };
  if (tmdbId) mappingCache.set(tmdbId, fallback);
  return fallback;
}
