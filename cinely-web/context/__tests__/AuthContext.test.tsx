import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthContext';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

function Consumer() {
  const { user, isAuthenticated, isLoading, login, register, logout } = useAuth();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="auth">{isAuthenticated ? 'authenticated' : 'guest'}</div>
      <div data-testid="user-email">{user?.email || 'none'}</div>
      <button onClick={() => login({ email: 'test@cinely.io', password: 'Password123' })}>
        Trigger Login
      </button>
      <button onClick={() => register({ email: 'new@cinely.io', password: 'Password123', displayName: 'New User' })}>
        Trigger Register
      </button>
      <button onClick={() => logout()}>Trigger Logout</button>
    </div>
  );
}

describe('AuthContext & useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes as unauthenticated when getMe rejects (401)', async () => {
    vi.mocked(apiClient.getMe).mockRejectedValueOnce(new Error('Unauthorized'));

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('loading');

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('auth')).toHaveTextContent('guest');
    expect(screen.getByTestId('user-email')).toHaveTextContent('none');
  });

  it('initializes as authenticated when getMe resolves profile', async () => {
    vi.mocked(apiClient.getMe).mockResolvedValueOnce({
      id: 'cinely:user:123',
      email: 'neo@matrix.io',
      displayName: 'Neo',
      role: 'user',
      createdAt: '2026-01-01',
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('auth')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('neo@matrix.io');
  });

  it('updates state on successful login', async () => {
    vi.mocked(apiClient.getMe).mockRejectedValueOnce(new Error('Unauthorized'));
    vi.mocked(apiClient.login).mockResolvedValueOnce({
      user: {
        id: 'cinely:user:999',
        email: 'test@cinely.io',
        displayName: 'Test User',
        role: 'user',
        createdAt: '2026-01-01',
      },
      tokens: {
        accessToken: 'mock_jwt',
        refreshToken: 'mock_rt',
        expiresIn: 900,
        tokenType: 'Bearer',
      },
    });

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('ready'));

    await user.click(screen.getByText('Trigger Login'));

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@cinely.io');
    });
  });

  it('updates state on successful register and clears state on logout', async () => {
    vi.mocked(apiClient.getMe).mockRejectedValueOnce(new Error('Unauthorized'));
    vi.mocked(apiClient.register).mockResolvedValueOnce({
      user: {
        id: 'cinely:user:new',
        email: 'new@cinely.io',
        displayName: 'New User',
        role: 'user',
        createdAt: '2026-01-01',
      },
      tokens: {
        accessToken: 'mock_jwt',
        refreshToken: 'mock_rt',
        expiresIn: 900,
        tokenType: 'Bearer',
      },
    });
    vi.mocked(apiClient.logout).mockResolvedValueOnce({ message: 'Logged out successfully' });

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('ready'));

    await user.click(screen.getByText('Trigger Register'));

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('user-email')).toHaveTextContent('new@cinely.io');
    });

    await user.click(screen.getByText('Trigger Logout'));

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('guest');
      expect(screen.getByTestId('user-email')).toHaveTextContent('none');
    });
  });
});
