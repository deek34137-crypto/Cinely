import { describe, it, expect, beforeEach } from 'vitest';
import { CustomAddonStore } from '../custom-addon-store';
import { CustomAddonRecord } from '../../types';

const sampleAddon: CustomAddonRecord = {
  id: 'custom_12345678',
  name: 'Test Provider',
  manifestUrl: 'https://example.com/manifest.json',
  manifest: {
    id: 'com.example.provider',
    name: 'Test Provider',
    version: '1.0.0',
    resources: ['stream'],
    types: ['movie', 'series'],
    catalogs: [],
  },
  enabled: true,
  priorityOrder: 100,
  installedAt: 1700000000000,
  lastTestStatus: 'untested',
};

describe('CustomAddonStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts with empty list', () => {
    expect(CustomAddonStore.getAll()).toEqual([]);
  });

  it('adds and retrieves addon records', () => {
    CustomAddonStore.add(sampleAddon);
    const all = CustomAddonStore.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('custom_12345678');
    expect(CustomAddonStore.getById('custom_12345678')).toEqual(sampleAddon);
  });

  it('deduplicates on add by replacing existing record with same id', () => {
    CustomAddonStore.add(sampleAddon);
    CustomAddonStore.add({ ...sampleAddon, name: 'Updated Provider Name' });
    const all = CustomAddonStore.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Updated Provider Name');
  });

  it('removes addon by id', () => {
    CustomAddonStore.add(sampleAddon);
    expect(CustomAddonStore.getAll()).toHaveLength(1);
    CustomAddonStore.remove(sampleAddon.id);
    expect(CustomAddonStore.getAll()).toHaveLength(0);
  });

  it('enables and disables addons', () => {
    CustomAddonStore.add(sampleAddon);
    CustomAddonStore.setEnabled(sampleAddon.id, false);
    expect(CustomAddonStore.getById(sampleAddon.id)?.enabled).toBe(false);
    expect(CustomAddonStore.getEnabledSorted()).toHaveLength(0);

    CustomAddonStore.setEnabled(sampleAddon.id, true);
    expect(CustomAddonStore.getById(sampleAddon.id)?.enabled).toBe(true);
    expect(CustomAddonStore.getEnabledSorted()).toHaveLength(1);
  });

  it('updates priorityOrder and sorts enabled addons ascending', () => {
    const addonA = { ...sampleAddon, id: 'custom_a', priorityOrder: 200 };
    const addonB = { ...sampleAddon, id: 'custom_b', priorityOrder: 50 };
    const addonC = { ...sampleAddon, id: 'custom_c', priorityOrder: 150, enabled: false };

    CustomAddonStore.add(addonA);
    CustomAddonStore.add(addonB);
    CustomAddonStore.add(addonC);

    const enabledSorted = CustomAddonStore.getEnabledSorted();
    expect(enabledSorted).toHaveLength(2);
    expect(enabledSorted[0].id).toBe('custom_b');
    expect(enabledSorted[1].id).toBe('custom_a');

    CustomAddonStore.setPriorityOrder('custom_a', 20);
    const updatedSorted = CustomAddonStore.getEnabledSorted();
    expect(updatedSorted[0].id).toBe('custom_a');
    expect(updatedSorted[1].id).toBe('custom_b');
  });

  it('sets and updates test status', () => {
    CustomAddonStore.add(sampleAddon);
    CustomAddonStore.setTestStatus(sampleAddon.id, 'cors_blocked');
    expect(CustomAddonStore.getById(sampleAddon.id)?.lastTestStatus).toBe('cors_blocked');
  });
});
