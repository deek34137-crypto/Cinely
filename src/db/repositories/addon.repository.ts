import crypto from "crypto";
import { getDatabase } from "../index.js";
import {
  AddonCatalogItem,
  UserAddonItem,
  UserAddonPreference,
  UpdateUserAddonPayload,
  AddonCapabilities
} from "../../core/types/addon.js";
import { NotFoundError, ValidationError } from "../../core/types/errors.js";

export const DEFAULT_SERVER_ADDONS: AddonCatalogItem[] = [
  {
    id: "torrentio",
    name: "Torrentio",
    version: "1.0.14",
    description: "Scrapes torrent streams from various providers with Debrid & quality configuration support.",
    manifestUrl: "https://torrentio.strem.fun/manifest.json",
    logoUrl: "https://torrentio.strem.fun/logo.png",
    backgroundUrl: null,
    types: ["movie", "series", "anime"],
    categories: ["torrents", "debrid support", "movies", "tv shows"],
    stars: 995,
    enabled: true,
    configurable: true,
    capabilities: {
      catalog: false,
      meta: false,
      stream: true,
      subtitles: false
    }
  },
  {
    id: "comet",
    name: "Comet",
    version: "1.2.0",
    description: "High-performance torrent / debrid stream aggregator with smart deduplication.",
    manifestUrl: "https://comet.elfhosted.com/manifest.json",
    logoUrl: "https://comet.elfhosted.com/logo.png",
    backgroundUrl: null,
    types: ["movie", "series"],
    categories: ["torrents", "debrid support", "movies", "tv shows"],
    stars: 840,
    enabled: true,
    configurable: true,
    capabilities: {
      catalog: false,
      meta: false,
      stream: true,
      subtitles: false
    }
  },
  {
    id: "mediafusion",
    name: "MediaFusion",
    version: "4.1.2",
    description: "Multi-source streaming addon supporting live sports, torrents, and catalog streams.",
    manifestUrl: "https://mediafusion.elfhosted.com/manifest.json",
    logoUrl: "https://mediafusion.elfhosted.com/logo.png",
    backgroundUrl: null,
    types: ["movie", "series", "tv"],
    categories: ["live tv", "movies", "tv shows", "torrents"],
    stars: 760,
    enabled: true,
    configurable: true,
    capabilities: {
      catalog: true,
      meta: false,
      stream: true,
      subtitles: false
    }
  },
  {
    id: "opensubtitles-v3",
    name: "OpenSubtitles v3",
    version: "3.0.0",
    description: "Official OpenSubtitles.com subtitle provider for movies and TV episodes in 80+ languages.",
    manifestUrl: "https://opensubtitles-v3.strem.io/manifest.json",
    logoUrl: "https://opensubtitles-v3.strem.io/logo.png",
    backgroundUrl: null,
    types: ["movie", "series"],
    categories: ["subtitles"],
    stars: 920,
    enabled: true,
    configurable: false,
    capabilities: {
      catalog: false,
      meta: false,
      stream: false,
      subtitles: true
    }
  },
  {
    id: "cyberflix",
    name: "CyberFlix Catalog",
    version: "1.5.1",
    description: "Rich curated catalogs and metadata for trending streaming platforms.",
    manifestUrl: "https://cyberflix.elfhosted.com/manifest.json",
    logoUrl: "https://cyberflix.elfhosted.com/logo.png",
    backgroundUrl: null,
    types: ["movie", "series"],
    categories: ["metadata", "movies", "tv shows"],
    stars: 650,
    enabled: true,
    configurable: true,
    capabilities: {
      catalog: true,
      meta: true,
      stream: false,
      subtitles: false
    }
  }
];

export class AddonRepository {
  /**
   * Ensures default approved server addons exist in catalog.
   */
  async seedDefaultCatalog(): Promise<void> {
    const db = getDatabase();
    const existing = await db.query("SELECT id FROM addon_catalog");
    if (existing.length === 0) {
      for (const addon of DEFAULT_SERVER_ADDONS) {
        await this.upsertCatalogItem(addon);
      }
    }
  }

  /**
   * Saves or updates a catalog addon.
   */
  async upsertCatalogItem(item: AddonCatalogItem): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const resources = [
      item.capabilities.catalog ? "catalog" : null,
      item.capabilities.meta ? "meta" : null,
      item.capabilities.stream ? "stream" : null,
      item.capabilities.subtitles ? "subtitles" : null
    ].filter(Boolean);

