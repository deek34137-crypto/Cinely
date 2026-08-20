'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '../../../components/layout/Navbar';
import {
  useUserAddons,
  useEnableAddon,
  useDisableAddon,
  useUpdateAddon,
  useRemoveAddonPreference,
} from '../../../hooks/useAddons';
import { useAuth } from '../../../hooks/useAuth';
import { UserAddonItem, AddonCapabilities, CustomAddonRecord, CustomAddonInstallStatus } from '../../../lib/types';
import { ApiError as ApiClientError } from '../../../lib/api-client';
import { CustomAddonStore } from '../../../lib/custom-addons/custom-addon-store';
import { validateManifestUrl, addonHasStreamCapability, stableAddonId } from '../../../lib/custom-addons/manifest-validator';
import styles from './AddonsPage.module.css';


// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAddonInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function serializeConfig(config?: Record<string, unknown>): string {
  if (!config || Object.keys(config).length === 0) return '{}';
  try {
    return JSON.stringify(config, null, 2);
  } catch {
    return '{}';
  }
}

function parseJsonSafe(raw: string): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: 'Configuration must be a JSON object, not an array or primitive.' };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── CapabilityChips ─────────────────────────────────────────────────────────

function CapabilityChips({ capabilities }: { capabilities: AddonCapabilities }) {
  return (
    <div className={styles.capabilityChips}>
      {capabilities.stream && <span className={`${styles.chip} ${styles.chipStream}`}>Stream</span>}
      {capabilities.catalog && <span className={`${styles.chip} ${styles.chipCatalog}`}>Catalog</span>}
      {capabilities.meta && <span className={`${styles.chip} ${styles.chipMeta}`}>Meta</span>}
      {capabilities.subtitles && <span className={`${styles.chip} ${styles.chipSubtitles}`}>Subtitles</span>}
    </div>
  );
}

// ─── ConfigurationPanel ───────────────────────────────────────────────────────

interface ConfigPanelProps {
  addon: UserAddonItem;
  onClose: () => void;
}

