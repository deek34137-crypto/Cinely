'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useAuth } from './useAuth';
import { UpdateUserAddonPayload } from '../lib/types';

export const CATALOG_QUERY_KEY = ['addons', 'catalog'] as const;
export const USER_ADDONS_QUERY_KEY = ['addons', 'user'] as const;

/**
 * Fetches the server-approved addon catalog.
 * Public endpoint — always enabled, no authentication required.
 */
export function useCatalog() {
  return useQuery({
    queryKey: CATALOG_QUERY_KEY,
    queryFn: () => apiClient.getCatalog(),
    staleTime: 1000 * 60 * 5, // 5 minutes — catalog changes infrequently
  });
}

/**
 * Fetches the authenticated user's addons (catalog joined with personal preferences).
 * Only enabled once authentication bootstrap is resolved and user is authenticated.
 * Do NOT fire this while auth is still loading — avoids 401 on initial hydration.
 */
export function useUserAddons() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  return useQuery({
    queryKey: USER_ADDONS_QUERY_KEY,
    queryFn: () => apiClient.getUserAddons(),
    enabled: isAuthenticated && !isAuthLoading,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Enables an approved addon for the authenticated user.
 * Globally-disabled addons (addon.enabled === false) will be rejected by the engine (400).
 * On success: invalidates ["addons", "user"] and refetches.
 */
export function useEnableAddon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addonId: string) => apiClient.enableAddon(addonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ADDONS_QUERY_KEY });
    },
  });
}

/**
 * Disables an addon for the authenticated user.
 * On success: invalidates ["addons", "user"] and refetches.
 */
export function useDisableAddon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addonId: string) => apiClient.disableAddon(addonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ADDONS_QUERY_KEY });
    },
  });
}

/**
 * Updates an addon's priorityOrder and/or configuration.
 * Backend contract: priorityOrder >= 0, configuration only for configurable addons.
 * Priority swapping requires two sequential calls — the frontend must compute the
 * swap and call this mutation for each addon being reordered.
 * On success: invalidates ["addons", "user"] and refetches.
 */
export function useUpdateAddon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      addonId,
      payload,
    }: {
      addonId: string;
      payload: UpdateUserAddonPayload;
    }) => apiClient.updateAddon(addonId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ADDONS_QUERY_KEY });
    },
  });
}

/**
 * Removes the user's preference row for an addon (sets it to disabled).
 * Backend contract: DELETE /v1/users/me/addons/:id → { addonId, enabled: false }
 * This does NOT restore the addon to a "default" state — the preference row is removed.
 * On success: invalidates ["addons", "user"] and refetches.
 */
export function useRemoveAddonPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addonId: string) => apiClient.removeAddonPreference(addonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ADDONS_QUERY_KEY });
    },
  });
}
