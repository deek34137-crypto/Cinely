/**
 * CustomAddonStore — browser-local storage for custom Stremio addon records.
 *
 * All data is persisted in localStorage. No server API calls are made.
 * Custom addon configuration is stored unencrypted — the UI must communicate
 * this clearly to users before they enter sensitive credentials.
 */

import { CustomAddonRecord } from '../types';

const STORAGE_KEY = 'cinely_custom_addons';

function readAll(): CustomAddonRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomAddonRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(records: CustomAddonRecord[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export const CustomAddonStore = {
  /** Returns all custom addon records in installation order. */
  getAll(): CustomAddonRecord[] {
    return readAll();
  },

  /**
   * Adds a new addon record.
   * Deduplicates by `record.id` — silently replaces if already present.
   */
  add(record: CustomAddonRecord): void {
    const all = readAll().filter((r) => r.id !== record.id);
    all.push(record);
    writeAll(all);
  },

  /** Removes an addon by its stable ID. No-op if not found. */
  remove(id: string): void {
    writeAll(readAll().filter((r) => r.id !== id));
  },

  /** Enables or disables an addon. No-op if not found. */
  setEnabled(id: string, enabled: boolean): void {
    writeAll(
      readAll().map((r) => (r.id === id ? { ...r, enabled } : r))
    );
  },

  /** Updates the user-controlled priority order. No-op if not found. */
  setPriorityOrder(id: string, priorityOrder: number): void {
    writeAll(
      readAll().map((r) => (r.id === id ? { ...r, priorityOrder } : r))
    );
  },

  /** Records the last stream test result on an addon card. */
  setTestStatus(id: string, status: CustomAddonRecord['lastTestStatus']): void {
    writeAll(
      readAll().map((r) => (r.id === id ? { ...r, lastTestStatus: status } : r))
    );
  },

  /** Returns a single record by ID, or undefined if not found. */
  getById(id: string): CustomAddonRecord | undefined {
    return readAll().find((r) => r.id === id);
  },

  /** Returns enabled addons sorted by priorityOrder ascending. */
  getEnabledSorted(): CustomAddonRecord[] {
    return readAll()
      .filter((r) => r.enabled)
      .sort((a, b) => a.priorityOrder - b.priorityOrder);
  },
} as const;
