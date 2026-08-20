export interface AddonCapabilities {
  catalog: boolean;
  meta: boolean;
  stream: boolean;
  subtitles: boolean;
}

export interface AddonCatalogItem {
  id: string;
  name: string;
  version: string;
  description?: string;
  manifestUrl: string;
  logoUrl?: string | null;
  backgroundUrl?: string | null;
  types: string[];
  categories: string[];
  stars: number;
  enabled: boolean;
  configurable: boolean;
  capabilities: AddonCapabilities;
}

export interface UserAddonPreference {
  addonId: string;
  enabled: boolean;
  priorityOrder: number;
  configuration?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UserAddonItem extends AddonCatalogItem {
  userEnabled: boolean;
  priorityOrder: number;
  userConfiguration?: Record<string, unknown>;
}

export interface AddonCatalogResponse {
  items: AddonCatalogItem[];
  total: number;
}

export interface UserAddonsResponse {
  items: UserAddonItem[];
  total: number;
}

export interface UpdateUserAddonPayload {
  enabled?: boolean;
  priorityOrder?: number;
  configuration?: Record<string, unknown>;
}
