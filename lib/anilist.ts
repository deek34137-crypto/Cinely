export interface AniListMedia {
  id: number;
  title: {
    romaji?: string;
    english?: string;
    native?: string;
  };
  coverImage?: {
    extraLarge?: string;
    large?: string;
    medium?: string;
  };
  bannerImage?: string;
  description?: string;
  episodes?: number;
  genres?: string[];
  averageScore?: number;
  status?: string;
  isAdult?: boolean;
}

const ANILIST_GRAPHQL_ENDPOINT = "https://graphql.anilist.co";

export async function searchAniList(queryText: string, perPage = 6): Promise<AniListMedia[]> {
  if (!queryText || !queryText.trim()) return [];

  const query = `
    query SearchAnime($search: String, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
          id
          title {
            english
            romaji
            native
          }
          coverImage {
            extraLarge
            large
          }
          bannerImage
          description
          episodes
          genres
          averageScore
          status
          isAdult
        }
      }
    }
  `;

  try {
    const res = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          search: queryText.trim(),
          perPage,
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data?.data?.Page?.media || [];
  } catch (error) {
    console.warn("[AniList] Search error:", error);
    return [];
  }
}

export async function getAniListDetails(id: number | string): Promise<AniListMedia | null> {
  const numericId = typeof id === "string" ? parseInt(id.replace(/\D/g, ""), 10) : id;
  if (!numericId || isNaN(numericId)) return null;

  const query = `
    query GetAnimeDetails($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title {
          english
          romaji
          native
        }
        coverImage {
          extraLarge
          large
        }
        bannerImage
        description
        episodes
        genres
        averageScore
        status
        isAdult
      }
    }
  `;

  try {
    const res = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { id: numericId },
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.Media || null;
  } catch (error) {
    console.warn("[AniList] GetDetails error:", error);
    return null;
  }
}