function ConfigurationPanel({ addon, onClose }: ConfigPanelProps) {
  const updateAddon = useUpdateAddon();
  const [rawJson, setRawJson] = useState<string>(
    serializeConfig(addon.userConfiguration)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleChange = (val: string) => {
    setRawJson(val);
    setJsonError(null);
    setApiError(null);
  };

  const handleReset = () => {
    setRawJson(serializeConfig(addon.userConfiguration));
    setJsonError(null);
    setApiError(null);
  };

  const handleSave = async () => {
    setJsonError(null);
    setApiError(null);

    const result = parseJsonSafe(rawJson);
    if (!result.ok) {
      setJsonError(result.error);
      return;
    }

    try {
      await updateAddon.mutateAsync({
        addonId: addon.id,
        payload: { configuration: result.value },
      });
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.problem?.title ?? err.message
          : 'Failed to save configuration. Please try again.';
      setApiError(message);
      // Do NOT clear rawJson — user retains their unsaved changes on failure
    }
  };

  const isJsonInvalid = jsonError !== null;
  const isSaving = updateAddon.isPending;

  return (
    <div className={styles.configPanel} data-testid={`config-panel-${addon.id}`}>
      <div className={styles.configPanelTitle}>Configure {addon.name}</div>
      <p className={styles.configPanelHint}>
        Enter a valid JSON object. Configuration is validated and persisted by the Cinely engine.
        The accepted fields depend on the addon — refer to the addon's documentation.
      </p>

      <textarea
        className={`${styles.configTextarea}${isJsonInvalid ? ` ${styles.invalid}` : ''}`}
        value={rawJson}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
        aria-label={`Configuration JSON for ${addon.name}`}
        data-testid={`config-textarea-${addon.id}`}
      />

      {jsonError && (
        <p className={styles.configJsonError} role="alert" data-testid="config-json-error">
          JSON error: {jsonError}
        </p>
      )}

      {apiError && (
        <p className={styles.configApiError} role="alert" data-testid="config-api-error">
          {apiError}
        </p>
      )}

      <div className={styles.configActions}>
        <button
          type="button"
          className={styles.configResetBtn}
          onClick={handleReset}
          disabled={isSaving}
          data-testid={`config-reset-${addon.id}`}
        >
          Reset
        </button>
        <button
          type="button"
          className={styles.configSaveBtn}
          onClick={handleSave}
          disabled={isSaving || isJsonInvalid}
          data-testid={`config-save-${addon.id}`}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ─── AddonCard ───────────────────────────────────────────────────────────────

interface AddonCardProps {
  addon: UserAddonItem;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: (addon: UserAddonItem) => void;
  onMoveDown: (addon: UserAddonItem) => void;
  isReordering: boolean;
}

function AddonCard({ addon, isFirst, isLast, onMoveUp, onMoveDown, isReordering }: AddonCardProps) {
  const enableAddon = useEnableAddon();
  const disableAddon = useDisableAddon();
  const [configOpen, setConfigOpen] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const isGloballyDisabled = !addon.enabled;
  const isMutating = enableAddon.isPending || disableAddon.isPending || isReordering;

  const handleToggle = async () => {
    setToggleError(null);
    try {
      if (addon.userEnabled) {
        await disableAddon.mutateAsync(addon.id);
      } else {
        await enableAddon.mutateAsync(addon.id);
      }
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.problem?.title ?? err.message
          : 'Failed to update addon. Please try again.';
      setToggleError(message);
    }
  };

  const toggleId = `addon-toggle-${addon.id}`;
  const isSelected = configOpen;

  return (
    <div
      className={`${styles.addonCard}${isSelected ? ` ${styles.selected}` : ''}${isGloballyDisabled ? ` ${styles.globallyDisabled}` : ''}`}
      data-testid={`addon-card-${addon.id}`}
    >
      <div className={styles.addonMain}>
        {/* Logo */}
        {addon.logoUrl ? (
          <img src={addon.logoUrl} alt={`${addon.name} logo`} className={styles.addonLogo} />
        ) : (
          <div className={styles.addonLogoFallback} aria-hidden="true">
            {getAddonInitials(addon.name)}
          </div>
        )}

        {/* Info */}
        <div className={styles.addonInfo}>
          <div className={styles.addonNameRow}>
            <span className={styles.addonName}>{addon.name}</span>
            <span className={styles.addonVersion}>v{addon.version}</span>
            {isGloballyDisabled && (
              <span className={styles.globallyDisabledBadge} title="This addon is currently disabled by the server">
                Unavailable
              </span>
            )}
          </div>

          {addon.description && (
            <p className={styles.addonDescription}>{addon.description}</p>
          )}

          <CapabilityChips capabilities={addon.capabilities} />

          {toggleError && (
            <p
              style={{ fontSize: 'var(--text-xs)', color: 'var(--danger, hsl(0,80%,55%))', marginTop: '0.5rem' }}
              role="alert"
              data-testid={`toggle-error-${addon.id}`}
            >
              {toggleError}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className={styles.addonActions}>
          {/* Priority controls */}
          <div className={styles.priorityControl}>
            <button
              type="button"
              className={styles.priorityBtn}
              onClick={() => onMoveUp(addon)}
              disabled={isFirst || isReordering}
              aria-label={`Move ${addon.name} up in priority`}
              data-testid={`priority-up-${addon.id}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            <span className={styles.priorityLabel} title="Priority order">
              {addon.priorityOrder}
            </span>
            <button
              type="button"
              className={styles.priorityBtn}
              onClick={() => onMoveDown(addon)}
              disabled={isLast || isReordering}
              aria-label={`Move ${addon.name} down in priority`}
              data-testid={`priority-down-${addon.id}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {/* Enable/Disable toggle */}
          <div className={styles.toggleWrapper}>
            <span className={styles.toggleLabel}>
              {addon.userEnabled ? 'On' : 'Off'}
            </span>
            <label className={styles.toggle} title={isGloballyDisabled ? 'This addon is unavailable' : (addon.userEnabled ? 'Disable addon' : 'Enable addon')}>
              <input
                type="checkbox"
                id={toggleId}
                checked={addon.userEnabled}
                disabled={isMutating || isGloballyDisabled}
                onChange={handleToggle}
                aria-label={`${addon.userEnabled ? 'Disable' : 'Enable'} ${addon.name}`}
                data-testid={`addon-toggle-${addon.id}`}
              />
              <span className={styles.toggleSlider} />
            </label>
          </div>
        </div>
      </div>

      {/* Card footer */}
      <div className={styles.addonFooter}>
        <span className={styles.addonStars}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {addon.stars.toLocaleString()}
        </span>

        {addon.configurable ? (
          <button
            type="button"
            className={`${styles.configureBtn}${configOpen ? ` ${styles.active}` : ''}`}
            onClick={() => setConfigOpen((prev) => !prev)}
            aria-expanded={configOpen}
            aria-label={`${configOpen ? 'Close' : 'Open'} configuration for ${addon.name}`}
            data-testid={`configure-btn-${addon.id}`}
          >
            {configOpen ? 'Close' : 'Configure'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {configOpen
                ? <polyline points="18 15 12 9 6 15" />
                : <polyline points="6 9 12 15 18 9" />
              }
            </svg>
          </button>
        ) : (
          <span className={styles.noConfigLabel}>No configuration</span>
        )}
      </div>

      {/* Configuration panel — shown inline below card footer */}
      {configOpen && addon.configurable && (
        <ConfigurationPanel
          addon={addon}
          onClose={() => setConfigOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Custom Addons Section (Phase 4) ─────────────────────────────────────────

function CustomAddonCard({
  addon,
  onRemove,
  onToggle,
}: {
  addon: CustomAddonRecord;
  onRemove: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}) {
  const hasStream = addonHasStreamCapability(addon.manifest);
  const statusBadge = addon.lastTestStatus === 'cors_blocked'
    ? <span style={{ color: '#e59914', fontSize: '0.75rem', marginLeft: 8 }}>⚠ CORS may block streams</span>
    : addon.lastTestStatus === 'timeout'
    ? <span style={{ color: '#e57014', fontSize: '0.75rem', marginLeft: 8 }}>⚠ Timed out last attempt</span>
    : addon.lastTestStatus === 'ok'
    ? <span style={{ color: '#22c55e', fontSize: '0.75rem', marginLeft: 8 }}>✓ Stream OK</span>
    : null;

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}
      data-testid={`custom-addon-card-${addon.id}`}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{addon.manifest.name}</span>
          <span style={{ color: '#999', fontSize: '0.8rem' }}>v{addon.manifest.version}</span>
          {!hasStream && (
            <span style={{ color: '#e59914', fontSize: '0.75rem' }}>⚠ No stream capability</span>
          )}
          {statusBadge}
        </div>
        <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {addon.manifestUrl}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => onToggle(addon.id, !addon.enabled)}
          style={{
            padding: '0.35rem 0.8rem',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.15)',
            background: addon.enabled ? 'rgba(229,9,20,0.15)' : 'rgba(255,255,255,0.06)',
            color: addon.enabled ? '#e50914' : '#aaa',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 500,
          }}
        >
          {addon.enabled ? 'Disable' : 'Enable'}
        </button>
        <button
          type="button"
          onClick={() => onRemove(addon.id)}
          aria-label={`Remove ${addon.manifest.name}`}
          style={{
            padding: '0.35rem 0.8rem',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent',
            color: '#888',
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function CustomAddonsSection() {
  const [addons, setAddons] = useState<CustomAddonRecord[]>([]);
  const [manifestUrl, setManifestUrl] = useState('');
  const [installStatus, setInstallStatus] = useState<CustomAddonInstallStatus>({ status: 'idle' });

  // Load from localStorage on mount (SSR safe)
  useEffect(() => {
    setAddons(CustomAddonStore.getAll());
  }, []);

  const refresh = () => setAddons(CustomAddonStore.getAll());

  const handleInstall = async () => {
    const url = manifestUrl.trim();
    if (!url) return;

    setInstallStatus({ status: 'loading' });
    const result = await validateManifestUrl(url);

    if (result.status !== 'success') {
      setInstallStatus(result);
      return;
    }


    const id = stableAddonId(url);
    const existing = CustomAddonStore.getAll();
    const defaultPriority = existing.length > 0
      ? Math.max(...existing.map((a) => a.priorityOrder)) + 10
      : 100;

    const record: CustomAddonRecord = {
      id,
      name: result.manifest.name,
      manifestUrl: url,
      manifest: result.manifest,
      enabled: true,
      priorityOrder: defaultPriority,
      installedAt: Date.now(),
      lastTestStatus: 'untested',
    };

    CustomAddonStore.add(record);
    setInstallStatus({ status: 'idle' });
    setManifestUrl('');
    refresh();
  };

  const handleRemove = (id: string) => {
    CustomAddonStore.remove(id);
    refresh();
  };

  const handleToggle = (id: string, enabled: boolean) => {
    CustomAddonStore.setEnabled(id, enabled);
    refresh();
  };

  return (
    <section
      data-testid="custom-addons-section"
      style={{ marginTop: '2.5rem' }}
    >
      <div style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
          Custom Addons
          <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#888', marginLeft: 8 }}>
            Browser-Local
          </span>
        </h2>
        <p style={{ color: '#888', fontSize: '0.83rem', margin: 0 }}>
          Install any compatible Stremio addon by manifest URL. These addons run
          entirely in your browser and are{' '}
          <strong style={{ color: '#e59914' }}>not managed by the Cinely server</strong>.
        </p>
        <p
          style={{
            color: '#e59914',
            fontSize: '0.8rem',
            marginTop: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: 'rgba(229,153,20,0.08)',
            borderRadius: 6,
            border: '1px solid rgba(229,153,20,0.2)',
          }}
          data-testid="custom-addon-storage-disclaimer"
        >
          ⚠ Custom addon configuration is stored unencrypted in your browser&apos;s local storage.
          Do not enter sensitive credentials (API keys, debrid tokens) without understanding this risk.
        </p>
      </div>

      {addons.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.25rem' }}>
          {addons.map((addon) => (
            <CustomAddonCard
              key={addon.id}
              addon={addon}
              onRemove={handleRemove}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          padding: '1rem 1.25rem',
        }}
        data-testid="custom-addon-install-form"
      >
        <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0 0 0.75rem', color: '#ccc' }}>
          + Add Custom Addon
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="url"
            value={manifestUrl}
            onChange={(e) => {
              setManifestUrl(e.target.value);
              setInstallStatus({ status: 'idle' });
            }}
            placeholder="https://addon.example.com/manifest.json"
            data-testid="custom-addon-url-input"
            style={{
              flex: 1,
              minWidth: 200,
              padding: '0.5rem 0.75rem',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(0,0,0,0.3)',
              color: '#fff',
              fontSize: '0.875rem',
            }}
            disabled={installStatus.status === 'loading'}
            onKeyDown={(e) => { if (e.key === 'Enter') handleInstall(); }}
          />
          <button
            type="button"
            onClick={handleInstall}
            disabled={!manifestUrl.trim() || installStatus.status === 'loading'}
            data-testid="custom-addon-install-button"
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 6,
              border: 'none',
              background: !manifestUrl.trim() || installStatus.status === 'loading' ? '#555' : '#e50914',
              color: '#fff',
              cursor: !manifestUrl.trim() || installStatus.status === 'loading' ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
            }}
          >
            {installStatus.status === 'loading' ? 'Checking...' : 'Install'}
          </button>
        </div>

        {installStatus.status === 'error' && (
          <p
            data-testid="custom-addon-install-error"
            style={{ color: '#f87171', fontSize: '0.82rem', marginTop: '0.5rem' }}
          >
            ✕ {installStatus.message}
            {installStatus.isCorsLikely && (
              <span style={{ color: '#fbbf24' }}>
                {' '}You can still try installing — streams may be blocked during playback.
              </span>
            )}
          </p>
        )}

        {installStatus.status === 'success' && (
          <p style={{ color: '#22c55e', fontSize: '0.82rem', marginTop: '0.5rem' }}>
            ✓ Manifest valid — {installStatus.manifest.name} v{installStatus.manifest.version}
          </p>
        )}
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AddonsPage() {

  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data, isLoading, isError, error } = useUserAddons();
  const updateAddon = useUpdateAddon();
  const [isReordering, setIsReordering] = useState(false);

  const items: UserAddonItem[] = data?.items ?? [];

  /**
   * Priority swap: backend does not do atomic multi-addon reordering.
   * We compute the swap in the frontend and fire two sequential PUT calls.
   *
   * Given current sorted order:
   *   [A(p=1), B(p=2), C(p=3)]
   * Moving B up swaps B ↔ A:
   *   PUT A { priorityOrder: 2 }
   *   PUT B { priorityOrder: 1 }
   * Both calls invalidate ["addons", "user"] on success.
   */
  const handleMove = useCallback(
    async (addon: UserAddonItem, direction: 'up' | 'down') => {
      const sorted = [...items].sort((a, b) => a.priorityOrder - b.priorityOrder);
      const idx = sorted.findIndex((a) => a.id === addon.id);
      if (idx === -1) return;

      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;

      const target = sorted[swapIdx];
      const myPriority = addon.priorityOrder;
      const theirPriority = target.priorityOrder;

      setIsReordering(true);
      try {
        // Fire both in parallel — each invalidates on success
        await Promise.all([
          updateAddon.mutateAsync({ addonId: addon.id, payload: { priorityOrder: theirPriority } }),
          updateAddon.mutateAsync({ addonId: target.id, payload: { priorityOrder: myPriority } }),
        ]);
      } finally {
        setIsReordering(false);
      }
    },
    [items, updateAddon]
  );

  // Auth gate: redirect unauthenticated users to login
  if (!isAuthLoading && !isAuthenticated) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.centeredState}>
          <div style={{ fontSize: '2.5rem' }}>🔌</div>
          <h1 className={styles.stateTitle}>Addon Settings</h1>
          <p className={styles.stateBody}>
            Sign in to configure your Cinely addons, set stream priorities, and personalise your experience.
          </p>
          <Link href="/login?returnUrl=/settings/addons" className={styles.ctaBtn}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Loading skeleton
  if (isAuthLoading || isLoading) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.pageHeader}>
          <div className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span>Addon Settings</span>
          </div>
          <h1 className={styles.pageTitle}>Addon Settings</h1>
          <p className={styles.pageSubtitle}>Configure the stream providers available to your account.</p>
        </div>
        <div className={styles.contentArea} aria-label="Loading addons" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} aria-hidden="true" />
          ))}
        </div>
      </div>
    );
  }

  // Error
  if (isError) {
    const message = error instanceof ApiClientError
      ? error.problem?.title ?? error.message
      : 'Unable to load addon settings. Please check your connection to the Cinely engine.';

    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.centeredState}>
          <h1 className={styles.stateTitle}>Unable to load addons</h1>
          <p className={styles.stateBody}>{message}</p>
          <button type="button" className={styles.ctaBtn} onClick={() => router.refresh()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Sort by priorityOrder for display
  const sorted = [...items].sort((a, b) => a.priorityOrder - b.priorityOrder);

  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.pageHeader}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span aria-current="page">Addon Settings</span>
        </nav>
        <h1 className={styles.pageTitle}>Addon Settings</h1>
        <p className={styles.pageSubtitle}>
          Configure the stream providers and services available to your Cinely account.
        </p>
      </div>

      <main className={styles.contentArea} data-testid="addons-page">
        {sorted.length === 0 ? (
          <div className={styles.centeredState}>
            <div style={{ fontSize: '2.5rem' }}>📭</div>
            <p className={styles.stateTitle}>No addons available</p>
            <p className={styles.stateBody}>
              The Cinely engine has no approved addons in its catalog. Contact your administrator.
            </p>
          </div>
        ) : (
          sorted.map((addon, idx) => (
            <AddonCard
              key={addon.id}
              addon={addon}
              isFirst={idx === 0}
              isLast={idx === sorted.length - 1}
              onMoveUp={(a) => handleMove(a, 'up')}
              onMoveDown={(a) => handleMove(a, 'down')}
              isReordering={isReordering}
            />
          ))
        )}
        <CustomAddonsSection />
      </main>

    </div>
  );
}
