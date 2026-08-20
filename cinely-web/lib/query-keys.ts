/**
 * Centralized TanStack Query cache keys for type-safe invalidation and query fetching.
 */

export const queryKeys = {
  discovery: {
    all: ['discovery'] as const,
    sections: (params?: { kind?: string; genre?: string; limit?: number }) =>
      ['discovery', 'sections', params ?? {}] as const,
    search: (query: string, kind?: string) =>
      ['discovery', 'search', { query, kind }] as const,
    detail: (id: string) => ['discovery', 'detail', id] as const,
    season: (id: string, seasonNumber: number) =>
      ['discovery', 'season', id, seasonNumber] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
  user: {
    watchlist: ['user', 'watchlist'] as const,
    progress: ['user', 'progress'] as const,
    addons: ['user', 'addons'] as const,
  },
  addons: {
    catalog: (params?: { category?: string; sort?: string; page?: number }) =>
      ['addons', 'catalog', params ?? {}] as const,
  },
} as const;
