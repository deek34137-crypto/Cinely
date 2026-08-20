import {
  ApiResponse,
  AuthResponse,
  DiscoverSectionsResponse,
  MediaKind,
  NormalizedMediaDetail,
  NormalizedSeasonDetail,
  ProblemDetails,
  SearchResponse,
  UserProfile,
  UserMeResponse,
  WatchlistResponse,
  WatchlistMutationResponse,
  ProgressResponse,
  UpdateProgressPayload,
  AddonCatalogResponse,
  UserAddonsResponse,
  UpdateUserAddonPayload,
  AddonToggleResponse,
  PlaybackResponse,
} from './types';

export class ApiError extends Error {
  public readonly problem?: ProblemDetails;
  public readonly status: number;

  constructor(status: number, message: string, problem?: ProblemDetails) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers = new Headers(options.headers || {});
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json, application/problem+json');
    }
    if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Automatically passes httpOnly session & auth cookies
    });

    if (!response.ok) {
      let problem: ProblemDetails | undefined;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('json') || contentType.includes('problem+json')) {
        try {
          problem = await response.json();
        } catch {
          // Fallback if parsing fails
        }
      }
      throw new ApiError(
        response.status,
        problem?.detail || problem?.title || `HTTP error ${response.status}: ${response.statusText}`,
        problem
      );
    }

    const json = (await response.json()) as ApiResponse<T>;
    return json.data;
  }

  /**
   * GET /v1/discover
   */
  async getDiscover(params?: { kind?: MediaKind; genre?: string; limit?: number }): Promise<DiscoverSectionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.kind) searchParams.set('kind', params.kind);
    if (params?.genre) searchParams.set('genre', params.genre);
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const qs = searchParams.toString();
    return this.request<DiscoverSectionsResponse>(`/v1/discover${qs ? `?${qs}` : ''}`);
  }

  /**
   * GET /v1/search
   */
  async search(query: string, params?: { kind?: MediaKind; limit?: number }): Promise<SearchResponse> {
    const searchParams = new URLSearchParams({ q: query });
    if (params?.kind) searchParams.set('kind', params.kind);
    if (params?.limit) searchParams.set('limit', String(params.limit));

    return this.request<SearchResponse>(`/v1/search?${searchParams.toString()}`);
  }

  /**
   * GET /v1/media/:id
   */
  async getMedia(id: string): Promise<NormalizedMediaDetail> {
    return this.request<NormalizedMediaDetail>(`/v1/media/${encodeURIComponent(id)}`);
  }

  /**
   * GET /v1/media/:id/seasons/:seasonNumber
   */
  async getSeason(id: string, seasonNumber: number): Promise<NormalizedSeasonDetail> {
    return this.request<NormalizedSeasonDetail>(
      `/v1/media/${encodeURIComponent(id)}/seasons/${encodeURIComponent(seasonNumber)}`
    );
  }

  /**
   * POST /v1/auth/register
   */
  async register(payload: { email: string; password: string; displayName: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * POST /v1/auth/login
   */
  async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * POST /v1/auth/refresh
   */
  async refresh(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/v1/auth/refresh', {
      method: 'POST',
    });
  }

  /**
   * POST /v1/auth/logout
   */
  async logout(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/v1/auth/logout', {
      method: 'POST',
    });
  }

  /**
   * GET /v1/users/me
   */
  async getMe(): Promise<UserProfile> {
    const res = await this.request<UserMeResponse>('/v1/users/me');
    return res.user;
  }

  /**
   * GET /v1/users/me/watchlist
   */
  async getWatchlist(): Promise<WatchlistResponse> {
    return this.request<WatchlistResponse>('/v1/users/me/watchlist');
  }

  /**
   * POST /v1/users/me/watchlist/:id
   */
  async addToWatchlist(canonicalMediaId: string): Promise<WatchlistMutationResponse> {
    return this.request<WatchlistMutationResponse>(
      `/v1/users/me/watchlist/${encodeURIComponent(canonicalMediaId)}`,
      {
        method: 'POST',
      }
    );
  }

  /**
   * DELETE /v1/users/me/watchlist/:id
   */
  async removeFromWatchlist(canonicalMediaId: string): Promise<WatchlistMutationResponse> {
    return this.request<WatchlistMutationResponse>(
      `/v1/users/me/watchlist/${encodeURIComponent(canonicalMediaId)}`,
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * GET /v1/users/me/progress
   * Returns all playback progress records for the authenticated user, newest first.
   */
  async getProgress(): Promise<ProgressResponse> {
    return this.request<ProgressResponse>('/v1/users/me/progress');
  }

  /**
   * PUT /v1/users/me/progress/:id
   * Upserts playback progress for a canonical media ID.
   */
  async updateProgress(
    canonicalMediaId: string,
    payload: UpdateProgressPayload
  ): Promise<{ data: { mediaId: string; progressPercent: number; completed: boolean } }> {
    return this.request(
      `/v1/users/me/progress/${encodeURIComponent(canonicalMediaId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
  }

  /**
   * DELETE /v1/users/me/progress/:id
   * Removes a progress record for a canonical media ID.
   */
  async deleteProgress(
    canonicalMediaId: string,
    params?: { seasonNumber?: number; episodeNumber?: number }
  ): Promise<{ message: string }> {
    const qs = new URLSearchParams();
    if (params?.seasonNumber !== undefined) qs.set('seasonNumber', String(params.seasonNumber));
    if (params?.episodeNumber !== undefined) qs.set('episodeNumber', String(params.episodeNumber));
    const query = qs.toString();
    return this.request(
      `/v1/users/me/progress/${encodeURIComponent(canonicalMediaId)}${query ? `?${query}` : ''}`,
      { method: 'DELETE' }
    );
  }

  // ─── Addon API ───────────────────────────────────────────────────────────────

  /**
   * GET /v1/addons/catalog
   * Public endpoint — no credentials required.
   */
  async getCatalog(): Promise<AddonCatalogResponse> {
    return this.request<AddonCatalogResponse>('/v1/addons/catalog', { credentials: 'omit' });
  }

  /**
   * GET /v1/users/me/addons
   * Returns catalog joined with the authenticated user's preferences.
   */
  async getUserAddons(): Promise<UserAddonsResponse> {
    return this.request<UserAddonsResponse>('/v1/users/me/addons');
  }

  /**
   * POST /v1/users/me/addons/:id/enable
   * Enables an approved addon for the authenticated user. Idempotent.
   */
  async enableAddon(addonId: string): Promise<AddonToggleResponse> {
    return this.request<AddonToggleResponse>(
      `/v1/users/me/addons/${encodeURIComponent(addonId)}/enable`,
      { method: 'POST' }
    );
  }

  /**
   * POST /v1/users/me/addons/:id/disable
   * Disables an addon for the authenticated user. Idempotent.
   */
  async disableAddon(addonId: string): Promise<AddonToggleResponse> {
    return this.request<AddonToggleResponse>(
      `/v1/users/me/addons/${encodeURIComponent(addonId)}/disable`,
      { method: 'POST' }
    );
  }

  /**
   * PUT /v1/users/me/addons/:id
   * Updates priorityOrder and/or configuration for an addon.
   * Backend validates that non-configurable addons reject configuration payloads.
   */
  async updateAddon(
    addonId: string,
    payload: UpdateUserAddonPayload
  ): Promise<{ addonId: string; enabled: boolean; priorityOrder: number; configuration?: Record<string, unknown> }> {
    return this.request(
      `/v1/users/me/addons/${encodeURIComponent(addonId)}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    );
  }

  /**
   * DELETE /v1/users/me/addons/:id
   * Removes the user's preference row for this addon (sets enabled=false).
   * Does NOT reset configuration to a known default — preference row is removed.
   * Backend contract: returns { addonId, enabled: false }.
   */
  async removeAddonPreference(addonId: string): Promise<AddonToggleResponse> {
    return this.request<AddonToggleResponse>(
      `/v1/users/me/addons/${encodeURIComponent(addonId)}`,
      { method: 'DELETE' }
    );
  }

  // ─── Playback API (Phase 3B/3C) ─────────────────────────────────────────────

  /**
   * GET /v1/media/:id/playback
   * Resolves, selects, and sanitizes browser-playable stream sources for a canonical media item.
   */
  async getPlayback(
    canonicalMediaId: string,
    params?: { season?: number; episode?: number }
  ): Promise<PlaybackResponse> {
    const qs = new URLSearchParams();
    if (params?.season !== undefined && params.season > 0) qs.set('season', String(params.season));
    if (params?.episode !== undefined && params.episode > 0) qs.set('episode', String(params.episode));
    const query = qs.toString();
    return this.request<PlaybackResponse>(
      `/v1/media/${encodeURIComponent(canonicalMediaId)}/playback${query ? `?${query}` : ''}`
    );
  }
}

export const apiClient = new ApiClient();