    await db.run(
      `INSERT INTO addon_catalog (
        id, manifest_url, name, version, description, logo_url, background_url,
        types, resources, catalogs, id_prefixes, categories, stars,
        is_configurable, is_default, raw_manifest, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.manifestUrl,
        item.name,
        item.version,
        item.description || null,
        item.logoUrl || null,
        item.backgroundUrl || null,
        JSON.stringify(item.types),
        JSON.stringify(resources),
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify(item.categories),
        item.stars,
        item.configurable ? 1 : 0,
        item.enabled ? 1 : 0,
        JSON.stringify({ id: item.id, name: item.name, version: item.version, resources }),
        now
      ]
    );
  }

  /**
   * Retrieves all global catalog items.
   */
  async getCatalog(): Promise<AddonCatalogItem[]> {
    await this.seedDefaultCatalog();
    const db = getDatabase();
    const rows = await db.query<any>("SELECT * FROM addon_catalog ORDER BY stars DESC");

    return rows.map((row) => this.mapRowToCatalogItem(row));
  }

  /**
   * Retrieves a single catalog item by ID.
   */
  async getCatalogItemById(id: string): Promise<AddonCatalogItem | null> {
    await this.seedDefaultCatalog();
    const db = getDatabase();
    const row = await db.get<any>("SELECT * FROM addon_catalog WHERE id = ?", [id]);
    if (!row) return null;
    return this.mapRowToCatalogItem(row);
  }

  /**
   * Retrieves all addons for a user with their personal preferences joined.
   */
  async getUserAddons(userId: string): Promise<UserAddonItem[]> {
    const catalog = await this.getCatalog();
    const db = getDatabase();
    const userPrefs = await db.query<any>("SELECT * FROM user_addon_preferences WHERE user_id = ?", [userId]);
    const prefsByAddon = new Map<string, any>();
    for (const pref of userPrefs) {
      prefsByAddon.set(pref.addon_id, pref);
    }

    const items: UserAddonItem[] = catalog.map((addon) => {
      const pref = prefsByAddon.get(addon.id);
      let userEnabled = addon.enabled;
      let priorityOrder = 100;
      let userConfiguration: Record<string, unknown> | undefined;

      if (pref) {
        userEnabled = pref.is_enabled === 1;
        priorityOrder = pref.priority_order ?? 100;
        if (pref.encrypted_config) {
          try {
            userConfiguration = JSON.parse(pref.encrypted_config);
          } catch {
            userConfiguration = undefined;
          }
        }
      }

      return {
        ...addon,
        userEnabled,
        priorityOrder,
        userConfiguration
      };
    });

    items.sort((a, b) => a.priorityOrder - b.priorityOrder || b.stars - a.stars);
    return items;
  }

  /**
   * Enables an addon for a user. Idempotent.
   */
  async enableUserAddon(userId: string, addonId: string): Promise<UserAddonPreference> {
    const addon = await this.getCatalogItemById(addonId);
    if (!addon) {
      throw new NotFoundError("Addon", addonId);
    }

    if (!addon.enabled) {
      throw new ValidationError("Disabled global addon cannot be enabled.");
    }

    return this.upsertUserPreference(userId, addonId, { enabled: true });
  }

  /**
   * Disables an addon for a user. Idempotent.
   */
  async disableUserAddon(userId: string, addonId: string): Promise<UserAddonPreference> {
    const addon = await this.getCatalogItemById(addonId);
    if (!addon) {
      throw new NotFoundError("Addon", addonId);
    }

    return this.upsertUserPreference(userId, addonId, { enabled: false });
  }

  /**
   * Updates user addon preference / configuration.
   */
  async updateUserAddon(
    userId: string,
    addonId: string,
    payload: UpdateUserAddonPayload
  ): Promise<UserAddonPreference> {
    const addon = await this.getCatalogItemById(addonId);
    if (!addon) {
      throw new NotFoundError("Addon", addonId);
    }

    if (payload.configuration && !addon.configurable) {
      throw new ValidationError("Addon does not support custom configuration.");
    }

    return this.upsertUserPreference(userId, addonId, payload);
  }

  /**
   * Deletes a user addon preference row.
   */
  async deleteUserAddon(userId: string, addonId: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run(
      "DELETE FROM user_addon_preferences WHERE user_id = ? AND addon_id = ?",
      [userId, addonId]
    );
    return result.changes > 0;
  }

  private async upsertUserPreference(
    userId: string,
    addonId: string,
    payload: UpdateUserAddonPayload
  ): Promise<UserAddonPreference> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = `cinely:uaddon:${crypto.randomUUID()}`;

    const existing = await db.get<any>(
      "SELECT * FROM user_addon_preferences WHERE user_id = ? AND addon_id = ?",
      [userId, addonId]
    );

    const isEnabled = payload.enabled !== undefined ? (payload.enabled ? 1 : 0) : (existing?.is_enabled ?? 1);
    const priorityOrder = payload.priorityOrder !== undefined ? payload.priorityOrder : (existing?.priority_order ?? 100);
    const configStr = payload.configuration !== undefined
      ? JSON.stringify(payload.configuration)
      : (existing?.encrypted_config ?? null);

    await db.run(
      `INSERT INTO user_addon_preferences (
        id, user_id, addon_id, is_enabled, priority_order, key_version,
        key_id, nonce_iv, auth_tag, encrypted_config, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        addonId,
        isEnabled,
        priorityOrder,
        "v1",
        "cinely-master-v1",
        null,
        null,
        configStr,
        existing?.created_at || now,
        now
      ]
    );

    return {
      addonId,
      enabled: isEnabled === 1,
      priorityOrder,
      configuration: configStr ? JSON.parse(configStr) : undefined,
      createdAt: existing?.created_at || now,
      updatedAt: now
    };
  }

  private mapRowToCatalogItem(row: any): AddonCatalogItem {
    let types: string[] = [];
    let categories: string[] = [];
    let resources: string[] = [];

    try {
      types = typeof row.types === "string" ? JSON.parse(row.types) : (row.types || []);
    } catch { types = []; }

    try {
      categories = typeof row.categories === "string" ? JSON.parse(row.categories) : (row.categories || []);
    } catch { categories = []; }

    try {
      resources = typeof row.resources === "string" ? JSON.parse(row.resources) : (row.resources || []);
    } catch { resources = []; }

    const capabilities: AddonCapabilities = {
      catalog: resources.includes("catalog"),
      meta: resources.includes("meta"),
      stream: resources.includes("stream"),
      subtitles: resources.includes("subtitles")
    };

    return {
      id: row.id,
      name: row.name,
      version: row.version,
      description: row.description || undefined,
      manifestUrl: row.manifest_url,
      logoUrl: row.logo_url || null,
      backgroundUrl: row.background_url || null,
      types,
      categories,
      stars: Number(row.stars || 0),
      enabled: row.is_default === 1 || row.is_default === true,
      configurable: row.is_configurable === 1 || row.is_configurable === true,
      capabilities
    };
  }
}
