import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddonsPage from '../page';
import { apiClient } from '../../../../lib/api-client';
import { AuthProvider } from '../../../../context/AuthContext';
import { UserAddonsResponse } from '../../../../lib/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/settings/addons',
  useSearchParams: () => new URLSearchParams(),
}));

const mockUserAddons: UserAddonsResponse = {
  items: [
    {
      id: 'torrentio',
      name: 'Torrentio',
      version: '1.0.14',
      description: 'Torrent stream provider.',
      manifestUrl: 'https://torrentio.strem.fun/manifest.json',
      logoUrl: null,
      backgroundUrl: null,
      types: ['movie', 'series'],
      categories: ['torrents'],
      stars: 995,
      enabled: true,
      configurable: true,
      capabilities: { catalog: false, meta: false, stream: true, subtitles: false },
      userEnabled: true,
      priorityOrder: 1,
      userConfiguration: { quality: '1080p' },
    },
    {
      id: 'opensubtitles-v3',
      name: 'OpenSubtitles v3',
      version: '3.0.0',
      description: 'Subtitle provider.',
      manifestUrl: 'https://opensubtitles-v3.strem.io/manifest.json',
      logoUrl: null,
      backgroundUrl: null,
      types: ['movie', 'series'],
      categories: ['subtitles'],
      stars: 920,
      enabled: true,
      configurable: false,
      capabilities: { catalog: false, meta: false, stream: false, subtitles: true },
      userEnabled: true,
      priorityOrder: 2,
    },
    {
      id: 'disabled-test-addon',
      name: 'Disabled Addon',
      version: '1.0.0',
      manifestUrl: 'https://disabled.example/manifest.json',
      types: ['movie'],
      categories: ['torrents'],
      stars: 10,
      enabled: false, // globally disabled by server
      configurable: false,
      capabilities: { catalog: false, meta: false, stream: true, subtitles: false },
      userEnabled: false,
      priorityOrder: 100,
    },
  ],
  total: 3,
};

function renderAddonsPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <AddonsPage />
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('AddonsPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows sign-in prompt for unauthenticated users', async () => {
    vi.spyOn(apiClient, 'getMe').mockRejectedValueOnce(new Error('Unauthorized'));

    renderAddonsPage();

    await waitFor(() => {
      expect(screen.getByText('Addon Settings')).toBeInTheDocument();
    });

    const signInLinks = screen.getAllByRole('link', { name: 'Sign In' });
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
    const ctaLink = signInLinks.find((l) => l.getAttribute('href')?.includes('returnUrl'));
    expect(ctaLink).toHaveAttribute('href', '/login?returnUrl=/settings/addons');
    expect(screen.queryByTestId('addons-page')).not.toBeInTheDocument();
  });

  it('renders addon cards for authenticated user', async () => {
    vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({
      id: 'usr_1', email: 'alice@test.io', displayName: 'Alice', role: 'user', createdAt: '2026-08-17T00:00:00Z',
    });
    vi.spyOn(apiClient, 'getUserAddons').mockResolvedValueOnce(mockUserAddons);

    renderAddonsPage();

    await waitFor(() => {
      expect(screen.getByTestId('addons-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('addon-card-torrentio')).toBeInTheDocument();
    expect(screen.getByTestId('addon-card-opensubtitles-v3')).toBeInTheDocument();
    expect(screen.getByTestId('addon-card-disabled-test-addon')).toBeInTheDocument();
  });

  it('shows Configure button only for configurable addons', async () => {
    vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({
      id: 'usr_1', email: 'alice@test.io', displayName: 'Alice', role: 'user', createdAt: '2026-08-17T00:00:00Z',
    });
    vi.spyOn(apiClient, 'getUserAddons').mockResolvedValueOnce(mockUserAddons);

    renderAddonsPage();

    await waitFor(() => {
      expect(screen.getByTestId('addons-page')).toBeInTheDocument();
    });

    // configurable=true → Configure button
    expect(screen.getByTestId('configure-btn-torrentio')).toBeInTheDocument();

    // configurable=false → no Configure button
    expect(screen.queryByTestId('configure-btn-opensubtitles-v3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('configure-btn-disabled-test-addon')).not.toBeInTheDocument();

    // "No configuration" label present for non-configurable
    const subtitlesCard = screen.getByTestId('addon-card-opensubtitles-v3');
    expect(within(subtitlesCard).getByText('No configuration')).toBeInTheDocument();
  });

  it('globally disabled addon has toggle disabled and shows Unavailable badge', async () => {
    vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({
      id: 'usr_1', email: 'alice@test.io', displayName: 'Alice', role: 'user', createdAt: '2026-08-17T00:00:00Z',
    });
    vi.spyOn(apiClient, 'getUserAddons').mockResolvedValueOnce(mockUserAddons);

    renderAddonsPage();

    await waitFor(() => {
      expect(screen.getByTestId('addons-page')).toBeInTheDocument();
    });

    const toggle = screen.getByTestId('addon-toggle-disabled-test-addon');
    expect(toggle).toBeDisabled();

    const card = screen.getByTestId('addon-card-disabled-test-addon');
    expect(within(card).getByText('Unavailable')).toBeInTheDocument();
  });

  it('clicking Configure opens config panel with existing JSON', async () => {
    vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({
      id: 'usr_1', email: 'alice@test.io', displayName: 'Alice', role: 'user', createdAt: '2026-08-17T00:00:00Z',
    });
    vi.spyOn(apiClient, 'getUserAddons').mockResolvedValueOnce(mockUserAddons);

    renderAddonsPage();

    await waitFor(() => {
      expect(screen.getByTestId('configure-btn-torrentio')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('configure-btn-torrentio'));

    await waitFor(() => {
      expect(screen.getByTestId('config-panel-torrentio')).toBeInTheDocument();
    });

    const textarea = screen.getByTestId('config-textarea-torrentio') as HTMLTextAreaElement;
    expect(textarea.value).toContain('1080p');
  });

  it('malformed JSON prevents save and shows error message', async () => {
    vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({
      id: 'usr_1', email: 'alice@test.io', displayName: 'Alice', role: 'user', createdAt: '2026-08-17T00:00:00Z',
    });
    vi.spyOn(apiClient, 'getUserAddons').mockResolvedValueOnce(mockUserAddons);
    const updateSpy = vi.spyOn(apiClient, 'updateAddon');

    renderAddonsPage();

    await waitFor(() => {
      expect(screen.getByTestId('configure-btn-torrentio')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('configure-btn-torrentio'));
    await waitFor(() => expect(screen.getByTestId('config-panel-torrentio')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('config-textarea-torrentio'), {
      target: { value: '{ invalid json }' },
    });

    fireEvent.click(screen.getByTestId('config-save-torrentio'));

    await waitFor(() => {
      expect(screen.getByTestId('config-json-error')).toBeInTheDocument();
    });

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('failed save preserves unsaved JSON in textarea (RFC 7807 error)', async () => {
    vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({
      id: 'usr_1', email: 'alice@test.io', displayName: 'Alice', role: 'user', createdAt: '2026-08-17T00:00:00Z',
    });
    vi.spyOn(apiClient, 'getUserAddons').mockResolvedValue(mockUserAddons);

    const { ApiError } = await import('../../../../lib/api-client');
    vi.spyOn(apiClient, 'updateAddon').mockRejectedValueOnce(
      new ApiError(400, 'Addon does not support custom configuration.', {
        type: 'about:blank',
        status: 400,
        code: 'VALIDATION_FAILED',
        title: 'Addon does not support custom configuration.',
        detail: '',
        instance: '',
        timestamp: new Date().toISOString(),
      })
    );

    renderAddonsPage();

    await waitFor(() => {
      expect(screen.getByTestId('configure-btn-torrentio')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('configure-btn-torrentio'));
    await waitFor(() => expect(screen.getByTestId('config-panel-torrentio')).toBeInTheDocument());

    const newConfig = '{"quality":"4k","providers":["yts"]}';
    fireEvent.change(screen.getByTestId('config-textarea-torrentio'), {
      target: { value: newConfig },
    });

    fireEvent.click(screen.getByTestId('config-save-torrentio'));

    await waitFor(() => {
      expect(screen.getByTestId('config-api-error')).toBeInTheDocument();
    });

    // Textarea still shows unsaved JSON — user's work is preserved
    const textarea = screen.getByTestId('config-textarea-torrentio') as HTMLTextAreaElement;
    expect(textarea.value).toBe(newConfig);
  });

  it('enable toggle calls enableAddon mutation', async () => {
    vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({
      id: 'usr_1', email: 'alice@test.io', displayName: 'Alice', role: 'user', createdAt: '2026-08-17T00:00:00Z',
    });
    const disabledAddonData: UserAddonsResponse = {
      ...mockUserAddons,
      items: mockUserAddons.items.map((item) =>
        item.id === 'torrentio' ? { ...item, userEnabled: false } : item
      ),
    };
    vi.spyOn(apiClient, 'getUserAddons').mockResolvedValue(disabledAddonData);
    const enableSpy = vi.spyOn(apiClient, 'enableAddon').mockResolvedValueOnce({
      addonId: 'torrentio',
      enabled: true,
    });

    renderAddonsPage();

    await waitFor(() => {
      expect(screen.getByTestId('addon-toggle-torrentio')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('addon-toggle-torrentio'));

    await waitFor(() => {
      expect(enableSpy).toHaveBeenCalledWith('torrentio');
    });
  });

  it('priority up button calls two updateAddon mutations to swap priorities', async () => {
    vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({
      id: 'usr_1', email: 'alice@test.io', displayName: 'Alice', role: 'user', createdAt: '2026-08-17T00:00:00Z',
    });
    vi.spyOn(apiClient, 'getUserAddons').mockResolvedValue(mockUserAddons);
    const updateSpy = vi.spyOn(apiClient, 'updateAddon').mockResolvedValue({
      addonId: '',
      enabled: true,
      priorityOrder: 1,
    });

    renderAddonsPage();

    await waitFor(() => {
      expect(screen.getByTestId('addons-page')).toBeInTheDocument();
    });

    // opensubtitles-v3 is at priority 2; pressing up should swap it with torrentio (priority 1)
    fireEvent.click(screen.getByTestId('priority-up-opensubtitles-v3'));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(2);
    });

    // Verify the two swap calls
    const calls = updateSpy.mock.calls;
    const addonIds = calls.map(([id]) => id);
    expect(addonIds).toContain('opensubtitles-v3');
    expect(addonIds).toContain('torrentio');
  });

  describe('Custom Addons Section (Phase 4E)', () => {
    it('renders the custom addons section with unencrypted storage disclaimer', async () => {
      vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({
        id: 'usr_1', email: 'alice@test.io', displayName: 'Alice', role: 'user', createdAt: '2026-08-17T00:00:00Z',
      });
      vi.spyOn(apiClient, 'getUserAddons').mockResolvedValue(mockUserAddons);

      renderAddonsPage();

      await waitFor(() => {
        expect(screen.getByTestId('custom-addons-section')).toBeInTheDocument();
      });

      expect(screen.getByTestId('custom-addon-storage-disclaimer')).toBeInTheDocument();
      expect(screen.getByTestId('custom-addon-install-form')).toBeInTheDocument();
    });

    it('shows error message when manifest URL validation fails', async () => {
      vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({
        id: 'usr_1', email: 'alice@test.io', displayName: 'Alice', role: 'user', createdAt: '2026-08-17T00:00:00Z',
      });
      vi.spyOn(apiClient, 'getUserAddons').mockResolvedValue(mockUserAddons);

      renderAddonsPage();

      await waitFor(() => {
        expect(screen.getByTestId('custom-addon-url-input')).toBeInTheDocument();
      });

      const input = screen.getByTestId('custom-addon-url-input');
      fireEvent.change(input, { target: { value: 'not-a-valid-url' } });

      const installBtn = screen.getByTestId('custom-addon-install-button');
      fireEvent.click(installBtn);

      await waitFor(() => {
        expect(screen.getByTestId('custom-addon-install-error')).toBeInTheDocument();
      });
    });
  });
});

